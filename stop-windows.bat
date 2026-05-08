@echo off
echo ==========================================
echo   TechMate Windows Server 停止脚本
echo ==========================================

echo 正在停止所有服务...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul

echo.
echo 所有服务已停止
pause