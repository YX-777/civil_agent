#!/bin/bash
# 小红书采集定时任务启动脚本
# 包含：小红书 MCP 服务 + Scheduler 定时任务

set -euo pipefail

ROOT_DIR="/Users/sxh/Code/project/civil_agent"
XHS_MCP_DIR="$ROOT_DIR/xiaohongshu-mcp-bin"
SCHEDULER_DIR="$ROOT_DIR/packages/scheduler"
DATABASE_DIR="$ROOT_DIR/packages/database"

XHS_MCP_LOG="/tmp/xhs-mcp.log"
SCHEDULER_LOG="/tmp/scheduler.log"
XHS_MCP_PID_FILE="/tmp/xhs-mcp.pid"
SCHEDULER_PID_FILE="/tmp/scheduler.pid"

XHS_MCP_PID=""
SCHEDULER_PID=""

cleanup() {
    if [[ -n "${SCHEDULER_PID:-}" ]] && kill -0 "$SCHEDULER_PID" 2>/dev/null; then
        kill "$SCHEDULER_PID" 2>/dev/null || true
    fi
    if [[ -n "${XHS_MCP_PID:-}" ]] && kill -0 "$XHS_MCP_PID" 2>/dev/null; then
        kill "$XHS_MCP_PID" 2>/dev/null || true
    fi
    rm -f "$XHS_MCP_PID_FILE" "$SCHEDULER_PID_FILE"
}

wait_for_http() {
    local url="$1"
    local name="$2"
    local max_retry="$3"
    local pid="$4"
    local i

    for ((i=1; i<=max_retry; i++)); do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        # 405 表示 MCP 服务已启动（GET /mcp 返回 405）
        if [[ "$code" == "405" || "$code" == "200" ]]; then
            echo "   ✅ $name 启动成功"
            return 0
        fi
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "   ❌ $name 进程已退出"
            return 1
        fi
        sleep 1
    done

    echo "   ❌ $name 启动超时（$max_retry 秒）"
    return 1
}

trap cleanup EXIT INT TERM

echo "🚀 启动小红书采集定时任务服务..."
echo ""

# 检查 cookies 是否存在
if [[ ! -f "$XHS_MCP_DIR/cookies.json" ]]; then
    echo "❌ cookies.json 不存在，请先登录小红书"
    echo "   运行: cd $XHS_MCP_DIR && ./xiaohongshu-login-darwin-arm64"
    exit 1
fi

echo "🛑 停止旧服务..."
lsof -ti:18060 | xargs kill -9 2>/dev/null || true
pkill -f "scheduler/dist/index" 2>/dev/null || true
sleep 2

echo "📡 启动小红书 MCP 服务 (端口 18060)..."
cd "$XHS_MCP_DIR"
nohup ./xiaohongshu-mcp-darwin-arm64 >"$XHS_MCP_LOG" 2>&1 &
XHS_MCP_PID=$!
echo "$XHS_MCP_PID" >"$XHS_MCP_PID_FILE"
echo "   小红书 MCP PID: $XHS_MCP_PID"

if ! wait_for_http "http://localhost:18060/mcp" "小红书 MCP 服务" 10 "$XHS_MCP_PID"; then
    echo "   📄 MCP 日志预览："
    tail -30 "$XHS_MCP_LOG" || true
    exit 1
fi

echo "⏰ 启动定时任务 (简化版，不依赖 Redis)..."
cd "$SCHEDULER_DIR"
nohup node xhs-sync-cron.mjs >"$SCHEDULER_LOG" 2>&1 &
SCHEDULER_PID=$!
echo "$SCHEDULER_PID" >"$SCHEDULER_PID_FILE"
echo "   定时任务 PID: $SCHEDULER_PID"

# 等待定时任务启动
sleep 3
if ! kill -0 "$SCHEDULER_PID" 2>/dev/null; then
    echo "   ❌ 定时任务进程已退出"
    echo "   📄 日志预览："
    tail -30 "$SCHEDULER_LOG" || true
    exit 1
fi
echo "   ✅ 定时任务启动成功"

echo ""
echo "🎉 所有服务已启动！"
echo ""
echo "📋 服务列表："
echo "   - 小红书 MCP:   http://localhost:18060/mcp"
echo "   - 定时任务:     每天 06:00 自动采集"
echo ""
echo "💡 提示："
echo "   - 按 Ctrl+C 停止所有服务"
echo "   - 查看 MCP 日志:     tail -f $XHS_MCP_LOG"
echo "   - 查看定时任务日志:  tail -f $SCHEDULER_LOG"
echo "   - 手动触发采集:      cd $SCHEDULER_DIR && node test-sync.mjs"
echo "   - 停止服务:          $ROOT_DIR/stop-xhs-sync.sh"
echo ""

wait