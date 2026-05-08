@echo off
echo ==========================================
echo   TechMate Windows Server 启动脚本
echo ==========================================

cd /d %~dp0..

echo 正在停止旧服务...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 启动 ChromaDB Server (端口 8000)...
start "ChromaDB" cmd /c "python -m chroma run --host localhost --port 8000 --path ./data/chroma"
timeout /t 5 /nobreak >nul

echo 启动 MCP 服务 (端口 3002)...
cd packages\mcp-bailian-rag
start "MCP Service" cmd /c "node dist/http-server.js"
cd ..\..

echo 启动 ChromaDB Web UI (端口 3001)...
cd chroma-web-ui
start "ChromaDB UI" cmd /c "pnpm dev"
cd ..

echo 启动 Web 服务 (端口 3000)...
cd packages\web
start "Web Service" cmd /c "pnpm dev"
cd ..\..

echo.
echo ==========================================
echo   所有服务已启动！
echo ==========================================
echo.
echo 服务列表：
echo   - Web 服务:       http://localhost:3000
echo   - ChromaDB:       http://localhost:8000
echo   - ChromaDB UI:    http://localhost:3001
echo   - MCP 服务:       http://localhost:3002
echo.
echo 提示：各服务窗口会自动打开，请勿关闭
echo.
pause