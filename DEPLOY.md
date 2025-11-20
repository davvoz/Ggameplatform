# 🚀 Deployment Guide - games.cur8.fun

Guida completa per il deployment su Hetzner Ubuntu con Docker.

## 📋 Informazioni Server

- **IP**: 95.216.27.123
- **OS**: Ubuntu (Linux)
- **Dominio**: games.cur8.fun
- **Hosting**: Hetzner Cloud

---

## 🔧 Setup Iniziale sul Server

### 1. Connessione SSH

```bash
ssh root@95.216.27.123
```

### 2. Installazione Docker (se non già installato)

```bash
# Update package list
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

### 3. Clona il Repository

```bash
cd /opt
git clone https://github.com/davvoz/Ggameplatform.git
cd Ggameplatform
```

### 4. Configura gli Environment

```bash
# Frontend - usa la configurazione production
cp frontend/env.production.js frontend/env.js

# Backend
cp backend/.env.example backend/.env
# Il file .env è già configurato correttamente per production
```

### 5. Prima Build e Avvio

```bash
# Rendi eseguibile lo script di deploy
chmod +x deploy.sh

# Esegui il primo deploy
./deploy.sh
```

---

## 🌐 Configurazione Nginx Reverse Proxy (con SSL)

### 1. Installa Nginx e Certbot

```bash
apt install nginx certbot python3-certbot-nginx -y
```

### 2. Configura Nginx per games.cur8.fun

Crea `/etc/nginx/sites-available/gameplatform`:

```nginx
server {
    listen 80;
    server_name games.cur8.fun;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend root endpoints
    location ~ ^/(games|users|admin|quests|health|docs|openapi.json|sdk|static)/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Attiva il Sito

```bash
ln -s /etc/nginx/sites-available/gameplatform /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 4. Configura SSL con Let's Encrypt

```bash
certbot --nginx -d games.cur8.fun
```

Segui le istruzioni interattive e Certbot configurerà automaticamente HTTPS.

---

## 🔄 Deploy e Aggiornamenti

### Deploy Automatico

Ogni volta che fai modifiche:

```bash
# Sul tuo PC locale
git add .
git commit -m "Your changes"
git push origin master

# Sul server
cd /opt/Ggameplatform
./deploy.sh
```

### Deploy Manuale

```bash
cd /opt/Ggameplatform
git pull origin master
docker-compose up -d --build
```

---

## 🎮 Inizializzazione Database e Giochi

Dopo il primo deploy, popola il database:

```bash
# Entra nel container backend
docker exec -it gameplatform_backend bash

# Vai nella directory scripts
cd scripts

# Registra i giochi
python register_sample_game.py
python register_snake.py
python register_bouncing_balls.py
python register_rainbow_rush.py
python register_space_clicker_phaser.py
python register_zombie_tower.py

# Popola le quest
python populate_quests.py

# Esci dal container
exit
```

---

## 📊 Comandi Utili

### Gestione Container

```bash
# Visualizza i logs
docker-compose logs -f

# Logs solo backend
docker-compose logs -f backend

# Logs solo frontend
docker-compose logs -f frontend

# Riavvia i servizi
docker-compose restart

# Ferma i servizi
docker-compose down

# Rimuovi tutto (inclusi volumi)
docker-compose down -v

# Rebuild completo
docker-compose up -d --build --force-recreate
```

### Accesso ai Container

```bash
# Backend
docker exec -it gameplatform_backend bash

# Frontend
docker exec -it gameplatform_frontend sh
```

### Monitoraggio

```bash
# Status dei container
docker-compose ps

# Uso risorse
docker stats

# Ispeziona un container
docker inspect gameplatform_backend
```

---

## 🛡️ Sicurezza

### 1. Firewall (UFW)

```bash
# Abilita UFW
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable
ufw status
```

### 2. Fail2Ban (opzionale ma raccomandato)

```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

### 3. Aggiornamenti Sistema

```bash
# Aggiornamenti automatici
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

---

## 🔍 Verifica Deployment

Dopo il deployment, verifica che tutto funzioni:

1. **Frontend**: https://games.cur8.fun
2. **Backend API Docs**: https://games.cur8.fun/docs
3. **Health Check**: https://games.cur8.fun/health
4. **Test Game**: https://games.cur8.fun/games/snake/

---

## 🆘 Troubleshooting

### Container non si avvia

```bash
# Verifica i logs
docker-compose logs

# Rimuovi e ricrea
docker-compose down
docker-compose up -d --build
```

### Database locked

```bash
# Ferma i container
docker-compose down

# Controlla che il database non sia corrotto
sqlite3 backend/database.db "PRAGMA integrity_check;"

# Riavvia
docker-compose up -d
```

### Certificato SSL scaduto

```bash
# Rinnova manualmente
certbot renew

# Il rinnovo automatico è configurato via cron
```

### CORS Errors

Verifica che in `backend/.env` ci sia:
```
ALLOWED_ORIGINS=https://games.cur8.fun,https://cur8.fun
```

---

## 📈 Backup

### Backup Automatico del Database

Crea uno script `/opt/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec gameplatform_backend cp /app/database.db /app/backups/database_$DATE.db

# Mantieni solo gli ultimi 30 giorni
find $BACKUP_DIR -name "database_*.db" -mtime +30 -delete

echo "Backup completed: database_$DATE.db"
```

Aggiungi al crontab:

```bash
chmod +x /opt/backup.sh
crontab -e

# Aggiungi questa riga per backup giornaliero alle 3 AM
0 3 * * * /opt/backup.sh
```

---

## 🚀 Deploy Automatico con GitHub Actions (opzionale)

Se vuoi automatizzare il deploy ad ogni push, crea `.github/workflows/deploy.yml` nel repository:

```yaml
name: Deploy to Hetzner

on:
  push:
    branches: [ master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: 95.216.27.123
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/Ggameplatform
            ./deploy.sh
```

Configura il secret `SSH_PRIVATE_KEY` nelle impostazioni del repository GitHub.

---

## ✅ Checklist Deployment

- [ ] Server Hetzner configurato (95.216.27.123)
- [ ] Docker e Docker Compose installati
- [ ] Repository clonato in `/opt/Ggameplatform`
- [ ] File `frontend/env.js` configurato
- [ ] File `backend/.env` configurato
- [ ] Container avviati con `./deploy.sh`
- [ ] Nginx installato e configurato
- [ ] SSL configurato con Certbot
- [ ] Firewall (UFW) abilitato
- [ ] Database inizializzato con giochi e quest
- [ ] Backup automatico configurato
- [ ] Verifica che tutti gli endpoint funzionino

---

## 📞 Supporto

Per problemi o domande:
- Controlla i logs: `docker-compose logs -f`
- Verifica lo stato: `docker-compose ps`
- Controlla Nginx: `nginx -t && systemctl status nginx`

---

**Server**: 95.216.27.123 (Hetzner)  
**Domain**: games.cur8.fun  
**Stack**: Docker + Nginx + Let's Encrypt  
**Repository**: https://github.com/davvoz/Ggameplatform
