#!/bin/bash
# 停止小红书采集定时任务服务

echo "🛑 停止小红书采集定时任务服务..."

# 停止 Scheduler
pkill -f "scheduler/dist/index" 2>/dev/null || true
rm -f /tmp/scheduler.pid

# 停止小红书 MCP
lsof -ti:18060 | xargs kill -9 2>/dev/null || true
rm -f /tmp/xhs-mcp.pid

echo "✅ 所有服务已停止"