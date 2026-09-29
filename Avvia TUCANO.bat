@echo off
title TUCANO
cd /d "%~dp0"
if not exist node_modules (
  echo Prima installazione: scarico le dipendenze...
  call npm install
)
rem Chiude un'eventuale istanza precedente ancora aperta sulla porta 3001.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>&1
echo Preparo TUCANO...
call npx vite build --logLevel error
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3001"
echo.
echo  TUCANO e' attivo su http://localhost:3001  -  chiudi questa finestra per spegnerlo.
echo.
call npm run serve --silent
