@echo off
title Paseo AI Development Environment
echo ========================================================
echo   Dang khoi dong Paseo Daemon ^& Web UI...
echo ========================================================
cd /d "D:\code\paseo\packages\server"

:: Kiem tra neu port 6767 chua chay nhung con sot file lock cu thi xoa
netstat -ano | findstr ":6767" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "%USERPROFILE%\.paseo\paseo.pid" del /f /q "%USERPROFILE%\.paseo\paseo.pid" >nul 2>&1
)

:: Bat daemon o che do chay ngam
start "" /B npx tsx scripts/supervisor-entrypoint.ts --dev --web-ui

echo Dang cho server Paseo san sang tren port 6767...
set /a ATTEMPTS=0

:wait_server
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":6767" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto server_ready

set /a ATTEMPTS+=1
if %ATTEMPTS% LSS 15 goto wait_server

:server_ready
start http://localhost:6767

echo.
echo Paseo dang chay tai: http://localhost:6767
echo (Ban co the dong cua so nay hoac de nguyen khi lam viec)
echo ========================================================
exit
