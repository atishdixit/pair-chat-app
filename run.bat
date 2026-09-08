@echo off
setlocal

cd /d "%~dp0"

echo ==============================================
echo   PairChat
echo ==============================================

if not exist "backend\node_modules" goto :needsetup
if not exist "frontend\node_modules" goto :needsetup
if not exist "backend\.env" goto :needsetup
goto :run

:needsetup
echo [INFO] First run detected - setting up PairChat...
call "%~dp0setup.bat"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Setup failed, see above. Aborting.
    exit /b 1
)

:run
echo [INFO] Starting backend on http://localhost:4000 ...
start "PairChat Backend" cmd /k "cd /d "%~dp0backend" && npm start"

echo [INFO] Starting frontend on http://localhost:5173 ...
start "PairChat Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [INFO] Waiting for the frontend to come up...
rem "timeout" needs a real console input handle and fails when launched from
rem some shells/shortcuts, so use ping as a portable ~6 second delay instead.
ping -n 7 127.0.0.1 >nul

start "" "http://localhost:5173"

echo.
echo PairChat is running in the two new windows that just opened.
echo Close those windows (or Ctrl+C in each) to stop it.
echo.

endlocal
