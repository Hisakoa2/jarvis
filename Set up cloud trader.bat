@echo off
REM ---------------------------------------------------------------
REM  JARVIS cloud trader - one-time setup
REM  Copies your OANDA details from the .env file into GitHub's
REM  secret storage (encrypted - nobody can read them, not even on
REM  the public repo). After this, JARVIS can trade while your phone is off.
REM ---------------------------------------------------------------
cd /d "%~dp0"
if not exist ".env" (
  echo Can't find the .env file in this folder.
  pause
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if "%%A"=="OANDA_API_KEY" set "OKEY=%%B"
  if "%%A"=="OANDA_ACCOUNT_ID" set "OACC=%%B"
  if "%%A"=="OANDA_ENV" set "OENV=%%B"
)
if "%OKEY%"=="" ( echo OANDA_API_KEY is missing from .env & pause & exit /b 1 )
if "%OACC%"=="" ( echo OANDA_ACCOUNT_ID is missing from .env & pause & exit /b 1 )
if "%OENV%"=="" set "OENV=practice"
echo Saving your OANDA details as GitHub secrets...
gh secret set OANDA_API_KEY -R Hisakoa2/jarvis -b "%OKEY%" || goto :fail
gh secret set OANDA_ACCOUNT_ID -R Hisakoa2/jarvis -b "%OACC%" || goto :fail
gh secret set OANDA_ENV -R Hisakoa2/jarvis -b "%OENV%" || goto :fail
echo Starting the cloud trader once so you can see it work...
gh workflow run bot.yml -R Hisakoa2/jarvis
echo.
echo Done! JARVIS's cloud trader is on. It checks the market every 10 minutes.
pause
exit /b 0
:fail
echo Something went wrong. Make sure GitHub CLI is signed in (run: gh auth login).
pause
exit /b 1
