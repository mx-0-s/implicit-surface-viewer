@echo off
chcp 65001 >nul
title 三维隐函数曲面绘制器
echo ========================================
echo   三维隐函数曲面绘制器 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

REM 检查 Python 是否可用
where python >nul 2>nul
if %errorlevel%==0 (
    echo [1/2] 使用 Python 启动本地服务器...
    start "" http://localhost:8000
    python -m http.server 8000
    goto :end
)

REM 检查 Node.js 是否可用
where node >nul 2>nul
if %errorlevel%==0 (
    echo [1/2] 使用 Node.js 启动本地服务器...
    start "" http://localhost:8000
    npx --yes serve -l 8000
    goto :end
)

echo [错误] 未检测到 Python 或 Node.js，无法启动服务器。
echo.
echo 请安装 Python 或 Node.js 后重试。
echo 或者直接双击打开 index.html（但 ES Module 可能被浏览器阻止）。
pause

:end