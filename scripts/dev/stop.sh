#!/bin/bash

set -euo pipefail

echo "🛑 停止所有服务..."

# 从 PID 文件读取 PID 并停止
if [ -f /tmp/mcp-service.pid ]; then
    MCP_PID=$(cat /tmp/mcp-service.pid)
    if kill -0 "$MCP_PID" 2>/dev/null; then
        kill "$MCP_PID" 2>/dev/null || true
        echo "   ✅ MCP 服务已停止 (PID: $MCP_PID)"
    else
        echo "   ⚠️  MCP 服务未运行"
    fi
    rm /tmp/mcp-service.pid
fi

if [ -f /tmp/web-service.pid ]; then
    WEB_PID=$(cat /tmp/web-service.pid)
    if kill -0 "$WEB_PID" 2>/dev/null; then
        kill "$WEB_PID" 2>/dev/null || true
        echo "   ✅ Web 服务已停止 (PID: $WEB_PID)"
    else
        echo "   ⚠️  Web 服务未运行"
    fi
    rm /tmp/web-service.pid
fi

# 强制停止占用端口的进程
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

echo ""
echo "🎉 所有服务已停止"
