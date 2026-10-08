@echo off
title Paseo AI Development Environment
echo ========================================================
echo   Dang khoi dong Paseo Daemon & Web UI...
echo ========================================================
cd /d "D:\code\paseo\packages\server"

:: Bat daemon o che do chay ngam
start "" /B npx tsx scripts/supervisor-entrypoint.ts --dev --web-ui

:: Doi 2 giay cho server khoi dong roi tu dong mo trinh duyet
timeout /t 2 /nobreak >nul
start http://localhost:6767

echo.
echo Paseo dang chay tai: http://localhost:6767
echo (Ban co the dong cua so nay hoac de nguyen khi lam viec)
echo ========================================================
exit
