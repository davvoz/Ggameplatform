# Relazione tecnica — Ggameplatform

> Analisi di un senior software architect basata sulla **lettura diretta del codice** (non sulla descrizione fornita). Dove la realtà del codice diverge dalla descrizione, è segnalato esplicitamente.
>
> Data analisi: 2026-06-04 · Branch: `master`

---

## Sintesi esecutiva

Il progetto è **funzionalmente ricchissimo e architetturalmente sopra la media** per un progetto vanilla: i pattern dichiarati (Strategy, Facade, Factory) sono *realmente* implementati e in modo pulito, soprattutto in `backend/app/xp_calculator/` e `backend/app/quest_tracker/`. La modularizzazione dei router e dei backend per-gioco è coerente.

Ma c'è **un problema che sovrasta tutti gli altri e che invalida l'intera economy**: il backend **non ha autenticazione sulle API di gioco**. Non esiste `SessionMiddleware`, l'identità dell'utente viaggia come `user_id` nel *body/query* di richieste pubbliche, e lo `score` che genera XP/coin/leaderboard è **interamente fornito dal client** senza alcuna validazione server-side. L'"anti-cheat" è un rilevatore di DevTools + offuscamento JS (`frontend/js/runtimeShell.js:1146`). In pratica: `curl` su `/users/sessions/end` con uno score arbitrario = XP/coin/rank illimitati per qualunque utente.

Questo è il filo rosso della relazione. Tutto il resto è secondario rispetto a questo.

---

## 1. Architettura generale

**Scelte di fondo**

- **Monolite modulare**: corretto per questa scala. I "backend per-gioco" (`rainbow_rush_be`, `prediction_market_be`, ecc.) **non sono microservizi**: sono `APIRouter` montati nello stesso processo in `backend/app/main.py:192-199`. Va benissimo, ma chiamarli "backend dedicati" è generoso — condividono engine, DB e ciclo di vita. Non c'è isolamento dei guasti: un loop bloccante nel WebSocket di prediction market o minion_clash impatta tutta la piattaforma.
- **Vanilla JS SPA senza bundler**: scelta difendibile per il *time-to-load* e zero toolchain, ma a questa scala (decine di moduli + componenti) inizia a costare: nessun tree-shaking, nessun type-check, import via `<script type=module>` con dipendenze implicite. Accettabile oggi, debito crescente.
- **SQLite in produzione con Docker**: errore architetturale per una piattaforma con scrittura concorrente (sessioni, leaderboard trigger, chat, scheduler) — vedi §6.

**Pattern — sono applicati correttamente?**

- **Strategy + Factory** in `backend/app/xp_calculator/factory.py` + `calculator.py`: **applicato bene**. `XPCalculator` ordina le regole per priorità, delega a strategie con `validate_parameters()`/`calculate()`, isola gli errori per-regola (`_apply_rule` ritorna `None` e continua). Pulito ed estensibile.
- **Facade** in `backend/app/quest_tracker/`: corretto. `GenericQuestHandler` usa un **dispatch dict** invece di if/elif (`generic_quest_handler.py:38-55`) — buona aderenza all'OCP.
- **Repository + Service** (`repositories.py`, `services.py`): presente (`RepositoryFactory`, `CoinService`).
- **Nota critica sul Facade XP**: il docstring di `calculator.py:1` dice "Facade Pattern" ma la classe è in realtà uno **Strategy orchestrator**. Il `_default_calculation` è un `@staticmethod` mai chiamato da `calculate_total_xp` — codice morto / fallback orfano.

**Coupling**

- Punto debole: `backend/app/database.py` è un **god-module** da centinaia di righe che mescola engine, migrazioni ad-hoc, hashing password, business logic delle sessioni (`end_game_session`), level-up, quest tracking. Alta coesione interna ma fortissimo accoppiamento verso tutto il resto. `end_game_session` (`database.py:679`) fa da solo: XP, campagne, high-score, level-up, leaderboard (via trigger), quest. È il vero cuore della piattaforma e dovrebbe essere un servizio dedicato testabile, non una funzione in `database.py`.
- Import locali ovunque (`from app.models import ...` dentro le funzioni) per spezzare import circolari: sintomo di un grafo di dipendenze non sano.

---

## 2. Sistema Economy (XP, Coin, Level)

**Formula XP** — `backend/app/level_system.py:51-92`

- Diretta: `XP(level) = 100 · level^1.5`; inversa: `level = ⌊(XP/100)^(2/3)⌋`. **Matematicamente coerenti** (sono davvero l'una l'inversa dell'altra). Curva moderata: L10≈3.162 XP, L50≈35.355 XP, L100≈100.000 XP. Bilanciamento ragionevole *in astratto*.
- **Ma il bilanciamento è irrilevante finché lo score è client-trusted** (§7): l'XP per partita è `score · 0.01 · multiplier` (default `calculator.py:100-105`) e lo score lo decide il giocatore.
- **Doppio canale XP/score**: in `database.py:712` l'XP si calcola su `xp_score = extra_data.get('xp_score', score)` mentre la leaderboard usa `score`. Un client può inviare `score` basso (per non insospettire) e `xp_score` enorme. **Vettore di exploit esplicito.**

**LevelMilestone — i gap 1→5→10→…→100**

- Sono un *design choice* voluto (milestone celebrative), ma c'è **doppia fonte di verità**: le costanti hardcoded `LEVEL_MILESTONES`/`LEVEL_COIN_REWARDS` (`level_system.py:19-49`) sono dichiarate "fallback" mentre l'autorità è il DB. Però `LEVEL_COIN_REWARDS` include il livello **60** che **manca nei titoli** `LEVEL_MILESTONES`. Inconsistenza che indica drift tra codice e DB.

**CoinRewardManager** — `backend/app/coin_rewards.py`

- `award_level_up` scala con `base + new_level*10` (`coin_rewards.py:192`): coerente.
- `check_and_award_daily_login`: il dedup "già preso oggi" confronta `last_login.date() == now.date()` su orari UTC (`coin_rewards.py:122-126`). Un utente può "fare login giornaliero" due volte a cavallo della mezzanotte UTC. Minore.

**Exploit / race condition (CRITICI)**

1. **Replay di `/sessions/end`**: `end_game_session` (`database.py:679`) **non controlla `game_session.ended_at`**. Chiamando l'endpoint N volte con lo stesso `session_id`, `user.total_xp_earned += xp_earned` viene eseguito N volte → XP/coin moltiplicati a piacere. Manca completamente l'idempotenza.
2. **Score arbitrario + `xp_score`** (sopra).
3. **`session_id` non legato all'utente che chiude**: chiunque conosca/indovini un `session_id` può chiuderlo. Nessun controllo di proprietà.
4. **Race su concorrenza**: `total_xp_earned += xp` è un read-modify-write Python, non un `UPDATE ... SET x = x + n` atomico. Con SQLite + `autoflush=False` e più richieste parallele si perde aggiornamento (lost update). Stesso pattern per i coin.

---

## 3. Sistema Quest

`backend/app/quest_tracker/` è una delle parti **meglio progettate**.

- **Scalabilità**: `HandlerRegistry` per handler game-specifici + `GenericQuestHandler` con dispatch dict. Aggiungere un quest_type = una entry nel dict + un metodo. Buono.
- **quest_type supportati dal GenericQuestHandler** (16): `play_games`, `play_games_weekly`, `play_time`, `play_time_daily`, `play_same_game`, `score_threshold_per_game`, `score_ends_with`, `score`, `reach_level`, `xp_daily`, `xp_weekly`, `leaderboard_top`, `complete_quests`, `play_distinct_games_daily`, `complete_half_daily_game_quests`, `complete_all_daily_quests` (`generic_quest_handler.py:38-55`).
- **Reset**: `QuestResetService` con `reset_if_needed/reset_daily_simple` su periodi daily/weekly, schedulato da `DailyQuestScheduler`. Ben separato.

**Problemi**

- **Anti-pattern grave** in `_count_daily_game_quests` (`generic_quest_handler.py:404-406`): filtra le quest con `Quest.config.like('%"reset_period": "daily"%')`. **Query su JSON serializzato via LIKE su stringa**: fragile (dipende dagli spazi esatti nel JSON), non indicizzabile, si rompe se cambia il serializer. Le meta-quest "completa metà/tutte le daily" si basano su questo.
- Le quest basate su `score`/`xp` ereditano l'exploit dello score client-trusted: completare quest a comando.
- `_handle_score` somma `extra_data.get(field)` senza cap né validazione di tipo: un float gigante nel payload completa qualunque quest.

---

## 4. Integrazione Blockchain Steem

**CUR8MultiplierSystem** — `backend/app/cur8_multiplier.py`

- Formula `1.0 + 0.5·witness + 0.1·(STEEM/1000)`, cap 4.0x. Per saturare servono **(4.0−1.0−0.5)/0.1·1000 = 25.000 STEEM** delegati. È un incentivo molto "whale-oriented": il votante witness medio resta a 1.5x, il cap è raggiungibile solo da grandi delegatori. Design coerente con un programma CUR8, ma poco granulare per utenti piccoli.

**SteemChecker** — `backend/app/steem_checker.py`

- **Bug logico/codice morto** in `check_witness_vote` (`:62-92`): chiama `get_witness_by_account` ma **ne ignora il risultato** e poi usa `get_account_data` per leggere `witness_votes`/`proxy`. Il commento ammette il problema della paginazione ma la chiamata è inutile (overhead di rete sprecato).
- **Ricorsione proxy senza guardia di profondità** (`:92`): `return check_witness_vote(proxy)`. Su Steem i proxy non dovrebbero ciclare, ma una catena lunga o dati anomali può causare ricorsione profonda / chiamate API a cascata. Serve un `max_depth`.
- **Carico API**: `get_steem_multiplier_data` fa 1 (witness) + 1 (account) + 1 (delegations, che a sua volta chiama `get_dynamic_global_properties`) = **almeno 3-4 POST sincroni** a `api.steemit.com`, timeout 10s ciascuno, **senza cache** (il commento `:286` dichiara che il throttling è stato rimosso, ma il docstring di `update_user_multiplier` mente ancora dicendo "10-minute cache").

**MultiplierScheduler** — ogni **10 minuti** (`multiplier_scheduler.py:73-74`)

- Itera gli utenti Steem facendo le 3-4 chiamate ciascuno, **bloccanti**, in un thread. Con N utenti Steem questo è un thundering herd verso un singolo nodo pubblico ogni 10 min. A poche centinaia di utenti il ciclo non finisce in 10 min e si accavalla.

**SteemRewardService (beem)** — fallback presente; il rischio reale è il **secret in chiaro**: `STEEM_ACTIVE_KEY`/`STEEM_POSTING_KEY` in `.env` (`backend/.env.example`). L'active key permette **trasferimenti**: se trapela, perdita di fondi diretta. Andrebbe in un secret manager, non in `.env` montato nel container.

**Centralizzazione**: dipendenza single-point su `https://api.steemit.com` hardcoded (`:8`). Nessun failover su nodi alternativi (es. `api.steemworld.org`). Se Steemit è giù → tutti i multiplier degradano/falliscono.

---

## 5. Giochi e SDK

**Protocollo postMessage**

- **Discrepanza con la descrizione**: la richiesta cita un `protocol.json v1.0.0` con messaggi `end`/`achievement`/`error`. Il codice reale (`frontend/js/runtimeShell.js:22-43`) usa `scoreUpdate`, `gameOver`, `levelCompleted`, `requestFullScreen`, `ready`, `saveProgress`/`loadProgress`, ecc. Non c'è `achievement`. Doc e implementazione sono **disallineate**.
- Validazione messaggi: `isValidMessage` controlla `type` string + `protocolVersion === '1.0.0'` (`:248-253`). Niente schema per-payload (lo score è un `number` qualsiasi).

**Validazione origin — la falla architetturale dei giochi**

- I giochi sono serviti **same-origin** (`/games/*` sullo stesso dominio della piattaforma, `main.py:277`) e gli **iframe non hanno l'attributo `sandbox`** (grep su `frontend/js/*.js`: zero occorrenze). Conseguenza: un gioco compromesso/malevolo gira **nello stesso origin del parent**, quindi:
  - può leggere `localStorage` del parent dove vive `currentUser` (l'identità usata come auth!),
  - può accedere a `window.parent.document`,
  - la CSP per `/games/*` è volutamente permissiva con `'unsafe-inline' 'unsafe-eval' https:` (`main.py:96-105`).
  - Una sola XSS in **uno qualsiasi** dei 20+ giochi → compromissione dell'intera piattaforma e furto identità di altri utenti. Questo è **ALTO/CRITICO**.
- Lato SDK (`sdk/platformsdk.js:137-146`) l'origin del parent è **Trust-On-First-Use** (`if (!this.parentOrigin && event.origin) this.parentOrigin = event.origin`). Debole, ma mitigato dal fatto che tutto è same-origin (che però è esattamente il problema sopra).

**Shared game engine** (`GameObject`, `StateMachine`, `Tween`, `Vector2`, `InputManager`, `Renderer`): qualità discreta, classi piccole e coese. Non c'è però un *unico* engine condiviso: ogni gioco ne ha una copia (es. `altitude/js/entities/GameObject.js`, `devil_crash_pinball/js/physics/Vec2.js`). Duplicazione strutturale tra giochi.

**BE dedicato vs frontend-only — quando ha senso**

- Il discriminante corretto è **autorità server**: i giochi con stato condiviso/competitivo/economico devono avere logica server-authoritative. `prediction_market_be` è l'esempio **fatto bene**: il prezzo arriva dal WebSocket Binance lato server, il settlement e i payout (cap 10x, time-decay `router.py:38-39`) sono calcolati dal server. Briscola/minion_clash multiplayer giustificano il BE. I single-player (altitude, sky-tower…) **non** hanno BE dedicato e dipendono dal flusso client-trusted di `/sessions/end` → ecco perché l'exploit dello score è universale.

**Devil Crash CommunityBoards (UGC)** — `backend/app/games/devil_crash_pinball_be/validator.py`

- Buono: la validazione server impone struttura, limiti anti-DoS (MAX_PAYLOAD 512KB, MAX_SECTIONS 12, key whitelist) e il `payload` è un modello Pydantic (`payload.model_dump()`), quindi **non** è JSON arbitrario opaco. Il commento è onesto: "exhaustive checks remain client-side".
- **Problema**: l'identità per create/update/delete/like è `user_id` **query param** (`router.py:117`). Posso passare `user_id=<vittima>` e **cancellare/modificare le board altrui** (l'ownership check confronta con un uid che fornisco io). Impersonazione totale — stesso difetto di tutta la piattaforma.
- Il render del payload sul client deve essere rigorosamente data-driven: se i dati di board finiscono in `innerHTML`, è stored-XSS servita a tutti i giocatori.

**Minion Clash WebSocket**: presente router WS (`main.py:199`). Da verificare a fondo: gestione disconnessioni/reconnect, autorità server sullo stato, e — di nuovo — come si autentica la connessione WS (probabilmente `user_id` nel query string, stesso problema).

---

## 6. Database

- **SQLite in produzione, nessun WAL** (`database.py:26`): `create_engine(..., connect_args={"check_same_thread": False})` e **nessun `PRAGMA journal_mode=WAL`** né `busy_timeout` (grep confermato: zero). In modalità rollback-journal **ogni write prende un lock esclusivo che blocca i reader**. Con leaderboard trigger post-commit, chat, scheduler concorrenti e `check_same_thread=False`, sotto carico arriveranno `database is locked`. Almeno WAL + `busy_timeout` sono d'obbligo *subito*; PostgreSQL è la destinazione.
- **`Text` + JSON serializzato** (`game_scores`, `extra_data`, `parameters`, `config`, `payload_json`): comodo ma impedisce query/index sui campi interni → da qui l'orrore del `config.like('%...%')` (§3). Trade-off accettabile per blob opachi, sbagliato per campi su cui si filtra.
- **Foreign key non enforced**: SQLite **non applica le FK senza `PRAGMA foreign_keys=ON` per connessione** — qui non viene mai impostato. Le FK dichiarate negli ORM sono decorative: si possono inserire `game_session` con `user_id` inesistente, orfani in `leaderboard`, ecc. Integrità referenziale affidata solo al codice applicativo.
- **Index**: presenti su `coin_transactions(user_id, created_at)` e `transaction_type`. Mancano probabilmente index compositi su `game_sessions(user_id, ended_at)` e `game_sessions(game_id, score)` — query pesanti del QuestHandler (`generic_quest_handler.py:112-126, 199-208`) fanno `count()`/`sum()` filtrando proprio su queste colonne ad ogni fine partita.
- **Migrazioni**: **non c'è uno strumento** (no Alembic). Le "migrazioni" sono funzioni manuali `_migrate_*` che fanno `PRAGMA table_info` + `ALTER TABLE ADD COLUMN` all'avvio (`database.py:51-95`). Funziona solo per add-column additivi, è fragile, non versionato, non reversibile. **Adottare Alembic** è prioritario prima di migrare a Postgres.
- **Backup**: presente `scripts/backup_database.py`. Per SQLite un `cp` a caldo senza WAL/`.backup` può copiare uno stato inconsistente.

---

## 7. Sicurezza (mappata su OWASP)

- **A01 Broken Access Control / A07 Auth failures (CRITICO, sistemico)**: **non esiste autenticazione sulle API utente**. `SessionMiddleware` non è registrato in `main.py` (confermato: gli unici `add_middleware` sono Security/NoCache/CORS). Eppure `coins.py:25` e prediction_market usano `request.session.get('user_id')` → quegli endpoint o sono morti o sollevano errore. Ovunque altro l'identità è `user_id` nel body/query, **non verificata**. Conseguenze:
  - impersonazione totale di qualunque utente (passi il suo `user_id`),
  - economy completamente falsificabile (§2),
  - gli endpoint `POST /games/{id}/xp-rules`, `PUT`, `DELETE` (`games.py:389,515,564`) **non hanno auth**: chiunque può creare/cancellare le regole XP di qualsiasi gioco.
- **A08 Data Integrity (CRITICO)**: lo score/XP è client-supplied senza firma né validazione (§2). La difesa attuale (DevTools detector + offuscamento, `runtimeShell.js:1146`) è **security-by-obscurity**, aggirabile con una POST diretta.
- **Admin (BUONO, l'unica superficie autenticata davvero)**: `admin.py` usa JWT in cookie `httponly+secure+samesite=lax`, bcrypt per la verifica. **Ma**: `SECRET_KEY` default `"change-this-to-random-secret-in-production"` (`admin.py:41`) — se non sovrascritto, i JWT admin sono **forgiabili** (la stringa è nel repo). Da bloccare l'avvio se la env non è impostata.
- **password_hash**: **bcrypt rounds=12** (`database.py:258-260`). Scelta corretta e robusta.
- **CSRF**: con CORS `allow_credentials=True` e (in LAN mode) `allow_origin_regex=http://.*` (`main.py:148-156`), qualunque origine HTTP può fare richieste credenziate. Nessun token CSRF.
- **CSP differenziata**: scelta corretta separare `/games/*` (permissiva) dal resto, ma `'unsafe-eval' 'unsafe-inline' https:` su `script-src` per i giochi same-origin neutralizza la CSP come difesa XSS (§5).
- **Rate limiting (slowapi)**: applicato **solo su alcuni** endpoint (register/login/anonymous in `users.py:72-122`, push, `games.py:63`, `sessions/start`). **`sessions/end` NON è rate-limited** → si può farmare XP in loop. Copertura incompleta.
- **Secret management**: tutti i secret (JWT, STEEM active/posting key, VAPID, Telegram) in `.env`. La active key Steem è denaro.
- **Sandbox iframe**: assente (§5) — finding di sicurezza, non solo architetturale.
- **A03 Injection**: l'ORM protegge da SQL injection; il `config.like('%...%')` non è iniezione ma è fragile. Da verificare i punti che fanno `innerHTML` lato frontend con dati utente (community chat con `image_url`/`gif_url`, board UGC).

---

## 8. Scalabilità e Performance

- **Collo di bottiglia reale = SQLite senza WAL** (§6). Migrare a PostgreSQL quando: >~50 scritture/s sostenute, o appena compaiono `database is locked`, o prima del primo evento di traffico. Con Alembic in piedi, è un cambio di `DATABASE_URL` + tuning.
- **Schedulers**: usano la lib `schedule` in thread daemon (`multiplier_scheduler.py:77-95`). **Failure recovery debole**: stato in memoria, se il processo riparte le run perse non vengono recuperate. In deploy multi-worker (gunicorn -w N) **ogni worker avvia i suoi scheduler** → reward weekly/multiplier eseguiti N volte. Va eletto un singolo runner (lock su DB o processo separato).
- **Leaderboard trigger post-commit** (`leaderboard_triggers.py:12`): ad ogni fine sessione fa query+upsert su all-time **e** weekly. Su SQLite allunga la transazione di scrittura → amplifica i lock. Su Postgres è gestibile.
- **Community chat (ultimi 100 msg)**: serve una retention/pruning reale (job di cleanup), altrimenti la tabella cresce illimitata anche se ne mostri 100.
- **Push + Telegram**: invii sincroni senza coda/retry (`send_telegram_info` chiamato in startup `main.py:233`). Un endpoint Telegram lento blocca lo startup. Servono fire-and-forget + retry/backoff, idealmente una vera queue.

---

## 9. Frontend

- **SPA vanilla senza bundler**: vedi §1. Pro: zero build, debug diretto. Contro: niente type-check, niente minify/tree-shaking coerente, gestione manuale dell'ordine di import.
- **State management** (`state.js`): modulo singleton con getter/setter (es. `getCurrentGameRuntime`). Pattern "module singleton", non reattivo. Il DOM va aggiornato a mano (vedi `updateScoreDisplay`).
- **`runtimeShell.obf.js` / offuscamento**: serve a nascondere il flusso anti-cheat (DevTools detector). **È inutile come difesa** (§7) e peggiora la manutenibilità (devi tenere allineati `.js` e `.obf.js`). Idem `platformsdk.obf.js`, `game.obf.js`. La vera difesa è server-authoritative, non l'offuscamento.
- **InfiniteScrollManager / CampaignCountdown / componenti**: nessun problema nel campione letto; il rischio frontend principale resta XSS via dati utente in `innerHTML` (chat, board).
- **PWA** (`sw.js` + manifest): presente. Da verificare la strategia di cache del service worker contro il `NoCacheMiddleware` (che forza `no-store` su .js/.css/.html, `main.py:52-64`) — **potenziale conflitto**: il SW prova a cacheare ciò che il server marca no-store.

---

## 10. Developer Experience e SDK

- **Distribuzione SDK**: esistono `platformsdk.js`, `.min.js`, `.obf.js`, `.d.ts` (`sdk/`). Manca un meccanismo di **versioning** chiaro: il protocollo è hardcoded a `'1.0.0'` in più punti senza negoziazione. Un breaking change non è gestibile.
- **`.d.ts`**: presente per IntelliSense — buono. Da verificare che copra `saveProgress`/`loadProgress`/`progressLoaded`.
- **Doc** (`sdk/README.md`): presente.
- **Onboarding nuovo gioco**: oggi richiede (1) cartella in `games/`, (2) integrazione SDK (ready/score/gameOver), (3) record in tabella `games`, (4) opzionale handler quest in `quest_tracker/game_handlers/`, (5) opzionale `xp_rules`. Ragionevole, ma la disallineatura doc/protocollo (§5) e l'assenza di uno scaffolder lo rendono più fragile del necessario.

---

## 11. Problemi critici (ordinati per severità)

### CRITICO

1. **Nessuna autenticazione sulle API utente / identità client-supplied** (`users.py`, `coins.py`, devil_crash `router.py`). → *Soluzione*: introdurre auth reale (JWT o sessione server) e derivare **sempre** l'`user_id` dal token lato server, mai dal body/query. Rimuovere ogni parametro `user_id` in input sulle azioni che mutano stato dell'utente.
2. **Score/XP non validati server-side** + doppio canale `score`/`xp_score` (`database.py:712`). → *Soluzione*: per i giochi competitivi/economici, lo score deve essere ricostruibile/validato dal server (replay, telemetria firmata, plausibility check su `score/duration`). Rimuovere `xp_score`. Eliminare l'offuscamento come "difesa".
3. **`/sessions/end` non idempotente (replay → XP infinito)** (`database.py:679`). → *Soluzione*: `if game_session.ended_at: return cached` come prima istruzione; rendere atomici gli incrementi (`UPDATE ... total_xp = total_xp + :n`).
4. **Endpoint `xp-rules` create/update/delete pubblici** (`games.py:389+`). → *Soluzione*: proteggerli col dependency admin (`verify_token_from_cookie`).
5. **JWT admin con SECRET_KEY di default committata** (`admin.py:41`). → *Soluzione*: fail-fast all'avvio se `JWT_SECRET_KEY` non è impostata; ruotare la chiave.

### ALTO

6. **Giochi same-origin + iframe senza `sandbox` + CSP `unsafe-eval`** (§5). → *Soluzione*: servire i giochi da un **origin/sottodominio dedicato** (es. `games.dominio.tld`) e aggiungere `sandbox="allow-scripts"` (senza `allow-same-origin`). Sposta l'identità fuori da `localStorage` accessibile.
7. **SQLite senza WAL/busy_timeout/foreign_keys in produzione** (`database.py:26`). → *Soluzione*: subito `PRAGMA journal_mode=WAL; busy_timeout=5000; foreign_keys=ON` via event listener sulla connessione; pianificare Postgres.
8. **Active key Steem in `.env`** (`backend/.env.example`). → *Soluzione*: secret manager (Docker secrets/Vault), permessi minimi, monitoraggio transfer.
9. **`sessions/end` non rate-limited** (§7). → *Soluzione*: applicare `@limiter.limit`.

### MEDIO

10. **Migrazioni manuali ad-hoc, no Alembic** (`database.py:51-95`). → Adottare Alembic.
11. **Scheduler duplicati in deploy multi-worker** (§8). → Singolo runner con lock.
12. **Query JSON via `LIKE`** (`generic_quest_handler.py:404`). → Colonna `reset_period`/`game_id` normalizzata o JSON1 functions.
13. **Steem: nessuna cache, nessun failover nodo, ricorsione proxy senza limite** (`steem_checker.py`). → Cache TTL, lista nodi con fallback, `max_depth`.
14. **Race lost-update su `total_xp_earned`/coin** (§2). → Update atomici a livello DB.

### BASSO

15. Codice morto/incoerenze: `_default_calculation` orfano, livello 60 mancante nei titoli, docstring "10-minute cache" falso, chiamata `get_witness_by_account` inutile, `handleLog` vuoto.
16. Doc protocollo SDK disallineata dall'implementazione (§5).
17. Conflitto NoCache middleware vs service worker (§9).

---

## 12. Roadmap suggerita (Top 10, con effort S/M/L/XL)

1. **Auth server-authoritative end-to-end** — JWT/sessione, `user_id` solo dal token, su *tutti* gli endpoint mutanti. (Risolve #1, #4, base di tutto) — **XL**
2. **Hardening economy**: idempotenza `/sessions/end`, rimozione `xp_score`, incrementi atomici, rate-limit, validazione plausibilità score. (#2, #3, #9, #14) — **L**
3. **Isolamento giochi**: sottodominio dedicato + `sandbox` iframe + CSP più stretta + identità fuori da localStorage. (#6) — **L**
4. **SQLite WAL/busy_timeout/foreign_keys ON subito**, poi astrazione per Postgres. (#7) — **S** (pragma) / **L** (Postgres)
5. **Alembic** + baseline dello schema attuale. (#10) — **M**
6. **Secret management** (Docker secrets/Vault) + fail-fast su secret mancanti, rotazione chiavi. (#5, #8) — **M**
7. **Refactor `database.py`**: estrarre `SessionService`/`EconomyService` testabili da `end_game_session`. — **L**
8. **Resilienza Steem**: cache TTL multiplier, pool di nodi con failover, `max_depth`, scheduler che non si accavalla. (#13) — **M**
9. **Scheduler singleton** (leader-election via lock DB) per deploy multi-worker. (#11) — **S/M**
10. **Allineamento SDK**: versioning protocollo negoziato, doc=codice, eliminare gli `.obf.js` come difesa, `.d.ts` completo. — **M**

---

## Nota finale

La qualità *ingegneristica dei pattern* (XP calculator, quest tracker, validator UGC, prediction market server-authoritative) dimostra che il team **sa** progettare bene quando decide che una cosa è "seria" lato server. Il problema non è la capacità tecnica: è che **il modello di fiducia dei giochi single-player è stato lasciato client-side** e l'autenticazione non è mai stata introdotta. Risolti i punti 1–2 della roadmap, questa diventa una piattaforma solida. Finché non lo sono, ogni numero mostrato (XP, coin, leaderboard, multiplier→reward STEEM) è **non affidabile e monetariamente sfruttabile**.
