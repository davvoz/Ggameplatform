# Stunt Hill — Recap & Piano di sviluppo (handoff)

> Documento di passaggio di consegne per continuare lo sviluppo del gioco **Stunt Hill**
> all'interno della piattaforma "Ggameplatform". Tutto il codice del gioco è in
> `backend/app/games/stunt_hill/`.
>
> **Aggiornato 2026-06-15:** roster di **5 mappe**, **garage auto** (coins piattaforma),
> e **ranked backend Fase 1**: `GET /week` server-authoritative (mappa+seed della settimana)
> + **validazione di plausibilità lato server** agganciata al session-end della piattaforma
> (`app/game_score_validators.py`), così lo score ranked conta sulla **leaderboard della
> piattaforma** (una sola classifica, niente backend doppione). Restano: il **replay
> deterministico** (Fase 2) e la **promozione a ranked** (`status_id=5` + `steem_rewards_enabled=1`,
> fatta a mano sul DB).

---

## 1. Cos'è il gioco

**Stunt Hill** — racer acrobatico 2D a fisica (stile Hill Climb Racing ma diverso):
- **Niente benzina → BOOST**: le acrobazie caricano una barra di nitro che spendi per spinta extra.
- **Score = distanza + acrobazie/oggetti** con **moltiplicatore combo**.
- **Tracciato deterministico da seed** (il ranked userà un seed settimanale → confronto equo + replay verificabile).

### Dinamica di partita (decisa di recente, è la bussola)
Partita **a tempo con vite e traguardo**:
- **2 minuti** di tempo (`timeLimit: 120`).
- **3 vite** iniziali (max 5). Ogni **ribaltamento** (auto sul tetto, a terra) toglie una vita e fa ripartire poco indietro. A **0 vite → game over**. **Cuori extra** rari si trovano sulla pista.
- **Traguardo** a **1500 m**: +1000 punti + bonus tempo (30 pt × secondo rimasto → più veloce = più punti).
- Fine partita per: tempo scaduto / traguardo / 0 vite → schermata **Game Over** con score finale e **PLAY AGAIN**.
- Score finale = distanza + trick/combo/oggetti + bonus traguardo/tempo.

### Trick & combo
- **Backflip / Frontflip** (gas/freno controllano la rotazione **in aria**).
- **Big Air** (tempo in aria oltre ~0.8s, anche senza flip).
- **Moltiplicatore combo**: cresce incatenando trick entro una **finestra di ~3s** (che scorre solo a terra); si azzera se ti fermi o al crash. Barra combo in HUD.
- Anche **stella** e **cerchi di fuoco→ora stella** e oggetti alimentano la combo.

### Oggetti sulla pista (deterministici, piazzati "intelligentemente")
- **Gemma** (50 pt) — arco di gemme da seguire sui salti.
- **Stella** ⭐ (200 pt, +combo) — sull'apice dei salti. *(Ha sostituito i "cerchi di fuoco" che non piacevano.)*
- **Cuore-vita** (raro) — +1 vita.
- **Boost pad** (frecce turbo dipinte sull'asfalto, solo su tratti piatti) — spinta in avanti.
- **Trampolino/spring** — rimbalzo che scala con la velocità d'arrivo (al lip dei salti).

---

## 2. Stato attuale (cosa funziona)

- Fisica veicolo **deterministica a passo fisso** (1/360s): telaio + 2 ruote con sospensioni, contatto ruota(cerchio)↔terreno con normale/tangente, controllo aereo, crash se ribaltato sul tetto a terra **oppure** in stallo sul telaio con ruote sollevate (nose-stand, `stuckTimer` 1.6s → evita il softlock). **Feel approvato dall'utente.**
- **MONDO A SUPERFICI MULTIPLE (roadmap #2 → FATTO)**: vie alternative VERE su tre
  livelli — sottoterra / superficie / cielo — tutte con **collisione one-way**
  (fisica in `Vehicle._wheelContact/_cornerContact`, flag `oneWay`).
  *(In 2D side-scroller la scelta della via è verticale: salti/cadi per cambiare
  strada, resti a terra per la via normale.)*

  **TUNNEL SOTTERRANEI** (tabella `TUNNELS` in `Terrain.js`): il terreno si apre in
  un **buco**; un **dosso di lancio** (+1.5 m) sta subito prima → arrivi veloce
  (≳15 m/s) e voli oltre il buco sul "soffitto" (che è la strada normale, con
  l'erba); arrivi lento e cadi nel **bore scavato** (interno buio, lanterne sul
  soffitto, portali di pietra, gemme + cuore dentro). Il fondo del bore è PIATTO
  (blend verso `drift − depth`, NON base−depth: sotto i whoops il fondo erediterebbe
  i whoops) e l'uscita è una risalita lunga (`ex` 12–16 m) scalabile da fermo.
  - **TUNNEL** [216–250, prof. 4.5] sotto il flat k5 — didattico, nel WARM-UP.
  - **WHOOPS TUNNEL** [1098–1172, prof. 6] — passa SOTTO i whoops k27: la via
    sicura li salta da sotto (sopra restano la via veloce e le loro gemme).

  **⚠️ PIATTAFORME FLUTTUANTI: PROVATE E RIMOSSE** (feedback utente, 2 iterazioni):
  qualunque superficie sospesa sopra la linea di corsa interrompe il tracciato —
  ci sbatti contro la pancia in volo e le ruote si incastrano salendoci. REGOLA:
  il divertimento extra vive NEL terreno (tunnel, rampe) o NELL'ARIA (collezionabili,
  loop), mai sospeso sulla traiettoria. Niente tabella `DECKS` (eliminata).

  **STUNT ALTERNATIVI attuali:**
  - **CANNONE SUL TRESPOLO VOLANTE** (tabelle `PERCHES` + `CANNONS`): una
    piattaformina-bersaglio di 12 m (x 444.5–456.5, h 8.8) sospesa oltre il
    crest della rampa k10 — la centri solo con un salto ben lanciato (2 gemme
    guida sull'avvicinamento). I "perch" sono TARGET, non strade: sotto c'è
    solo la fossa della rampa, la via bassa non è mai bloccata; top one-way +
    pancia solida a finestra piena (stessa fisica dei tetti tunnel). Sul
    trespolo c'è il cannone (x 450.5, angle 0.72, power 24): ci entri →
    risucchio (0.5 s di carica, l'auto sparisce nella canna: disegnato DAVANTI
    all'auto), poi **BOOM** — lancio balistico scriptato (`Vehicle._cannonStep`,
    hook `onCannon` → shake/fiamme/+15 boost). Gemme sulla parabola esatta,
    stella all'apice, cuore in discesa (`TrackObjects` ramo `cannon`,
    quota base via `cannonBaseY`).
  - **GIRO DELLA MORTE** (tabella `LOOPS`: x 748, r 4.2, minSpeed 12): anello A
    TERRA sul flat k17, subito dopo il turbo pad → catena TURBO → LOOP. Giro a
    360° scriptato e deterministico in `Vehicle._loopStep` (+400 pt × combo,
    +25 boost, stella in cima). **Resa 2.5D**: bordo lontano scuro sfalsato
    in alto-sinistra + connettori del tubo dietro l'auto
    (`_drawLoopsBack`), bordo vicino DOPO l'auto (`_drawLoopsFront`) → l'auto
    passa visivamente DENTRO l'anello.
  - **SPEED GATE** (flag `gate` su k19 e k33): due piloni a scacchi ciano con
    fascio di luce — attraversali a ≥18 m/s → +150 × combo (sotto: "TOO SLOW…").
  - **Molla k13** (vy 15): gran rimbalzo sopra la prima valley.
  - **Rampe nel terreno** (k20, k25+molla, k30): i salti grossi restano
    scavati nella heightfield.
  **SOFFITTI SOLIDI nei tunnel**: `roofUnderAt` in Terrain = unica fonte per
  fisica E render (`Vehicle._ceilingContact`/`_cornerCeiling`): dentro il bore
  sbatti la testa, non passi attraverso il tetto.
  Mappa schematica: `tools/level_map.png` (da rigenerare).
- **ROSTER DI 5 MAPPE SETTIMANALI, OGNUNA UN "VIAGGIO" A ~6 ATTI**: in
  `js/config/maps.js` vivono 5 tracciati hand-authored. Ridotte da 10 a 5 (scelta
  utente) per tenerle MOLTO varie con meno mappe. La regola di design: ogni mappa
  evolve dall'inizio alla fine (warm-up → sezione-feature → stunt → … → finale),
  NON un motivo ripetuto; e ogni mappa è diversa dalle altre per mix di pezzi e
  stunt. Identità (verificate dal validatore + dump sequenza pezzi):
  1. **GREEN HILLS** — all-rounder erboso: warm-up+underpass → trick park+**loop**
     → hill country → **cannone** → tecnica (whoops/steps/valley) → big-air sprint
     (10 tipi di forma, tunnel+loop+cannone).
  2. **DESERT DUNES** — sabbia: dune intro → oasi+grotta → grandi dune → **DOPPIO
     LOOP** → valley swoops → dune finali (hill/valley + molle, 0 cannoni).
  3. **SNOWY PEAKS** — **GHIACCIO** (`gripScale 0.6 dragScale 0.65`): pista blu →
     terrazzi+kicker → grotta di ghiaccio → kicker di vetta+**cannone** → cornice →
     discesa (kicker-heavy, 0 loop).
  4. **CITY CANYON** — gola con città al tramonto sullo sfondo: mesa → rete di **2 grotte** → gola con **voragini
     (chasm)** → **cannone** dell'aquila → rim → sprint (chasm/table, 0 loop).
  5. **MOONLIGHT** — **BASSA GRAVITÀ** (`gravityScale 0.62`, grip/drag dusty):
     crateri → **cannone** cometa → **mega-kicker** (air enorme) → grotta dark-side
     → **loop** dei crateri → apollo sprint.
  Forme: flat/rolling/whoops/jump/ramp/table/valley + `gap` `steps` `crater`
  `kicker`(ski-jump concavo) `hill`(duna) `chasm`(mesa-vuoto-mesa) `bump`(masso)
  + **`tabletop`**(salto a cima piatta) **`drop`**(salto di un dirupo/cornice)
  **`stepdown`**(cascata di gradoni). Ogni mappa usa ora 9–12 tipi di pezzo
  intrecciati (no più 2-3 motivi ripetuti).
  **TUNNEL A TEMA per bioma** (`MAP.tunnelStyle`: grass/sand/ice/rock/tech →
  `TUNNEL_STYLES` in Renderer): interno, portale e decori-soffitto diversi —
  lanterne (grass/rock), torce (sand), ghiaccioli (ice), cristalli ciano (tech).
  Fisica per-mappa (dati mappa → deterministica, ranked-safe): `gravityScale`,
  `gripScale` (trazione/freno/attrito telaio), `dragScale` (rotolamento) — usate
  con parsimonia (solo ghiaccio Snowy e bassa-G Moon, su richiesta utente di
  concentrarsi sul TRACCIATO non sulla fisica).
  **⚠️ HAZARD (lava/acqua) PROVATI E RIMOSSI** (feedback utente): non piacevano →
  eliminato del tutto il sistema (`MAP.hazards`, fisica Vehicle, FX Game,
  `Renderer._drawHazards`, helper LAVA/WATER). I crateri (Volcano era troppo
  difficile) e Volcano/Neon/Jungle/Beach/Highlands sono fuori dal roster attuale.
  Ciclo: in **FREE RIDE** la mappa è scelta dalla griglia; il backdrop del menu usa
  `weeklyMapIndex()` % 5; `?map=N` (0–4) la forza (test). In **RANKED** mappa+seed
  arrivano dal **server** (`GET /api/stunt-hill/week`, HMAC della settimana ISO → uguali
  per tutti, non forzabili lato client). `Terrain.setMap(i)` attiva mappa+seed+style+fisica
  e `setSeed(weekSeed)` sovrascrive col seed settimanale in ranked; `currentMap()` la espone.
  REGOLE DI PIAZZAMENTO (in cima a maps.js): mai valley/crater/gap/chasm prima di
  una ramp; tunnel solo sotto flat/flat+whoops; loop su flat pulito (x=k·42+21);
  kit cannone = ramp + perch a K·42+24.5; una riga flat/rolling = UN flag.
- **PANORAMI DI SFONDO PER BIOMA (Renderer)**: la parallasse ora usa `basePPS`
  COSTANTE (`_bgOff`), non `pps` → l'orizzonte NON sobbalza/stira più con lo
  zoom-velocità (era il bug: `cam.x*par*pps`). Profondità mantenuta. `_drawBackground`
  sceglie il panorama da `biome.bg`: `hills` (montagne blu + colline verdi + foresta,
  GREEN), `peaks` (alpi innevate con cuspidi + pini con neve, SNOWY), `dunes`
  (mesa lontane + dune di sabbia, DESERT), `mesas` (rocce varie: mesa/guglie/butte
  a 2 livelli/dossi/detriti + strati — usato come layer lontano del DESERT),
  `city` (**skyline di palazzi** con tetti vari —setback/serbatoi/antenne/guglie— e
  finestre illuminate su 2 livelli, CANYON → metropoli al tramonto), `moon`
  (colline-cratere grigie basse + cielo con **stelle** che brillano e la **Terra**
  — `_drawStars`/`_drawEarth`; niente sole/uccelli/nuvole).
  Helper: `_bgRolling` (colline/dune), `_bgPeaks` (cuspidi+neve), `_bgMesas`
  (rocce varie+strati), `_bgCity` (palazzi+finestre), `_bgTrees` (pini, neve opz).
  Nuvole rallentate (par 1.0/2.2).
- **STILE DI GENERAZIONE PER-MAPPA (non solo l'ordine delle forme)**: ogni mappa
  ha un blocco `style: ST({...})` che rimodella IL GENERATORE in `Terrain.js`
  (così un salto/valle/rolling NON è identico ovunque):
  - `driftAmp/driftFreq` — ondulazione macro della baseline (NEON quasi piatta
    0.4; DESERT/HIGHLANDS dune lunghe 3.0/2.6).
  - `texAmp/texFreq/texJag` — micro-texture continua della superficie (no seam):
    SNOWY/NEON lisci (0.04–0.08), VOLCANO roccia frastagliata (0.55 + jag),
    DESERT swell di sabbia (0.50), MOON regolite (0.40 + jag).
  - `rollFreq` — lunghezza d'onda del rolling (DESERT dune lunghe 0.10, VOLCANO
    choppy 0.30).
  - `valley` — 'sine'(liscia) | 'round'(fondo piatto, desert/neon/beach) |
    'flatV'(a punta, volcano/moon).
  - `whoopFreq` — densità moguls (VOLCANO 1.1).
  Implementazione: `Terrain.st()` legge `MAP.style`; `drift()`, `texture()`,
  `baseHeight()`, `segRolling/segWhoops/segValley` lo usano. La texture entra in
  `baseHeight` → anche i tetti/le pareti dei tunnel ereditano il carattere del
  bioma (grotta di ghiaccio liscia vs caverna vulcanica ruvida). Il fondo del
  bore resta liscio (blend verso `drift−depth`, senza texture). Validato: giunzioni
  <3.3cm su tutte le mappe, nessun picco di pendenza oltre quanto già nei salti.
- **`segmentInfo(k)` = single source of truth**: forma del terreno E piazzamento
  oggetti leggono la stessa tabella → stelle sugli apici di salto, archi di gemme
  sulla traiettoria di volo, gemme su table/valley/whoops, boostpad e cuori nei
  punti decisi dal design (`pad: true` / `life: true` / `spring: true`).
- **Bilanciamento playtestato via bot** (vedi §11): bot PD senza boost finisce a
  119.9s (al limite), col boost a 94.3s con 2 crash → il time bonus premia lo skill.
- Sistema partita completo (timer/vite/traguardo/game over/restart) + **banner di
  zona** all'ingresso di ogni zona disegnata.
- **Grafica overhaul completo** (Renderer): cielo con sole e **ora del giorno legata
  al progresso** (giorno → golden hour al traguardo), 2 catene montuose + colline +
  pineta in parallasse (noise irregolare), nuvole ombreggiate, uccelli, terreno con
  strati/sassolini/ciuffi d'erba/fiori, alberi-cespugli-rocce decorativi deterministici,
  **auto ridisegnata** (buggy rosso: spoiler, roll bar, casco con visiera, ruote con
  battistrada, faro, stop che si accende in frenata, ombra a terra che scala con
  l'altezza), **camera con look-ahead, zoom dinamico e shake sugli impatti**,
  speed lines, vignette, tinta boost, **arco del traguardo** (pali a bande + banner
  FINISH + scacchi dipinti sulla strada).
- Juice: coriandoli al traguardo, scintille colorate per pickup, fumo di frenata,
  fiamme boost con glow, popup trick con pop animato, barra boost che pulsa da piena,
  timer che pulsa sotto i 10s, "GO!" alla partenza.
- Trick/combo, oggetti, particellari, audio procedurale (motore disattivato perché brutto).
- HUD completa, controlli touch (3 pulsanti) + tastiera.
- **MODALITÀ FREE RIDE + RANKED (struttura di gioco)**:
  - **FREE RIDE** (etichetta del bottone; internamente `mode 'story'`): le 5 mappe
    si sbloccano in sequenza — raggiungi il traguardo di una mappa e sblocchi la
    successiva. È la palestra: score azzerato verso la piattaforma (inviato come
    `mode 'free'`). Progressi e best per mappa in `localStorage`
    (`js/core/Progress.js`, chiave `stunt_hill_progress_v1`) — per-dispositivo
    finché il backend non offrirà la sync.
  - **RANKED**: mappa+seed della settimana **decisi dal server** (`RankedApi.getWeek()`
    → `GET /api/stunt-hill/week`), **aperta a tutti anche senza sblocchi**; invia lo
    score VERO alla leaderboard di piattaforma (`bridge.gameOver(..., 'ranked')`,
    pattern altitude). **Validazione server FATTA**: lo score passa dal
    validatore di plausibilità nel session-end (`app/game_score_validators.py` →
    `stunt_hill_be.service.check_ranked_run`) PRIMA di entrare in leaderboard/XP/quest;
    una run implausibile (score assurdo, mappa sbagliata/forzata, auto fasulla, ecc.)
    viene **azzerata** (score 0 + metriche azzerate). NON c'è una classifica separata:
    è quella della piattaforma. Replay deterministico = Fase 2 (vedi §9.4).
  - **Menu** (`js/ui/Menu.js` + overlay in index.html): titolo, bottone FREE RIDE →
    griglia delle 5 mappe (card col colore del bioma, lucchetti, best personale),
    bottone RANKED col nome della mappa settimanale (preso dal server via `getWeek()`),
    bottone GARAGE → shop auto (vedi §9.4b). Dietro il menu il mondo scorre in
    panoramica. Game over: PLAY AGAIN + MENU + riga "★ NEW MAP UNLOCKED" (solo free).
    `Game.startMatch(mapIndex, mode, rankedMeta?)` avvia la run (in ranked applica il
    seed settimanale, riusato anche da PLAY AGAIN); `?map=`/`?start=` saltano il menu (dev).
- **Ciclo SDK + SESSIONI/XP (come altitude)**: `startRun` (`resetSession`) a ogni
  avvio run → `gameOver` a fine run in ENTRAMBE le modalità (la sessione viene
  SEMPRE inviata → l'XP arriva). L'XP la dà la piattaforma da `extra_data`
  (`distance`/`coins_collected`/`levels_completed`/`tricks`); la LEADERBOARD dall'
  argomento `score`.
  - **RANKED**: `score` reale + `distance` reale → conta in classifica; `sendScore`
    live (~1/s).
  - **FREE RIDE**: `score = 0` e `distance = 0` → NON tocca la leaderboard, ma
    `coins`(gemme×1/stelle×3) + `tricks` + `levels_completed`(traguardo) vengono
    inviati → **il run dà comunque XP**. Niente `sendScore` live.
  Stat del run contati in `Game._runStats` (reset a `startMatch`); `extra_data`
  costruito in `PlatformBridge.gameOver` (vedi pattern in `altitude/PlatformBridge`).
  ⚠️ Il server legge `distance` da `extra_data` (`database.calculate_session_xp`)
  e lo `score` dall'arg → in free `distance` va TENUTO (azzerato solo lo score),
  altrimenti una regola `distance_bonus` darebbe 0 XP.
- **XP RULES + QUEST + BADGE XP (FATTO — mancavano)**: il register script ora crea
  anche (come gli altri giochi, modello `register_minion_clash.py`):
  - **XP rules** (`XPRule`): `stunt_hill_distance` (`distance_bonus`, `milestone_distance`
    50 → 1 XP ogni 50 m, ~30 XP per un run pieno da 1500 m; vale in ENTRAMBE le modalità) +
    `stunt_hill_ranked_score` (`score_multiplier` 0.0005, `max_xp` 50 → paga solo in
    ranked dove score>0).
  - **Quest** (`Quest`): **3 quest DIVERSE**, tutte giornaliere, via `quest_type "score"`
    (il tracker lo tratta come accumulatore generico su un campo di `extra_data`,
    `config.extra_data_field`): **Road Trip** (4.000 m totali, campo `distance`, 40 XP +
    5 coin) · **Trick Star** (20 trick atterrati, campo `tricks`, 45 XP + 10 coin) ·
    **Gem Collector** (150 gemme, campo `coins_collected`, 50 XP + 10 coin). Tutte e tre
    avanzano in free E ranked (i campi sono inviati in entrambe le modalità).
  - **Badge XP in-game**: `js/platform/PlatformNotifications.js` (`initPlatformNotifications()`
    chiamato in main.js) ascolta i `postMessage` della piattaforma `showXPBanner`
    (badge "+X XP") e `showLevelUpModal` (modale level-up) — come altitude. Prima
    mancava del tutto.
- `thumbnail.png` generata proceduralmente (`tools/make_thumbnail.py`, PIL).
- Registrazione nel DB.

---

## 3. Come si avvia / testa

- **Va servito via HTTP** (gli ES modules NON si caricano da `file://`):
  `http://localhost:8000/games/stunt_hill/index.html`
- Registrazione nel DB (idempotente): `python backend/scripts/register_stunt_hill.py`
  (registrato come `status_id=6` = "fun", `steem_rewards_enabled=0`, categoria `racing`).
  **Promozione a ranked** (`status_id=5` + `steem_rewards_enabled=1`) = fatta **a mano sul DB**
  dall'utente quando decide di andare live; la validazione server (plausibilità) è già attiva.
- Controlli: `→` gas · `←` freno · `↑/Spazio` boost · `R` restart · touch: pedali BRAKE/GAS + tondo BOOST.
- **Dev helper:** `?start=800` spawna a 800 m (ispezione livello / screenshot).
- **Screenshot headless** (senza piattaforma): `python -m http.server 8123` dalla root
  repo, poi `msedge --headless --screenshot=out.png --window-size=480,800
  --virtual-time-budget=6000 "http://localhost:8123/backend/app/games/stunt_hill/index.html?start=842"`.

---

## 4. Architettura / file

```
backend/app/games/stunt_hill/
  index.html                 # carica SDK (../../../sdk/platformsdk.obf.js) + main.js (modulo)
  css/style.css              # HUD, animazioni (trick pop, zone banner, boost pulse), game over, garage
  thumbnail.png              # card della piattaforma (generata, 1024×1024)
  tools/make_thumbnail.py    # rigenera la thumbnail (PIL, procedurale)
  js/main.js                 # boot (canvas, fullscreen, loading) + crea Garage/Menu, wiring onPlay
  js/config/
    GameConfig.js            # TUTTO il tuning (fisica, boost, trick, combo, MATCH, camera)
    maps.js                  # ROSTER di 5 mappe (DESIGN + tunnel/loop/perch/cannon + bioma/style/
                             #   fisica per-mappa + bg + tunnelStyle); weeklyMapIndex()
    cars.js                  # roster 6 auto (sidegrade, stat sommano 4.0) + body.kind; activeCar/carStats
  js/core/
    Terrain.js               # heightfield deterministico SEEDABLE a SEGMENTI + seedHash()
                             #   + DESIGN per-mappa + segmentInfo(k); setMap/setSeed/currentMap
    Vehicle.js               # fisica + trick/combo (applica carStats + fisica per-mappa); onTrick/onCrash/onCannon
    utils.js                 # rot(), clamp()
    Game.js                  # orchestratore + CONTROLLER PARTITA (timer/vite/traguardo/gameover/countdown)
                             #   + zone banner, shake/confetti/skid, ciclo SDK, startMatch(map,mode,rankedMeta)
    Progress.js              # best/sblocchi per-mappa in localStorage (free ride)
    Garage.js                # saldo/acquisto/possesso auto via API coins piattaforma; auto selezionata in LS
  js/render/Renderer.js      # stack visivo completo (panorami per bioma, parallasse stabile, terreno
                             #   testurizzato, scenery, AUTO per body.kind, ombra, traguardo, camera FX, preview)
  js/systems/
    InputManager.js          # tastiera + 3 bottoni touch (btn-brake/gas/boost)
    ParticleSystem.js        # flame/dust/impact/spark(color)/smoke/confetti
    AudioManager.js          # WebAudio procedurale (motore OFF; boost/land/trick/crash/boing)
    TrackObjects.js          # piazzati PER ZONA via segmentInfo(k) — deterministici, a chunk
  js/ui/
    Hud.js                   # score, dist, spd, best, barra boost, combo+barra, TIMER, VITE, countdown, GAME OVER
    Menu.js                  # FREE RIDE (griglia mappe) + RANKED (mappa dal server) + GARAGE (shop auto)
  js/platform/
    PlatformBridge.js        # SDK: init/startRun/sendScore/gameOver — leaderboard SOLO ranked
    RankedApi.js             # getWeek() → GET /api/stunt-hill/week (mappa+seed della settimana, cache)
    PlatformNotifications.js # badge XP + modale level-up via postMessage (initPlatformNotifications)

backend/app/games/stunt_hill_be/        # ranked backend (Fase 1): SOLO la week, niente classifica
  service.py                 # current_week() (HMAC ISO-week) + check_ranked_run() (plausibility gate)
  router.py                  # GET /api/stunt-hill/week  + /health
backend/app/game_score_validators.py     # validatore score GENERICO (dispatch per game_id) usato in
                             #   end_game_session: voida le run ranked implausibili PRIMA della leaderboard
backend/scripts/register_stunt_hill.py   # upsert idempotente in games + XPRule + Quest
```

**Terrain.js (importante):** la pista è una sequenza di **segmenti da 42m**, ognuno parte e finisce a quota 0 → si connettono lisci. I primi 36 segmenti seguono la **tabella `DESIGN`** (livello disegnato a zone); oltre, fallback procedurale **pari = feature / dispari = recupero**. `segmentInfo(k)` espone il tipo di ogni segmento ed è usata sia dall'altezza sia dal piazzamento oggetti. Funzione pura `terrainHeight(x)` (deterministica dal seed) → ottima per il replay del ranked.

---

## 5. Tuning principale (`GameConfig.js`)
- Fisica: `gravity, mass, inertiaScale, engineForce, maxSpeed, suspK/suspDamp, airControl, rollDrag, angularDamp`.
- Boost: `maxBoost, boostForce, boostDrain, boostPerFlip, boostPerAirSec`.
- Trick/combo: `trickPerFlip, trickPerAirSec, maxMultiplier, comboWindow(3.0), bigAirTime(0.8), bigAirPoints`.
- Crash: `flipCosThresh(-0.7), flipTime(1.1)`.
- **Partita**: `timeLimit(120), startLives(3), maxLives(5), levelLength(1500), finishBonus(1000), timeBonusPerSec(30)`.
- Camera/zoom adattivo: `viewMetersX(24), viewMetersY(16), minPPS, maxPPS`.

---

## 6. Integrazione piattaforma (come funziona qui)
- SDK = `backend/sdk/platformsdk.js` (UMD → `globalThis.PlatformSDK`). Eventi: `ready`, `config` (riceve userId/username), `scoreUpdate`, `gameOver(score,{extra_data})`, `resetSession`.
- `PlatformBridge.gameOver(score, stats, mode)`: in mode **'free'** lo score è azzerato → **non tocca la leaderboard**. Solo il mode **'ranked'** invierebbe lo score vero. → "**leaderboard solo per il ranked**" (come fa il gioco *altitude*).
- **Validazione score lato server (anti-cheat)**: lo score di TUTTI i giochi entra dalla piattaforma in `database.end_game_session()` (chiamato da `POST /api/users/sessions/end`), che fa `game_session.score = score` → trigger → tabella `Leaderboard`. Lì è agganciato `game_score_validators.validate_game_score(game_id, score, duration, extra_data)`: per `stunt_hill` (solo run ranked) applica il plausibility gate (`stunt_hill_be.service.check_ranked_run`) e **azzera** score+metriche se la run è implausibile o sulla mappa sbagliata, PRIMA di leaderboard/high-score/XP/quest. Gli altri giochi passano inalterati. → una sola classifica (quella della piattaforma) con anti-cheat davanti.
- **Week server-authoritative**: `GET /api/stunt-hill/week` (`stunt_hill_be`) dà mappa+seed della settimana (HMAC della ISO-week); il client ranked li applica con `setMap`/`setSeed`. Nessuna classifica vive in `stunt_hill_be`.
- Giochi serviti da `/games/<id>/`; registrazione in tabella `games` (vedi register script).

---

## 7. Vincoli / decisioni chiave (NON dimenticare)
1. **Heightfield = una sola altezza per x** → **impossibili tunnel veri e percorsi multi-livello sovrapposti**. La verticalità ora è solo via plateau/valli/rampe. I "ponti/tunnel veri su cui guidare" richiedono un **mondo a superfici multiple (segmenti/piattaforme con collisione one-way)** = grande step futuro.
2. **Ranked paga STEEM reali** → lo score **deve essere validato lato server** (la piattaforma di base si fida del client = falla nota). **Stato:** il `stunt_hill_be` con seed settimanale (`/week`) + **plausibility check** esiste ed è attivo (vedi §6); manca il **replay deterministico** (la *prova* vera). La fisica è già nel passo fisso deterministico, i cosmetici (particellari/audio/oggetti-FX) sono **fuori** dallo step → il replay resta verificabile. La promozione a `status_id=5` + `steem_rewards_enabled=1` la decide l'utente a mano sul DB (con la sola plausibilità o dopo il replay).
3. **Free Ride** usa l'SDK normalmente ma con score azzerato (niente classifica).

---

## 8. Limitazioni note / cose non ancora fatte
- **Replay deterministico non ancora fatto** — la validazione ranked è solo
  *plausibilità* (vedi §6/§7.2). La prova esatta richiede di rigiocare gli input
  lato server (Fase 2, §9.4).
- **Promozione a ranked non ancora fatta** — il gioco è `status_id=6` ("fun"),
  `steem_rewards_enabled=0`. Si promuove a mano sul DB quando si va live.
- Audio motore disattivato (suonava male).
- Sync progressi/best solo `localStorage` (per-dispositivo) — niente sync server.
- Polish residuo (trick extra, ghost dei record): vedi §9.5.

---

## 9. Piano di sviluppo (roadmap, in ordine)

1. ~~**Map / level design per la nuova dinamica**~~ **FATTO** — livello a 5 zone in
   `Terrain.js` (tabella `DESIGN`), oggetti piazzati per zona, bilanciamento validato
   con bot di playtest (vedi §11).
2. ~~**Mondo a superfici multiple (la feature grossa)**~~ **CHIUSO** — 2 tunnel
   sotterranei + giro della morte a terra + super molla → tesoro nel cielo
   (vedi §2; le piattaforme sospese sono state provate e RIMOSSE su feedback).
   **I numeri (posizioni/raggi/power molle) vanno tarati dal playtest
   dell'utente** — tabelle `LOOPS`/`TUNNELS` di Terrain.js e flag della `DESIGN`.
3. ~~**Ciclo sessione SDK completo (Free Ride)**~~ **FATTO** — `startRun` a init/restart,
   `sendScore` live ~1/s, `gameOver` finale.
4. **Backend ranked `stunt_hill_be`:**
   - ✅ **`GET /week`** → `{ week_id, map_index, map_id, map_name, seed }` (mappa
     della settimana dal roster di 5 + seed, decisi dal server via HMAC della ISO-week;
     il client ranked chiama `setMap`/`setSeed` con quei valori). `RankedApi.getWeek()`.
   - ✅ **Validazione (plausibilità)** — DECISIONE D'ARCHITETTURA CAMBIATA rispetto al
     piano originale: niente `POST /score` né classifica dedicata. Lo score ranked va
     **direttamente alla leaderboard della piattaforma** (via `gameOver`) e viene validato
     lato server nel session-end (`game_score_validators` → `check_ranked_run`): una run
     implausibile/mappa-sbagliata è azzerata. Una sola classifica, con anti-cheat. Vedi §6.
   - ❌ **Replay deterministico (Fase 2):** il client logga gli input per ogni step fisso
     (1/360s) + il seed; il server **ri-simula la fisica in Python** e ricalcola lo score,
     confrontandolo con quello dichiarato. È la *prova* vera (la plausibilità becca solo
     l'assurdo). Il validatore aggancerebbe qui (stesso punto). Richiede la fisica
     deterministica condivisa/portata in Python; i cosmetici sono già fuori dallo step.
   - ❌ **Promozione a ranked:** `status_id=5` + `steem_rewards_enabled=1` — fatta a mano
     sul DB dall'utente (con la sola plausibilità o dopo il replay).
4b. **GARAGE / SHOP AUTO (FATTO lato client)** — auto comprabili con le **coins di
   piattaforma** (NON progressi locali), pattern di survivor-arena:
   - `js/config/cars.js`: roster di 6 auto come DATI deterministici. SIDEGRADE
     bilanciati: i 4 stat (accel/maxSpeed/grip/boost) sommano sempre 4.0 → nessuna
     auto è "più forte" (Rookie base, Comet=velocità, Bulldog=grip, Jolt=accel,
     Titan=boost, Phantom=glass-cannon). `mass` è flavor (non ancora cablata).
     Stato attivo (`activeCar`/`carStats`/`carColor`) letto da Vehicle (applica
     accel/maxSpeed/grip/boost in modo deterministico → ranked-safe) e Renderer
     (colore carrozzeria). Ogni auto è un VEICOLO DIVERSO via `body.kind` →
     routine di disegno dedicate in Renderer (`_bodyBuggy/_bodyF1/_bodyMonster/
     _bodyBike/_bodyTruck/_bodyHover`): buggy rally · monoposto F1 (halo, ala
     multi-elemento) · monster truck (ammortizzatori, bull bar, barra fari) ·
     sportbike · hot-rod col compressore · hovercar (niente ruote, **fasci di campo
     magnetico** verso terra + anelli pulsanti). `body` = {kind, len, h, wheel}.
     `Renderer.drawCarPreview(canvas, id)` disegna il mezzo nelle card del garage
     (mini-anteprima). Ombra auto = blob radiale morbido che segue pendenza/quota.
   - `js/core/Garage.js`: saldo/acquisto/possesso via API REST condivise
     (`/api/coins/{uid}/balance`, `/purchases/stunthill`, `/spend` con
     `source_id='stunthill_theme_<id>'`). Possesso sul server; auto SELEZIONATA in
     localStorage. `_userId()` da `globalThis.platformConfig.userId`.
   - UI: schermata GARAGE nel menu (`Menu._buildGarage`, griglia con barre stat,
     prezzo/BUY/SELECT, saldo).
   - `carId` inviato in `extra_data` a fine sessione → il futuro validatore ranked
     riapplica gli stessi stat. **Fairness ranked**: sidegrade + tutte ottenibili
     → una sola classifica equa (scelta utente). Il replay backend dovrà leggere
     `car` e applicare `cars.js` (stessi numeri client/server).
5. **Polish rimanente:** altri trick (wheelie, perfect landing), ghost dei record,
   audio motore decente, biomi visivi alternativi (il renderer ha già le palette lerpate
   → facile aggiungere set di colori per bioma).

---

## 11. Playtest via bot (come ri-validare il livello dopo modifiche)

Il livello si testa headless in Node con un "pilota PD" che dà gas a terra e
stabilizza l'assetto in aria (proxy di un giocatore mediocre):

```js
// node -e "..." — vedi history; nucleo:
let inp = 1;
if (!v.run.wasGrounded) {
  let a = v.car.a % (2*Math.PI); if (a > Math.PI) a -= 2*Math.PI; if (a < -Math.PI) a += 2*Math.PI;
  const u = -(a*2.2 + v.car.w*0.55);            // PD su assetto+rotazione
  inp = u > 0.35 ? 1 : u < -0.35 ? -1 : 0;
}
v.step(1/360, inp, boost);                       // onCrash → reset(x-3) e conta
```

⚠️ Su richiesta dell'utente i **playtest di giocabilità li fa LUI** (non sprecare
token con bot run / screenshot a ogni modifica). I bot servono solo se chiede di
verificare una trappola specifica. Nota per i sim: le molle vivono nel layer Game
(TrackObjects/_onCollect), non in Vehicle → in un sim vanno applicate a mano
(`vy=(power||15)+0.7·vIn` nel raggio o.r+1 dell'oggetto).
Ultimi numeri misurati (prima dei percorsi alternativi attuali): plain 112.3s /
2 crash (k25), boost 100.2s. Fork tunnel: vx≤14 → bore, vx≥20 → tetto.
Se dopo una modifica il bot si pianta in crash-loop su un segmento → trappola di
design (es.: la big ramp originale aveva la faccia a ~50° e fossa profonda dietro
il crest → riformata con faccia lunga `ss(0.10L→0.42L)` e fossa bassa; stesso fix
sui single jump `ss(0.08L→0.32L)`).
Lezioni: **mai una valley-slingshot subito prima di una big ramp**; **una faccia
ripida converte la velocità orizzontale in verticale** → se l'ingresso di un deck
dipende dalla distanza di volo, la faccia del lanciatore va tenuta lunga;
il **nose-stand è una posa stabile** → serve lo `stuckTimer` (crash dopo 1.6s);
il fondo di un tunnel va **blendato verso un livello piatto**, non `base−depth`
(altrimenti eredita le feature della superficie: whoops nel bore + rampa d'uscita
= muro); **le risalite d'uscita dei tunnel vanno scalabili da fermo** (respawn
dentro il bore) → pendenza media ≤ ~22°.

---

## 10. Note operative per chi continua
- **Stile codice:** moduli ES, JS vanilla, tutto in **inglese** (commenti + UI). Niente build step.
- **Determinismo:** la fisica gira SOLO nello step fisso `FIXED_DT=1/360`; particellari/audio/FX oggetti stanno in `Game._effects()` (per-frame, fuori dalla fisica). Mantenere così per il ranked.
- **Test:** sempre via HTTP (non `file://`).
- **Feedback utente ricorrenti:** vuole qualità grafica alta e roba "al posto giusto", non oggetti a caso; odia le soluzioni cosmetiche finte (es. tunnel decorativi rimossi). Le cose interattive devono avere uno scopo chiaro.
```
