@echo off
setlocal
cd /d "%~dp0"

echo [update-works] Regenerating puzzle manifest from the local illustration site...
call node scripts/sync-works-local.mjs
if errorlevel 1 (
    echo [update-works] Manifest generation failed.
    pause
    exit /b 1
)

REM Stage only the generated manifest.
git add src/data/works.generated.json

REM Stop early if nothing changed.
git diff --cached --quiet -- src/data/works.generated.json
if not errorlevel 1 (
    echo [update-works] No changes in the works manifest. Nothing to push.
    pause
    exit /b 0
)

echo [update-works] Validating with a production build...
call npm run build
if errorlevel 1 (
    echo [update-works] Build failed. Aborting before commit.
    git reset src/data/works.generated.json
    pause
    exit /b 1
)

REM The build's prebuild may rewrite the manifest; re-stage to capture the final state.
git add src/data/works.generated.json

git commit -m "chore: update works manifest from local illustration site (%date%)"
if errorlevel 1 (
    echo [update-works] Commit failed.
    pause
    exit /b 1
)

echo [update-works] Pushing to GitHub...
git push
if errorlevel 1 (
    echo [update-works] Push failed. Resolve the issue and run 'git push' manually.
    pause
    exit /b 1
)

echo [update-works] Done. GitHub Actions will redeploy the site shortly.
pause
endlocal
