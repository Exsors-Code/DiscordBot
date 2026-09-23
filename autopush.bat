@echo off
title GrowExs Auto Push
color 0A
cd /d "%~dp0"

echo ========================================
echo   GrowExs Auto Push - Only When Changed
echo ========================================
echo.

:loop
REM === Buat timestamp format DD/MM/YYYY HH.MM.SS,MS ===
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

REM === Cek apakah ada perubahan SEBELUM add ===
git diff --quiet && git diff --cached --quiet
if %errorlevel%==0 (
    REM Cek juga untracked files
    for /f %%i in ('git ls-files --others --exclude-standard') do (
        goto :has_changes
    )
    echo [%COMMIT_MSG%] Tidak ada perubahan. Skip.
    echo.
    timeout /t 15 /nobreak >nul
    goto loop
)

:has_changes
echo [%COMMIT_MSG%] Ada perubahan! Push...
echo.

REM === Stage semua & bersihkan file yang di-ignore dari staging ===
git add .

REM Unstage file yang di-ignore kalau ada yang lolos
for /f "delims=" %%f in ('git diff --cached --name-only --diff-filter=ACM') do (
    git check-ignore -q "%%f" 2>nul
    if not errorlevel 1 (
        echo   [BLOCKED] %%f - di-unstage
        git reset HEAD "%%f" >nul 2>&1
    )
)

REM === Cek lagi apakah masih ada yang di-stage ===
git diff --cached --quiet
if %errorlevel%==0 (
    echo Semua file yang berubah di-ignore. Skip commit.
    echo.
    timeout /t 15 /nobreak >nul
    goto loop
)

REM === Commit & Push ===
git commit -m "%COMMIT_MSG%"
git push

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push gagal! Cek koneksi/token.
) else (
    echo.
    echo [OK] Push berhasil: %COMMIT_MSG%
)

echo.
echo Tunggu 15 detik...
timeout /t 15 /nobreak >nul
goto loop