# Seven Game - Setup Scripts

Script per la registrazione e configurazione del gioco "Seven" nella piattaforma.

## 📋 Script Disponibili

### 1. `register_seven_game.py`
**Descrizione**: Script principale per registrare il gioco Seven nel database con tutte le configurazioni.

**Funzionalità**:
- Registra il gioco nella tabella `games`
- Crea 5 regole XP personalizzate:
  - **Rounds Played Bonus**: 0.5 XP per round (max 20 rounds)
  - **Win Streak Bonus**: Bonus XP per serie di vittorie (3/5/10 wins)
  - **High Roller Bonus**: 30 XP per raggiungere 500 chips
  - **Score Multiplier**: Moltiplicatore 0.02x (max 40 XP)
  - **Time Played Bonus**: 0.2 XP/minuto (max 10 minuti)

**Utilizzo**:
```bash
cd backend
python scripts/register_seven_game.py
```

**Output**: Registra il gioco con ID `seven` nella categoria `casino`

---

### 2. `create_seven_thumbnail.py`
**Descrizione**: Genera un thumbnail professionale 400x300px per il gioco Seven.

**Caratteristiche**:
- Gradient background elegante (dark theme)
- Due dadi 3D con ombre e effetti di profondità
- Decorazioni casino-style (chips, bordi, glow effects)
- Testo "SEVEN" e "7" in stile luxury/gold
- Labels "OVER" e "UNDER"

**Utilizzo**:
```bash
cd backend
python scripts/create_seven_thumbnail.py
```

**Output**: Crea `backend/app/games/seven/thumbnail.png`

---

### 3. `create_seven_quests.py`
**Descrizione**: Crea 6 quest specifiche per il gioco Seven.

**Quest Create**:
1. **Seven: First Roll** - Gioca il primo round (10 XP, 5 coins)
2. **Seven: Lucky Roller** - Gioca 10 rounds (25 XP, 15 coins)
3. **Seven: Hot Streak** - Vinci 3 volte di fila (30 XP, 20 coins)
4. **Seven: High Roller** - Raggiungi 500 chips (50 XP, 50 coins)
5. **Seven: All In** - Vinci con una puntata di 50 chips (40 XP, 30 coins)
6. **Seven: Perfect Seven** - Lancia esattamente 7 cinque volte (35 XP, 25 coins)

**Utilizzo**:
```bash
cd backend
python scripts/create_seven_quests.py
```

---

### 4. `check_seven.py`
**Descrizione**: Script di verifica per controllare che il gioco sia registrato correttamente.

**Verifica**:
- Presenza del gioco nel database
- Tutte le XP rules attive
- Esistenza dei file del gioco (HTML/CSS/JS/thumbnail)

**Utilizzo**:
```bash
cd backend
python scripts/check_seven.py
```

---

## 🎮 Setup Completo

Per configurare completamente il gioco Seven, esegui gli script in questo ordine:

```bash
cd backend

# 1. Crea il thumbnail
python scripts/create_seven_thumbnail.py

# 2. Registra il gioco con XP rules
python scripts/register_seven_game.py

# 3. Crea le quest (opzionale)
python scripts/create_seven_quests.py

# 4. Verifica la registrazione
python scripts/check_seven.py
```

## 📊 Struttura del Gioco

```
backend/app/games/seven/
├── index.html          # Entrypoint del gioco
├── main.css            # Stili responsive 3D
├── main.js             # Logica del gioco + integrazione SDK
└── thumbnail.png       # Immagine anteprima (generata)
```

## 🔌 Integrazione Platform SDK

Il gioco Seven è completamente integrato con il Platform SDK:

```javascript
// Caricamento SDK
<script src="../../sdk/platformsdk.js"></script>

// Inizializzazione
PlatformSDK.init({
    onPause: () => { /* pausa gioco */ },
    onResume: () => { /* riprendi gioco */ },
    onExit: () => { /* chiudi gioco */ }
});

// Invio punteggio
PlatformSDK.sendScore(score, {
    rounds: roundsPlayed,
    bank: chipBank,
    winStreak: currentWinStreak
});
```

## 🎯 Categorie e Tags

- **Categoria**: `casino`
- **Tags**: `dice`, `casino`, `3d`, `quick-play`, `luck`, `gambling`
- **Difficoltà**: Easy
- **Età minima**: 18+
- **Featured**: Sì

## ✅ Checklist Post-Setup

Dopo aver eseguito gli script, verifica:

- [ ] Il gioco appare in `/games/list` API
- [ ] Il thumbnail è visibile
- [ ] Le XP rules sono attive
- [ ] Le quest sono disponibili per gli utenti
- [ ] Il gioco è accessibile da: `http://localhost:3000/#/play/seven`

## 🔄 Re-run degli Script

Tutti gli script sono **idempotenti** e possono essere eseguiti più volte:

- `register_seven_game.py`: Sostituisce le XP rules esistenti
- `create_seven_quests.py`: Elimina e ricrea le quest con prefisso "Seven:"
- `create_seven_thumbnail.py`: Sovrascrive il thumbnail esistente

## 📝 Note

- Il gioco usa **CSS 3D transforms** per i dadi (nessuna dipendenza Three.js/WebGL)
- Design completamente **responsive** (mobile + desktop)
- Integrazione completa con sistema di **XP**, **coins**, **leaderboard** e **quest**
- Supporto **pause/resume** dalla piattaforma
