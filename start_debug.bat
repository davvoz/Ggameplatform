@echo off
echo ========================================
echo   🐛 DEBUG MODE - Ggameplatform
echo ========================================
echo.
echo Starting Backend with debugpy (VS Code compatible)...
echo.
echo 📌 To debug:
echo    1. Set breakpoints in VS Code
echo    2. Press F5 and select "Python: Attach" 
echo       OR the process will stop at breakpoints automatically
echo.
echo 🌐 Backend: http://localhost:8000
echo 🌐 Frontend: http://localhost:3000
echo.
echo ========================================

cd /d "%~dp0"

REM Activate virtual environment
call backend\.venv\Scripts\activate.bat

REM Start frontend in background
start "Frontend Server" cmd /k "cd frontend && python -m http.server 3000"

REM Start backend with debugpy for VS Code debugging
echo.
echo 🚀 Starting Backend (uvicorn with reload)...
echo    Press Ctrl+C to stop
echo.
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
