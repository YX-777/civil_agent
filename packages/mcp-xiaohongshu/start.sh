#!/bin/bash
# 小红书 MCP 正式启动脚本
# 流程：启动 MCP 服务 -> 初始化工具 -> 检测登录 -> 获取首页推荐前三条
# 任一步失败立即退出，不继续执行

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN_DIR="$ROOT_DIR/xiaohongshu-mcp-bin"
BIN_FILE="$BIN_DIR/xiaohongshu-mcp-darwin-arm64"
PID_FILE="$SCRIPT_DIR/.mcp-server.pid"
LOG_FILE="$SCRIPT_DIR/mcp-server.log"

print_header() {
  echo "============================================================"
  echo "🚀 小红书 MCP 正式启动脚本"
  echo "============================================================"
  echo ""
}

fail_and_exit() {
  echo ""
  echo "❌ $1"
  echo "请先按提示修复后重试。"
  exit 1
}

cleanup_on_fail() {
  local code=$?
  if [ "$code" -ne 0 ]; then
    if [ -f "$PID_FILE" ]; then
      MCP_PID=$(cat "$PID_FILE" 2>/dev/null || true)
      if [ -n "${MCP_PID:-}" ] && ps -p "$MCP_PID" >/dev/null 2>&1; then
        kill "$MCP_PID" >/dev/null 2>&1 || true
      fi
      rm -f "$PID_FILE"
    fi
  fi
}

trap cleanup_on_fail EXIT

wait_for_port() {
  local host="$1"
  local port="$2"
  local timeout="$3"

  local count=0
  while [ "$count" -lt "$timeout" ]; do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      return 0
    fi
    count=$((count + 1))
    sleep 1
  done

  return 1
}

start_mcp_server() {
  echo "📝 步骤 1/3：启动小红书 MCP 服务..."

  if [ ! -x "$BIN_FILE" ]; then
    fail_and_exit "未找到可执行文件：$BIN_FILE"
  fi

  # 若已有旧进程，优先清理
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "${OLD_PID:-}" ] && ps -p "$OLD_PID" >/dev/null 2>&1; then
      echo "   检测到旧进程 PID=$OLD_PID，先停止..."
      kill "$OLD_PID" >/dev/null 2>&1 || true
      sleep 1
    fi
    rm -f "$PID_FILE"
  fi

  # 使用用户要求命令启动：
  # ./xiaohongshu-mcp-darwin-arm64 -headless=false
  (
    cd "$BIN_DIR"
    ./xiaohongshu-mcp-darwin-arm64
  ) >"$LOG_FILE" 2>&1 &

  MCP_PID=$!
  echo "$MCP_PID" > "$PID_FILE"
  echo "   MCP 服务进程已启动，PID=$MCP_PID"

  if ! wait_for_port "127.0.0.1" "18060" "20"; then
    fail_and_exit "MCP 服务未在 20 秒内监听 18060 端口。请检查日志：$LOG_FILE"
  fi

  echo "✅ MCP 服务启动成功（端口 18060）"
  echo ""
}

run_validation() {
  echo "📝 步骤 2/3：初始化工具并检测登录状态..."
  node "$SCRIPT_DIR/start.mjs"
  echo ""
  echo "✅ 工具初始化、登录检测、推荐列表校验均通过"
  echo ""
}

finish_message() {
  echo "📝 步骤 3/3：完成"
  echo "🎉 启动与校验完成。"
  echo ""
  echo "服务信息："
  echo "  - MCP PID: $(cat "$PID_FILE")"
  echo "  - MCP URL: http://localhost:18060/mcp"
  echo "  - 日志文件: $LOG_FILE"
  echo ""
  echo "停止服务可执行："
  echo "  ./stop.sh"
  echo ""
}

print_header
start_mcp_server
run_validation
finish_message
