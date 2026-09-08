@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ==============================================
echo   PairChat - First-time setup
echo ==============================================

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js was not found on PATH. Install Node.js 18+ and try again.
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm was not found on PATH. Install Node.js 18+ and try again.
    exit /b 1
)

echo.
echo [1/5] Installing backend dependencies...
pushd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend "npm install" failed.
    popd
    exit /b 1
)
popd

echo.
echo [2/5] Preparing backend\.env...
if not exist "backend\.env" (
    copy /Y "backend\.env.example" "backend\.env" >nul
    for /f "delims=" %%S in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set JWT_SECRET_VALUE=%%S
    powershell -NoProfile -Command ^
        "(Get-Content 'backend\.env') -replace 'JWT_SECRET=.*', 'JWT_SECRET=!JWT_SECRET_VALUE!' | Set-Content 'backend\.env'"
    echo   Created backend\.env with a random JWT_SECRET.
    echo   IMPORTANT: edit backend\.env and set USER1_PASSWORD / USER2_PASSWORD
    echo   to real passwords before you use this for anything but a quick test.
) else (
    echo   backend\.env already exists, leaving it as-is.
)

echo.
echo [3/5] Seeding the two chat accounts...
pushd backend
call npm run seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Seeding failed. Check backend\.env and try again.
    popd
    exit /b 1
)
popd

echo.
echo [4/5] Installing frontend dependencies...
pushd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend "npm install" failed.
    popd
    exit /b 1
)
popd

echo.
echo [5/5] Preparing frontend\.env...
if not exist "frontend\.env" (
    copy /Y "frontend\.env.example" "frontend\.env" >nul
    echo   Created frontend\.env
) else (
    echo   frontend\.env already exists, leaving it as-is.
)

echo.
echo ==============================================
echo   Setup complete. Run run.bat to start PairChat.
echo ==============================================

endlocal
