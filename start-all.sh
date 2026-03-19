#!/bin/bash

set -euo pipefail

ROOT_DIR="/Users/sxh/Code/project/civil_agent"
MCP_DIR="$ROOT_DIR/packages/mcp-bailian-rag"
WEB_DIR="$ROOT_DIR"

MCP_LOG="/tmp/mcp-service.log"
WEB_LOG="/tmp/web-service.log"
MCP_PID_FILE="/tmp/mcp-service.pid"
WEB_PID_FILE="/tmp/web-service.pid"

MCP_PID=""
WEB_PID=""

cleanup() {
    # 统一在退出时清理，避免残留孤儿进程占用端口
    if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
        kill "$WEB_PID" 2>/dev/null || true
    fi
    if [[ -n "${MCP_PID:-}" ]] && kill -0 "$MCP_PID" 2>/dev/null; then
        kill "$MCP_PID" 2>/dev/null || true
    fi
    rm -f "$MCP_PID_FILE" "$WEB_PID_FILE"
}

wait_for_http() {
    local url="$1"
    local name="$2"
    local max_retry="$3"
    local pid="$4"
    local i

    for ((i=1; i<=max_retry; i++)); do
        if curl -fsS "$url" >/dev/null 2>&1; then
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

check_next_static_asset() {
    # 额外校验一个 _next 静态资源，避免“首页可访问但静态资源 404”
    local html asset_path
    html="$(curl -fsS http://localhost:3000 2>/dev/null || true)"
    asset_path="$(printf "%s" "$html" | grep -oE '/_next/static/[^"<> ]+' | head -n 1 || true)"

    if [[ -z "$asset_path" ]]; then
        echo "   ❌ 未从首页 HTML 中解析到 _next 静态资源路径"
        return 1
    fi

    if curl -fsS "http://localhost:3000$asset_path" >/dev/null 2>&1; then
        echo "   ✅ _next 静态资源校验通过: $asset_path"
        return 0
    fi

    echo "   ❌ _next 静态资源访问失败: $asset_path"
    return 1
}

trap cleanup EXIT INT TERM

echo "🚀 启动完整的项目服务..."
echo "🛑 停止旧服务..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
sleep 2

echo "📡 启动 MCP HTTP 服务 (端口 3002)..."
cd "$MCP_DIR"
npm run start:http >"$MCP_LOG" 2>&1 &
MCP_PID=$!
echo "$MCP_PID" >"$MCP_PID_FILE"
echo "   MCP 服务 PID: $MCP_PID"

if ! wait_for_http "http://localhost:3002/health" "MCP 服务" 15 "$MCP_PID"; then
    echo "   📄 MCP 日志预览："
    sed -n '1,80p' "$MCP_LOG" || true
    exit 1
fi

echo "🌐 启动 Web 服务 (端口 3000)..."
cd "$WEB_DIR"
pnpm dev >"$WEB_LOG" 2>&1 &
WEB_PID=$!
echo "$WEB_PID" >"$WEB_PID_FILE"
echo "   Web 服务 PID: $WEB_PID"

if ! wait_for_http "http://localhost:3000" "Web 服务" 25 "$WEB_PID"; then
    echo "   📄 Web 日志预览："
    sed -n '1,120p' "$WEB_LOG" || true
    exit 1
fi

if ! check_next_static_asset; then
    echo "   📄 Web 日志预览："
    sed -n '1,160p' "$WEB_LOG" || true
    exit 1
fi

echo ""
echo "🎉 所有服务已启动！"
echo ""
echo "📋 服务列表："
echo "   - Web 服务:     http://localhost:3000"
echo "   - MCP 服务:     http://localhost:3002"
echo "   - 健康检查:     http://localhost:3002/health"
echo ""
echo "💡 提示："
echo "   - 按 Ctrl+C 停止所有服务"
echo "   - 查看 Web 服务日志: tail -f $WEB_LOG"
echo "   - 查看 MCP 服务日志: tail -f $MCP_LOG"
echo ""

wait
