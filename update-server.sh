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

# 2. 确保 ChromaDB 已安装
echo ""
echo "2. 检查 ChromaDB..."
python -c "import chromadb; print('ChromaDB 已安装:', chromadb.__version__)" 2>/dev/null || {
  echo "ChromaDB 未安装，正在安装..."
  pip install chromadb
}

# 3. 清理旧依赖
echo ""
echo "3. 清理旧依赖..."
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml 2>/dev/null || true
rm -rf packages/web/.next 2>/dev/null || true

# 4. 安装依赖
echo ""
echo "4. 安装依赖..."
pnpm install

# 5. 生成 Prisma Client
echo ""
echo "5. 生成 Prisma Client..."
export DATABASE_URL="file:./packages/database/prisma/data/tech-mate.db"
node node_modules/prisma/build/index.js generate --schema=packages/database/prisma/schema.prisma

# 6. 编译 TypeScript 包（关键！）
echo ""
echo "6. 编译 TypeScript 包..."
cd packages/agent-langgraph && pnpm build && cd ../..
cd packages/database && pnpm build && cd ../..
cd packages/rag-engine && pnpm build && cd ../..
cd packages/core && pnpm build && cd ../..

# 7. 构建项目（内存限制）
echo ""
echo "7. 构建项目..."
export NODE_OPTIONS="--max-old-space-size=12000"
node node_modules/next/dist/bin/next build packages/web

echo ""
echo "=========================================="
echo "  ✅ 更新完成！"
echo "=========================================="
echo ""
echo "启动服务："
echo "  # 窗口1: ChromaDB Server（必须先启动！）"
echo "  python -m chroma run --host 127.0.0.1 --port 8000 --path ./data/chroma"
echo ""
echo "  # 等待 ChromaDB 启动成功后，启动 Web 服务"
echo "  # 窗口2: Web 服务"
echo "  cd packages/web"
echo "  export DATABASE_URL=\"file:./data/tech-mate.db\""
echo "  node ../../node_modules/next/dist/bin/next start -H 0.0.0.0"
echo ""
echo "💡 重要提示："
echo "  - ChromaDB 必须先启动，否则四层记忆功能无法正常工作"
echo "  - 可以用 start-windows.bat 一键启动所有服务"
echo ""
