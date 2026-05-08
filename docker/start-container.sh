#!/bin/bash
set -e

echo "🚀 启动 TechMate 服务..."

# 设置环境变量
export NODE_ENV=production
cp /app/.env.production /app/packages/web/.env

# 等待 ChromaDB 就绪
echo "⏳ 等待 ChromaDB 启动..."
until curl -fsS http://127.0.0.1:8000/api/v2/heartbeat > /dev/null 2>&1; do
    sleep 1
done
echo "✅ ChromaDB 已就绪"

# 启动 supervisord（管理所有进程）
exec supervisord -c /etc/supervisord.conf