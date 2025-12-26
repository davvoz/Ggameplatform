# 🎲 Yatzi 3D - Quick Setup Guide

## Setup Rapido (3 minuti)

### 1. Esegui lo script di setup
```bash
cd backend
python scripts/setup_yatzi_3d.py
```

Questo script automaticamente:
- ✅ Registra il gioco nel database
- ✅ Crea il thumbnail
- ✅ Configura le regole XP
- ✅ Crea le quest

### 2. Riavvia il backend
```bash
# Ferma il server se è in esecuzione
# Poi riavvia
python -m uvicorn app.main:app --reload
```

### 3. Testa il gioco
Apri nel browser: `http://localhost:8000/app/games/yatzi_3d_by_luciogiolli/`

## Verifica Integrazione

### Console Browser
Dovresti vedere:
```
📡 Platform SDK initialized for Yatzi 3D
🎮 Game session started for Yatzi 3D
📊 Score sent: Player=XXX, AI=YYY
```

### Database
Controlla che esistano:
- Record in `games` con game_id='yatzi_3d'
- Record in `xp_rules` per yatzi_3d
- Record in `quests` per yatzi_3d
- Thumbnail in `app/static/game_thumbnails/yatzi_3d.png`

## File Modificati

### Gioco
- ✅ `main.js` - SDK integration
- ✅ `index.html` - SDK script

### Script
- ✅ `setup_yatzi_3d.py` - Master setup
- ✅ `create_yatzi_thumbnail.py` - Genera thumbnail
- ✅ `create_yatzi_xp_rules.py` - Regole XP
- ✅ `create_yatzi_quests.py` - Quest

### Documentazione
- ✅ `README.md` - Documentazione completa

## Caratteristiche Implementate

### SDK Integration ✅
- Inizializzazione automatica
- Apertura sessione al primo lancio
- Invio score alla fine del gioco
- Tracking dati extra (AI score, winner)

### Database Setup ✅
- 9 regole XP (20-100 XP per game)
- 10 quest progressive
- Thumbnail professionale 400x300
- Metadati gioco completi

### Tracking ✅
- Punteggio giocatore
- Punteggio AI
- Vincitore
- Round completati

## Pronto! 🎉

Il gioco è ora completamente integrato nella piattaforma!

---
Per dettagli completi, vedi [README.md](README.md)
