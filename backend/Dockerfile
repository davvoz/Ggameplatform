FROM python:3.11-slim

WORKDIR /app

# Dipendenze bloccate con hash (requirements.lock, generato da requirements.txt:
# vedi l'intestazione del file). Solo wheel già compilate, quindi niente gcc e
# nessuno script di setup eseguito; le uniche eccezioni sono http-ece e
# py-vapid, che su PyPI esistono solo come sorgente (Python puro).
COPY requirements.lock .
RUN pip install --no-cache-dir --require-hashes \
    --only-binary :all: --no-binary http-ece,py-vapid \
    -r requirements.lock

# Copia l'applicazione (include sdk/ che è già in backend/sdk)
COPY . .

# Crea le directory necessarie
RUN mkdir -p /app/app/games /app/app/static

# Esponi porta
EXPOSE 8000

# Comando di avvio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
