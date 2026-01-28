#!/bin/bash

echo "🚀 启动完整的项目服务..."

# 停止可能存在的旧服务
echo "🛑 停止旧服务..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# 等待端口释放
sleep 2

# 启动 MCP HTTP 服务（端口 3002）
echo "📡 启动 MCP HTTP 服务 (端口 3002)..."
cd /Users/sxh/Code/study/demo/test/packages/mcp-bailian-rag
npm run start:http &
MCP_PID=$!
echo "   MCP 服务 PID: $MCP_PID"

# 等待 MCP 服务启动
sleep 3

# 检查 MCP 服务是否启动成功
if curl -s http://localhost:3002/health > /dev/null; then
    echo "   ✅ MCP 服务启动成功"
else
    echo "   ❌ MCP 服务启动失败"
    exit 1
fi

# 启动 Web 服务（端口 3000）
echo "🌐 启动 Web 服务 (端口 3000)..."
cd /Users/sxh/Code/study/demo/test
pnpm dev &
WEB_PID=$!
echo "   Web 服务 PID: $WEB_PID"

# 等待 Web 服务启动
sleep 5

# 检查 Web 服务是否启动成功
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Web 服务启动成功"
else
    echo "   ⚠️  Web 服务可能还在启动中..."
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
echo "   - 查看 Web 服务日志: tail -f /tmp/web-service.log"
echo "   - 查看 MCP 服务日志: tail -f /tmp/mcp-service.log"
echo ""

# 保存 PID 以便后续清理
echo $MCP_PID > /tmp/mcp-service.pid
echo $WEB_PID > /tmp/web-service.pid

# 等待用户中断
wait