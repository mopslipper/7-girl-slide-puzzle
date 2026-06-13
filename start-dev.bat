@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
    echo [start-dev] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [start-dev] npm install failed.
        pause
        exit /b 1
    )
)

echo [start-dev] Starting Astro dev server...
call npm run dev

endlocal
