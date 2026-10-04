@echo off
chcp 65001 >nul
title 三维隐函数曲面绘制器
echo ========================================
echo   三维隐函数曲面绘制器 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"