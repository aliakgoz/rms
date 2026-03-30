@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  call npm install
)
if not defined PORT set PORT=3210
if not defined RMS_BACKEND_MODE set RMS_BACKEND_MODE=shared-file
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-rms.ps1"
set "exitcode=%ERRORLEVEL%"
endlocal
exit /b %exitcode%
