@echo off
title JARVIS Command Center
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  echo   Download the LTS version from https://nodejs.org , install it,
  echo   then double-click "Run JARVIS.bat" again.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo.
  echo   No .env file found - JARVIS will start in DEMO mode with simulated prices.
  echo   See README.md to add your OANDA key.
)

node server.js --open

echo.
echo   JARVIS has stopped.
pause
