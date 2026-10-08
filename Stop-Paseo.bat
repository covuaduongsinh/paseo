@echo off
title Dung Paseo
echo ========================================================
echo   Dang dung toan bo tien trinh Paseo...
echo ========================================================

:: Tim va kill cac tien trinh Node chay Paseo tren port 6767
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":6767" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Da tat thanh cong Paseo Daemon va giai phong tai nguyen!
echo ========================================================
timeout /t 2 >nul
exit
