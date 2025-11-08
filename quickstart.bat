@echo off
REM HTML5 Game Platform - Complete Setup & Start
REM This script sets up everything and registers the sample game

echo ========================================
echo   HTML5 Game Platform - Complete Setup
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

echo [1/6] Checking Python installation...
python --version
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if virtual environment exists
if not exist "venv\" (
    echo [2/6] Creating virtual environment...
    python -m venv venv
    echo Virtual environment created.
    echo.
) else (
    echo [2/6] Virtual environment already exists.
    echo.
)

REM Activate virtual environment and install dependencies
echo [3/6] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo Dependencies installed.
echo.

REM Start backend server in a new window
echo [4/6] Starting backend server...
start "Game Platform - Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate.bat && echo Backend server starting on http://localhost:8000 && echo API Documentation: http://localhost:8000/docs && echo. && uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Register sample game
echo [5/6] Registering sample game...
python register_sample_game.py
echo.

REM Start frontend server in a new window
echo [6/6] Starting frontend server...
cd /d "%~dp0frontend"
start "Game Platform - Frontend" cmd /k "cd /d "%~dp0frontend" && echo Frontend server starting on http://localhost:3000 && echo. && python -m http.server 3000"

REM Wait for frontend to start
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Platform Ready!
echo ========================================
echo.
echo Backend:      http://localhost:8000
echo API Docs:     http://localhost:8000/docs
echo Frontend:     http://localhost:3000
echo.
echo Sample Game:  http://localhost:3000/#/play/space-clicker
echo Game Catalog: http://localhost:3000
echo.
echo Press any key to open the platform...
pause >nul

REM Open the catalog page
start http://localhost:3000

echo.
echo Platform is running with sample game!
echo.
echo To stop the platform:
echo   - Run stop.bat, or
echo   - Close the server windows
echo.
pause
