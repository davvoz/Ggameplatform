@echo off
REM HTML5 Game Platform - Stop Script
REM This script stops all running servers

echo ========================================
echo   Stopping Game Platform Servers
echo ========================================
echo.

REM Kill backend server (uvicorn)
echo Stopping backend server...
taskkill /FI "WindowTitle eq Game Platform - Backend*" /T /F >nul 2>&1

REM Kill frontend server (http.server)
echo Stopping frontend server...
taskkill /FI "WindowTitle eq Game Platform - Frontend*" /T /F >nul 2>&1

REM Also kill any Python processes running http.server or uvicorn
taskkill /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq *http.server*" /F >nul 2>&1
taskkill /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq *uvicorn*" /F >nul 2>&1

echo.
echo All servers stopped.
echo.
pause
