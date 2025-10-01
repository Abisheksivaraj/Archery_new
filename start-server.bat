@echo off
title Lucas Production Server
color 0A
cls
echo ========================================
echo   LUCAS PRODUCTION SERVER
echo ========================================
echo.

REM Navigate to backend directory - UPDATED PATH
cd /d "C:\Projects\Lucas\backend"

REM Check if MongoDB is running
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo ❌ MongoDB is not running!
    echo Starting MongoDB service...
    net start MongoDB
    timeout /t 3 >nul
)

echo ✅ MongoDB is running
echo.
echo Starting server...
echo.

set NODE_ENV=production
node server.js

pause