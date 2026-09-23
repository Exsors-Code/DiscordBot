@echo off
title GrowExs Auto Push
color 0A
cd /d "%~dp0"

echo ========================================
echo   GrowExs Auto Push - Commit & Push
echo ========================================
echo.

:loop
REM === Set timestamp dengan format DD/MM/YYYY HH.MM.SS,MS ===
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
REM Ambil milidetik dari %time:~-2%
set "MS=%time:~-2%"

REM Format: Exs - DD/MM/YYYY HH.MM.SS,MS
set "COMMIT_MSG=Exs - %DD%/%MM%/%YYYY% %HH%.%MI%.%SS%,%MS%"

echo [%COMMIT_MSG%] Cek perubahan...
git add .

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
    echo.
    echo [ERROR] Push gagal! Cek koneksi/token.
) else (
    echo.
    echo [OK] Berhasil push: %COMMIT_MSG%
)

echo.
echo Tunggu 30 detik sebelum cek lagi...
timeout /t 30 /nobreak >nul
goto loop