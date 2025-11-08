@echo off
REM Register the Space Clicker sample game in the platform

echo ========================================
echo   Registering Sample Game
echo ========================================
echo.

cd /d "%~dp0backend"

REM Check if virtual environment exists
if not exist "venv\" (
    echo ERROR: Virtual environment not found
    echo Please run start.bat first to set up the environment
    pause
    exit /b 1
)

REM Activate virtual environment and run registration script
call venv\Scripts\activate.bat
python register_sample_game.py

echo.
echo ========================================
echo.

pause
