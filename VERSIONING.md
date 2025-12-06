# Sistema di Versionamento Automatico PWA

## 📋 Panoramica

Il sistema di versionamento automatico per Cur8 Game Platform gestisce il versioning semantico (SemVer) e notifica automaticamente i client PWA quando è disponibile una nuova versione.

## 🔧 Componenti

### 1. File di Versione (`version.json`)
Contiene:
- **version**: Versione corrente (formato: major.minor.patch)
- **timestamp**: Data e ora dell'ultimo aggiornamento
- **buildNumber**: Numero progressivo di build
- **changelog**: Storico delle ultime 10 versioni con modifiche

### 2. GitHub Action (`version-bump.yml`)
Si attiva ad ogni push su master e:
- Analizza i commit per determinare il tipo di aggiornamento
- Incrementa la versione seguendo Semantic Versioning
- Aggiorna `version.json` e `manifest.json`
- Crea un commit con il nuovo numero di versione

#### Regole di Versionamento

**MAJOR (x.0.0)** - Cambiamenti incompatibili:
- Commit con `breaking`, `!:`, o `major:`
- Esempio: "breaking: redesign API"

**MINOR (0.x.0)** - Nuove funzionalità compatibili:
- Commit con `feat:`, `feature:`, `add`, o `new`
- Esempio: "feat: add new game mode"

**PATCH (0.0.x)** - Bug fix e piccoli miglioramenti:
- Commit con `fix:`, `bug`, `hotfix`
- Qualsiasi altro commit
- Esempio: "fix: resolve login issue"

### 3. Service Worker Aggiornato (`frontend/sw.js`)
- Carica la versione da `version.json` all'installazione
- Controlla aggiornamenti ogni 5 minuti
- Notifica i client quando è disponibile una nuova versione
- Include il changelog nella notifica

### 4. Notifiche Client (`frontend/index.html`)
- Mostra un banner elegante con:
  - Versione corrente → Nuova versione
  - Lista delle modifiche principali
  - Pulsanti "Aggiorna" e "Dopo"

## 🚀 Come Funziona

### Workflow Automatico

```
1. Developer fa push su master
   ↓
2. GitHub Action: version-bump.yml
   - Analizza i commit
   - Incrementa la versione
   - Aggiorna version.json e manifest.json
   - Commit del nuovo numero di versione
   ↓
3. GitHub Action: deploy.yml
   - Attende completamento version-bump
   - Esegue il deploy su Hetzner
   ↓
4. Service Worker (sui client)
   - Rileva nuovo sw.js
   - Controlla version.json
   - Notifica i client
   ↓
5. Client
   - Visualizza notifica aggiornamento
   - Utente clicca "Aggiorna"
   - App si ricarica con nuova versione
```

## 📝 Esempi di Commit

### Per incrementare PATCH (0.0.x):
```bash
git commit -m "fix: correzione bug nel leaderboard"
git commit -m "aggiornamento stili navbar"
```

### Per incrementare MINOR (0.x.0):
```bash
git commit -m "feat: aggiunto nuovo gioco Space Invaders"
git commit -m "add support for multiplayer mode"
```

### Per incrementare MAJOR (x.0.0):
```bash
git commit -m "breaking: nuovo sistema di autenticazione"
git commit -m "major: migrazione a nuova API v2"
```

### Per saltare il versionamento:
```bash
git commit -m "docs: aggiornamento README [skip-version]"
```

## 🎨 Interfaccia Utente

La notifica di aggiornamento appare in alto al centro con:
- Design accattivante con gradiente viola
- Informazioni sulla versione
- Lista delle novità principali
- Animazione di ingresso fluida
- Pulsanti chiari per l'azione

## 🔍 Monitoraggio

### Visualizzare la versione corrente:
```bash
cat version.json
```

### Controllare il changelog:
Il file `version.json` mantiene lo storico delle ultime 10 versioni con le relative modifiche.

### Log del Service Worker:
Aprire DevTools Console per vedere:
- `[Service Worker] Loaded version: x.x.x`
- `[Service Worker] New version available: x.x.x (current: x.x.x)`

## 🛠️ Manutenzione

### Modificare la versione manualmente:
```bash
# Editare version.json
nano version.json

# Committare con [skip-version] per evitare auto-increment
git add version.json
git commit -m "chore: reset version [skip-version]"
```

### Forzare un tipo di versione specifico:
Usare keywords nei commit message come mostrato sopra.

## 📊 Struttura File

```
Ggameplatform/
├── version.json                      # File di versione principale
├── .github/
│   └── workflows/
│       ├── version-bump.yml          # Action versionamento
│       └── deploy.yml                # Action deploy (aggiornata)
└── frontend/
    ├── manifest.json                 # Include versione
    ├── sw.js                         # Service Worker con check versione
    └── index.html                    # UI notifiche aggiornamento
```

## ✅ Vantaggi

1. **Automatico**: Nessun intervento manuale necessario
2. **Intelligente**: Determina automaticamente il tipo di aggiornamento
3. **Trasparente**: Gli utenti vedono esattamente cosa è cambiato
4. **Affidabile**: Segue standard SemVer
5. **Tracciabile**: Storico completo nel changelog
6. **User-Friendly**: Notifiche eleganti e non invasive

## 🔐 Sicurezza

- Il workflow usa `GITHUB_TOKEN` per il commit automatico
- Le notifiche vengono mostrate solo per versioni verificate
- Il Service Worker valida sempre la risposta del server

## 🎯 Best Practices

1. Usa commit messages descrittivi
2. Segui le convenzioni di commit (fix:, feat:, breaking:)
3. Testa localmente prima del push
4. Monitora i log del Service Worker
5. Verifica la notifica su diversi dispositivi
