@echo off
title Menjalankan Website PT HKSI
echo ========================================================
echo   PT HASTA KARYA SEJAHTERA INDONESIA (HKSI)
echo   Memulai Server Website Lokal...
echo ========================================================
echo.
cd /d "%~dp0"
node server.js
pause
