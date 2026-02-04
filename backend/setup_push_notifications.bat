@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ══════════════════════════════════════════════════════════════
echo   🔔 Setup Web Push Notifications
echo ══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python non trovato! Installalo e riprova.
    pause
    exit /b 1
)

echo 📦 Installazione dipendenze...
pip install pywebpush py-vapid --quiet
if errorlevel 1 (
    echo ❌ Errore installazione dipendenze
    pause
    exit /b 1
)
echo ✅ Dipendenze installate

echo.
echo ══════════════════════════════════════════════════════════════
echo   🔑 Generazione chiavi VAPID
echo ══════════════════════════════════════════════════════════════
echo.

:: Generate keys and capture output - use correct py_vapid API
python -c "from py_vapid import Vapid; v = Vapid(); v.generate_keys(); print('PUBLIC=' + v.public_key.public_bytes_raw().hex()); print('PRIVATE=' + v.private_key.private_bytes_raw().hex())" > "%TEMP%\vapid_keys.txt" 2>&1

:: If that fails, try alternative method with base64
if errorlevel 1 (
    python -c "from cryptography.hazmat.primitives.asymmetric import ec; from cryptography.hazmat.backends import default_backend; import base64; k=ec.generate_private_key(ec.SECP256R1(),default_backend()); priv=k.private_numbers().private_value.to_bytes(32,'big'); pub=b'\x04'+k.public_key().public_numbers().x.to_bytes(32,'big')+k.public_key().public_numbers().y.to_bytes(32,'big'); b64=lambda d:base64.urlsafe_b64encode(d).rstrip(b'=').decode(); print('PUBLIC='+b64(pub)); print('PRIVATE='+b64(priv))" > "%TEMP%\vapid_keys.txt" 2>&1
)

if errorlevel 1 (
    echo ❌ Errore generazione chiavi
    type "%TEMP%\vapid_keys.txt"
    pause
    exit /b 1
)

:: Parse keys from output
for /f "tokens=1,* delims==" %%a in ('findstr "PUBLIC=" "%TEMP%\vapid_keys.txt"') do set "VAPID_PUBLIC=%%b"
for /f "tokens=1,* delims==" %%a in ('findstr "PRIVATE=" "%TEMP%\vapid_keys.txt"') do set "VAPID_PRIVATE=%%b"

if "%VAPID_PUBLIC%"=="" (
    echo ❌ Errore: chiave pubblica non generata
    pause
    exit /b 1
)

echo ✅ Chiavi generate!
echo.
echo    Public Key:  %VAPID_PUBLIC:~0,40%...
echo    Private Key: %VAPID_PRIVATE:~0,20%... (nascosta)
echo.

:: Check if .env exists
if not exist ".env" (
    echo ⚠️  File .env non trovato, lo creo da .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
    ) else (
        echo # Backend Environment > .env
    )
)

:: Check if VAPID keys already exist in .env
findstr /C:"VAPID_PUBLIC_KEY=" ".env" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo ⚠️  Chiavi VAPID già presenti in .env
    echo    Vuoi sovrascriverle? (S/N^)
    set /p OVERWRITE="> "
    if /i not "!OVERWRITE!"=="S" (
        echo    Operazione annullata.
        goto :create_table
    )
    :: Remove existing VAPID lines
    powershell -Command "(Get-Content '.env') | Where-Object { $_ -notmatch '^VAPID_' } | Set-Content '.env.tmp'; Move-Item -Force '.env.tmp' '.env'"
)

:: Append VAPID keys to .env
echo.>> .env
echo # Web Push Notifications (VAPID) - Generated %date% %time%>> .env
echo VAPID_PUBLIC_KEY=%VAPID_PUBLIC%>> .env
echo VAPID_PRIVATE_KEY=%VAPID_PRIVATE%>> .env
echo VAPID_CLAIMS_EMAIL=mailto:admin@cur8.fun>> .env

echo ✅ Chiavi aggiunte a .env

:create_table
echo.
echo ══════════════════════════════════════════════════════════════
echo   📊 Creazione tabella database
echo ══════════════════════════════════════════════════════════════
echo.

python scripts\add_push_subscriptions_table.py
if errorlevel 1 (
    echo ⚠️  Tabella verrà creata all'avvio dell'applicazione
)

echo.
echo ══════════════════════════════════════════════════════════════
echo   ✅ SETUP COMPLETATO!
echo ══════════════════════════════════════════════════════════════
echo.
echo   Le chiavi VAPID sono state salvate in: backend\.env
echo.
echo   📋 Prossimi passi:
echo      1. Riavvia il backend: .\start.bat
echo      2. Testa le notifiche dal browser
echo      3. Per produzione, copia le chiavi nel server
echo.
echo   🔗 Endpoints disponibili:
echo      GET  /push/vapid-public-key  - Ottieni chiave pubblica
echo      POST /push/subscribe         - Registra subscription
echo      POST /push/test/{user_id}    - Test notifica
echo.

:: Cleanup
del "%TEMP%\vapid_keys.txt" 2>nul

pause
