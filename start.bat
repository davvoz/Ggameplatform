@echo off
REM HTML5 Game Platform - Start Script
REM This script starts both backend and frontend servers

echo ========================================
echo   HTML5 Game Platform - Startup
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

echo [1/4] Checking Python installation...
python --version
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if virtual environment exists
if not exist "venv\" (
    echo [2/4] Creating virtual environment...
    python -m venv venv
    echo Virtual environment created.
    echo.
) else (
    echo [2/4] Virtual environment already exists.
    echo.
)

REM Activate virtual environment and install dependencies
echo [3/4] Installing backend dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo Dependencies installed.
echo.

REM Start backend server in a new window
echo [4/4] Starting servers...
echo.
start "Game Platform - Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate.bat && echo Backend server starting on http://localhost:8000 && echo API Documentation: http://localhost:8000/docs && echo. && uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window
cd /d "%~dp0frontend"
start "Game Platform - Frontend" cmd /k "cd /d "%~dp0frontend" && echo Frontend server starting on http://localhost:3000 && echo. && python -m http.server 3000"

REM Wait a moment for frontend to start
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Press any key to open the platform in your browser...
pause >nul

REM Open frontend in default browser
start http://localhost:3000

echo.
echo Platform is running!
echo Close the server windows to stop the platform.
echo.
pause
