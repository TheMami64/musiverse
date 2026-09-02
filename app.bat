@echo off
title Musiverse
cd /d "%~dp0"
echo Musiverse sunucusu baslatiliyor...

start "Musiverse" /b cmd /c "node server.js"
echo Tarayicida localhost:8080 aciliyor...
start "" "http://localhost:8080/"

echo.
echo Kapatmak icin bu pencereyi kapat veya Ctrl+C'ye bas.
pause >nul
taskkill /F /IM node.exe >nul 2>&1
echo Sunucu sonlandirildi.
exit