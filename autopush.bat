@echo off
title GrowExs Auto Push (Safe)
color 0A
cd /d "%~dp0"

echo ========================================
echo   GrowExs Auto Push - Safe Mode
echo ========================================
echo.

:loop
REM Format timestamp
for /f "tokens=1-4 delims=/:, " %%a in ("%date% %time%") do (
    set "DD=%%a"
    set "MM=%%b"
    set "YYYY=%%c"
    set "REST=%%d"
)
for /f "tokens=1-3 delims=.," %%a in ("%REST%") do (
    set "HH=%%a"
    set "MI=%%b"
    set "SS=%%c"
)
set "MS=%time:~-2%"
set "COMMIT_MSG=Exs - %DD%/%MM%/%YYYY% %HH%.%MI%.%SS%,%MS%"

echo [%COMMIT_MSG%] Cek perubahan...

REM Bersihkan file yang di-ignore dari staging
for /f "delims=" %%f in ('git diff --cached --name-only --diff-filter=ACM') do (
    git check-ignore -q "%%f" 2>nul
    if not errorlevel 1 (
        echo   [BLOCKED] %%f
        git reset HEAD "%%f" >nul 2>&1
    )
)

git add .

REM Cek lagi apakah masih ada yang lolos
git diff --cached --name-only | findstr /i ".db$ .env$" >nul
if not errorlevel 1 (
    echo [WARN] Ada file .db/.env terdeteksi, unstage...
    git reset HEAD *.db *.env 2>nul
    git reset HEAD "*.db-shm" "*.db-wal" 2>nul
)

REM Cek apakah ada perubahan
git diff --cached --quiet
if %errorlevel%==0 (
    echo Tidak ada perubahan, skip.
    timeout /t 30 /nobreak >nul
    goto loop
)

echo Ada perubahan! Commit ^& push...
git commit -m "%COMMIT_MSG%"
git push

if %errorlevel% neq 0 (
    echo [ERROR] Push gagal!
) else (
    echo [OK] Push: %COMMIT_MSG%
)

echo.
echo Tunggu 30 detik...
timeout /t 30 /nobreak >nul
goto loop