#!/bin/bash
# Windows Server 更新脚本
# 使用方法：bash update-server.sh

set -e

echo "=========================================="
echo "  TechMate 服务器更新"
echo "=========================================="

cd "$(dirname "$0")"

# 1. 拉取最新代码
echo ""
echo "1. 拉取最新代码..."
git pull

# 2. 清理旧依赖
echo ""
echo "2. 清理旧依赖..."
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml 2>/dev/null || true
rm -rf packages/web/.next 2>/dev/null || true

# 3. 安装依赖
echo ""
echo "3. 安装依赖..."
pnpm install

# 4. 生成 Prisma Client
echo ""
echo "4. 生成 Prisma Client..."
export DATABASE_URL="file:./packages/database/prisma/data/tech-mate.db"
node node_modules/prisma/build/index.js generate --schema=packages/database/prisma/schema.prisma

# 5. 编译 TypeScript 包（关键！）
echo ""
echo "5. 编译 TypeScript 包..."
cd packages/agent-langgraph && pnpm build && cd ../..
cd packages/database && pnpm build && cd ../..
cd packages/rag-engine && pnpm build && cd ../..
cd packages/core && pnpm build && cd ../..

# 6. 构建项目（内存限制）
echo ""
echo "6. 构建项目..."
export NODE_OPTIONS="--max-old-space-size=12000"
node node_modules/next/dist/bin/next build packages/web

echo ""
echo "=========================================="
echo "  ✅ 更新完成！"
echo "=========================================="
echo ""
echo "启动服务："
echo "  # 窗口1: ChromaDB"
echo "  chroma run --host 127.0.0.1 --port 8000 --path ./data/chroma"
echo ""
echo "  # 窗口2: Web 服务"
echo "  cd packages/web"
echo "  export DATABASE_URL=\"file:./data/tech-mate.db\""
echo "  node ../../node_modules/next/dist/bin/next start -H 0.0.0.0"
echo ""
