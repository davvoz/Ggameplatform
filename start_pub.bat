@echo off
REM HTML5 Game Platform - Start Script (LAN Version)
REM This script starts both backend and frontend servers accessible from local network

echo ========================================
echo   HTML5 Game Platform - LAN Startup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/5] Checking Python installation...
python --version
echo.

REM Get local IP address
echo [2/5] Detecting local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4.*192\.168\." /C:"IPv4.*10\." /C:"IPv4.*172\."') do (
    set "IP=%%a"
    goto :found_ip
)
:found_ip
set IP=%IP: =%
if "%IP%"=="" (
    echo WARNING: Could not detect LAN IP, using localhost
    set IP=localhost
)
echo Local IP: %IP%
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if virtual environment exists
if not exist "venv\" (
    echo [3/5] Creating virtual environment...
    python -m venv venv
    echo Virtual environment created.
    echo.
) else (
    echo [3/5] Virtual environment already exists.
    echo.
)

REM Activate virtual environment and install dependencies
echo [4/5] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo Dependencies installed.
echo.

REM Configure CORS for LAN access - allow all local network origins
REM (Configuration is now in backend/.env file)

REM Start backend server in a new window (0.0.0.0 to accept connections from any IP)
echo [5/5] Starting servers...
echo.
start "Game Platform - Backend (LAN)" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate.bat && echo ======================================== && echo Backend server running on LAN && echo ======================================== && echo Local:   http://localhost:8000 && echo Network: http://%IP%:8000 && echo API Docs: http://%IP%:8000/docs && echo CORS: Allowing all LAN origins (.env) && echo. && uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window (0.0.0.0 to accept connections from any IP)
cd /d "%~dp0frontend"
start "Game Platform - Frontend (LAN)" cmd /k "cd /d "%~dp0frontend" && echo ======================================== && echo Frontend server running on LAN && echo ======================================== && echo Local:   http://localhost:3000 && echo Network: http://%IP%:3000 && echo. && python -m http.server 3000 --bind 0.0.0.0"

REM Wait for frontend to start
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Servers Started on LAN!
echo ========================================
echo.
echo ACCESSO DAL PC:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo ACCESSO DAL TELEFONO (stessa rete WiFi):
echo   Frontend: http://%IP%:3000
echo   Backend:  http://%IP%:8000
echo   API Docs: http://%IP%:8000/docs
echo.
echo Apri http://%IP%:3000 sul browser del telefono
echo.
echo Press any key to open the platform...
pause >nul

REM Open frontend in default browser
start http://localhost:3000

echo.
echo Platform is running on LAN!
echo Close the server windows to stop the platform.
echo.
pause
