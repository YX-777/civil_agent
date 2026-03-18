#!/bin/bash
# 小红书 MCP 服务停止脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.mcp-server.pid"
LOG_FILE="$SCRIPT_DIR/mcp-server.log"

echo "============================================================"
echo "🛑 小红书 MCP 服务停止脚本"
echo "============================================================"
echo ""

# 检查 PID 文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "ℹ️  没有找到运行中的服务"
    echo "   PID 文件不存在: $PID_FILE"
    exit 0
fi

# 读取 PID
MCP_PID=$(cat "$PID_FILE")

# 检查进程是否还在运行
if ! ps -p "$MCP_PID" > /dev/null 2>&1; then
    echo "ℹ️  进程已停止 (PID: $MCP_PID)"
    rm -f "$PID_FILE"
    exit 0
fi

echo "📝 正在停止 MCP 服务..."
echo "   PID: $MCP_PID"
echo ""

# 尝试优雅停止
kill "$MCP_PID" 2>/dev/null || true

# 等待进程结束
MAX_WAIT=10
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if ! ps -p "$MCP_PID" > /dev/null 2>&1; then
        echo "✅ 服务已停止"
        rm -f "$PID_FILE"
        echo ""
        echo "📋 日志文件: $LOG_FILE"
        exit 0
    fi
    
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
    sleep 1
done

# 如果超时，强制停止
echo ""
echo "⚠️  进程未响应，强制停止..."
kill -9 "$MCP_PID" 2>/dev/null || true
sleep 1
rm -f "$PID_FILE"

echo "✅ 服务已强制停止"
echo ""
echo "============================================================"
