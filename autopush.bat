@echo off
git add .
git diff --cached --quiet
if %errorlevel%==0 (
  echo Tidak ada perubahan, skip.
  exit /b 0
)
git commit -m "Exs - %date% %time%"
git push
exit /b 0
// r