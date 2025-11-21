# 🚀 Deployment Configuration Guide

Questa guida spiega come configurare l'applicazione per ambienti di sviluppo e produzione.

## 📋 Indice

1. [Configurazione Frontend](#configurazione-frontend)

2. [Configurazione Backend](#configurazione-backend)

3. [Deployment in Produzione](#deployment-in-produzione)

---

## 🎨 Configurazione Frontend

### Sviluppo (Locale)

#### Opzione 1: Senza Build Tool (HTML statico)

Crea il file `frontend/env.js`:

```javascript
window.ENV = {
    API_URL: 'http://localhost:8000',
    FRONTEND_URL: 'http://localhost:3000',
    MODE: 'development'
};
```

Poi aggiungi nel tuo HTML **PRIMA** di altri script:

```html
<script src="/env.js"></script>
<script type="module" src="/js/main.js"></script>
```

#### Opzione 2: Con Build Tool (Vite, Webpack, etc.)

Crea il file `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_FRONTEND_URL=http://localhost:3000
VITE_MODE=development
```

### Produzione

#### Opzione 1: Senza Build Tool

Crea `frontend/env.js` con i tuoi domini:

```javascript
window.ENV = {
    API_URL: 'https://api.tuodominio.com',
    FRONTEND_URL: 'https://tuodominio.com',
    MODE: 'production'
};
```

#### Opzione 2: Con Build Tool

Crea `frontend/.env.production`:

```env
VITE_API_URL=https://api.tuodominio.com
VITE_FRONTEND_URL=https://tuodominio.com
VITE_MODE=production
```

---

## ⚙️ Configurazione Backend

### Sviluppo (Locale)

Crea il file `backend/.env`:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000
```

### Produzione

Crea `backend/.env` o imposta le variabili d'ambiente sul server:

```env
ALLOWED_ORIGINS=https://tuodominio.com,https://www.tuodominio.com,https://api.tuodominio.com
```

---

## 🌐 Deployment in Produzione

### 1. Preparazione Frontend

```bash
cd frontend

# Copia il template
cp env.template.js env.js

# Modifica env.js con i tuoi domini di produzione
# nano env.js  (Linux/Mac)
# notepad env.js  (Windows)
```

Esempio `env.js` produzione:

```javascript
window.ENV = {
    API_URL: 'https://api.tuodominio.com',
    FRONTEND_URL: 'https://tuodominio.com',
    MODE: 'production'
};
```

### 2. Preparazione Backend

```bash
cd backend

# Imposta variabile d'ambiente
export ALLOWED_ORIGINS="https://tuodominio.com,https://www.tuodominio.com"

# Oppure crea .env
echo 'ALLOWED_ORIGINS=https://tuodominio.com,https://www.tuodominio.com' > .env
```

### 3. Verifica HTML

Assicurati che tutti i file HTML includano `env.js`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Game Platform</title>
    <!-- IMPORTANTE: Carica env.js PRIMA di altri script -->
    <script src="/env.js"></script>
</head>
<body>
    <!-- contenuto -->
    <script type="module" src="/js/main.js"></script>
</body>
</html>
```

### 4. Deploy

#### Backend (FastAPI)

```bash
# Con uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Oppure con gunicorn (produzione)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend

Carica i file sul tuo server web (Nginx, Apache, etc.) assicurandoti che:

- `env.js` sia presente e configurato
- Il server serva i file statici correttamente
- HTTPS sia attivo (raccomandato)

---

## 🔍 Troubleshooting

### ❌ CORS Errors

Se vedi errori CORS:

1. Verifica che `ALLOWED_ORIGINS` nel backend includa il tuo dominio frontend
2. Controlla che non ci siano spazi extra nei domini
3. Assicurati di includere sia `http://` che `https://` se necessario

### ❌ API Not Found (404)

Se le chiamate API falliscono:

1. Controlla che `env.js` sia caricato (apri console browser)
2. Verifica che `API_URL` in `env.js` sia corretto
3. Testa l'endpoint API direttamente: `https://api.tuodominio.com/health`

### ❌ env.js Non Caricato

Se `window.ENV` è undefined:

1. Verifica che `<script src="/env.js"></script>` sia nel HTML
2. Controlla che `env.js` sia nella root del frontend
3. Controlla la console browser per errori di caricamento

---

## 📝 Note

- **NON committare** file `.env` o `env.js` con credenziali reali su Git
- I file `.example` sono template sicuri da committare
- In produzione, usa HTTPS per sicurezza
- Configura le variabili d'ambiente a livello di sistema/server quando possibile

---

## 🔐 Sicurezza

Per produzione:

1. Usa HTTPS (non HTTP)
2. Configura CORS con domini specifici (non usare `*`)
3. Non esporre chiavi API o credenziali nel frontend
4. Considera l'uso di un reverse proxy (Nginx)
5. Abilita rate limiting
6. Usa variabili d'ambiente di sistema invece di file `.env` quando possibile

---

## 📚 Risorse

- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [Deployment Best Practices](https://fastapi.tiangolo.com/deployment/)
- [Environment Variables](https://12factor.net/config)
