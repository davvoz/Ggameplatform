# Rainbow Rush - Backend Integration

Architettura sicura per Rainbow Rush con database persistente e anti-cheat.

## 🏗️ Architettura

### Backend (Completamente Isolato)

```
backend/app/games/rainbow_rush/
├── __init__.py           # Module exports
├── models.py             # SQLAlchemy models (3 tables)
├── repository.py         # Data access layer (Repository Pattern)
├── service.py            # Business logic + Anti-cheat validation
└── router.py             # FastAPI endpoints (REST API)
```

### Frontend (SDK Integrato)

```
backend/app/games/rainbow-rush/js/
└── sdk/
    └── RainbowRushSDK.js # Client SDK per comunicazione sicura
```

## 📊 Database Schema

### 1. `rainbow_rush_progress`
Progresso generale del giocatore:
- Livelli sbloccati
- Monete totali
- Stelle totali
- High score
- Items sbloccati
- Statistiche generali

### 2. `rainbow_rush_level_completions`
Storico completamenti livelli:
- Stelle guadagnate
- Tempo di completamento
- Score
- Obiettivi completati
- **Validazione anti-cheat** (score, flags)

### 3. `rainbow_rush_sessions`
Sessioni di gioco attive:
- Eventi real-time
- Statistiche correnti
- Heartbeat monitoring
- **Rilevamento anomalie**

## 🔐 Sistema Anti-Cheat

### Validazioni Implementate

1. **Tempo di Completamento**
   - Tempo minimo per livello (impossibile < X secondi)
   - Verifica tempi sospetti

2. **Score Validation**
   - Score massimo per livello
   - Prevenzione valori negativi

3. **Session Heartbeat**
   - Heartbeat ogni 10 secondi
   - Rilevamento anomalie timing

4. **Validation Score**
   - Score 0.0-1.0 per ogni completamento
   - Trusted threshold: >= 0.7

## 🚀 Setup

### 1. Creare le tabelle del database

```bash
cd backend
python scripts/create_rainbow_rush_tables.py
```

### 2. Le API sono già registrate

Il router è automaticamente registrato in `main.py`:
- Endpoint: `/api/rainbow-rush/*`
- Documentazione: http://localhost:8000/docs

### 3. Il gioco è già integrato

L'SDK è automaticamente inizializzato nel `GameControllerBuilder`:
- Salvataggio automatico su backend
- Fallback a localStorage se backend non disponibile

## 📡 API Endpoints

### Progress
- `GET /api/rainbow-rush/progress/{user_id}` - Ottieni progresso
- `POST /api/rainbow-rush/progress/{user_id}/save-level` - Salva progresso livello

### Level Completion
- `POST /api/rainbow-rush/completion/{user_id}` - Invia completamento (con validazione)
- `GET /api/rainbow-rush/completion/{user_id}/history` - Storico completamenti

### Session Management
- `POST /api/rainbow-rush/session/{user_id}/start` - Inizia sessione
- `PUT /api/rainbow-rush/session/{session_id}` - Aggiorna sessione (heartbeat)
- `POST /api/rainbow-rush/session/{session_id}/end` - Termina sessione
- `GET /api/rainbow-rush/session/{user_id}/active` - Ottieni sessione attiva

### Health Check
- `GET /api/rainbow-rush/health` - Verifica stato servizio

## 🎮 Uso nel Gioco

### Inizializzazione Automatica

```javascript
// Il GameControllerBuilder inizializza automaticamente l'SDK
const gameController = createGameController(canvas).build();
await gameController.initialize(); // SDK inizializzato qui
```

### LevelManager - Salvataggio Automatico

```javascript
// Salva automaticamente su backend o localStorage come fallback
await levelManager.saveProgress();
await levelManager.loadProgress();
```

### ScoreSystem - High Score Sicuro

```javascript
// High score gestito automaticamente dal backend
await scoreSystem.saveHighScore();
await scoreSystem.loadHighScore();
```

## 🔄 Fallback Strategy

Il sistema ha fallback automatico:

1. **Tentativo 1**: SDK → Backend API
2. **Tentativo 2**: localStorage (se backend non disponibile)

Questo garantisce che il gioco funzioni sempre, anche offline.

## 🧪 Testing

### Test API con curl

```bash
# Health check
curl http://localhost:8000/api/rainbow-rush/health

# Get progress (crea automaticamente se non esiste)
curl http://localhost:8000/api/rainbow-rush/progress/test_user

# Submit completion
curl -X POST http://localhost:8000/api/rainbow-rush/completion/test_user \
  -H "Content-Type: application/json" \
  -d '{
    "level_id": 1,
    "level_name": "Level 1",
    "stars_earned": 3,
    "completion_time": 45.5,
    "score": 5000,
    "level_stats": {"coins_collected": 50}
  }'
```

### Swagger UI

Apri http://localhost:8000/docs per testare tutti gli endpoint.

## 📈 Vantaggi

### Sicurezza
✅ Dati salvati nel database persistente (volume Docker)  
✅ Validazione anti-cheat server-side  
✅ Session tracking con heartbeat  
✅ Impossibile modificare punteggi da console  

### Architettura
✅ **Completamente isolato** dal resto della piattaforma  
✅ SOLID principles (SRP, DIP, OCP)  
✅ Repository Pattern per data access  
✅ Service Layer per business logic  
✅ Clean separation of concerns  

### Scalabilità
✅ Pronto per leaderboard globali  
✅ Supporto multi-utente  
✅ Storico completamenti per analytics  
✅ Estendibile per nuove feature  

### Developer Experience
✅ SDK client semplice e type-safe  
✅ Fallback automatico a localStorage  
✅ Logging completo per debugging  
✅ API REST standard e documentate  

## 🔮 Future Features

- [ ] Leaderboard globale Rainbow Rush
- [ ] Achievements server-side
- [ ] Replay system con validation
- [ ] Anti-cheat machine learning
- [ ] Real-time multiplayer support

## 📝 Note

- Il database è persistente nel volume Docker `game_platform_db`
- L'SDK gestisce automaticamente user ID (da PlatformSDK o anonimo)
- Tutti i metodi SDK sono async/await
- Le validazioni sono configurabili in `service.py`

---

**Creato**: 29 Novembre 2025  
**Versione**: 1.0.0  
**Pattern**: Repository, Service Layer, DI, SOLID
