#!/bin/bash
# TechMate 首次运行初始化脚本
# 解决改名后工作区链接、Prisma Client、数据库初始化等问题

set -e

echo "=========================================="
echo "  TechMate 首次运行初始化"
echo "=========================================="

cd "$(dirname "$0")/../.."

# 0. 清理旧的依赖（解决改名后工作区链接问题）
echo "🧹 清理旧依赖..."
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml 2>/dev/null || true
rm -rf packages/web/.next 2>/dev/null || true
echo "   ✅ 已清理"

# 1. 安装依赖（建立新的工作区链接）
echo "📦 安装依赖..."
pnpm install
echo "   ✅ 依赖已安装"

# 2. 生成 Prisma Client（必须！）
echo "⚡ 生成 Prisma Client..."
cd packages/database
npx prisma generate
cd ..
echo "   ✅ Prisma Client 已生成"

# 3. 构建所有包（增加内存限制，解决服务器内存不足问题）
echo "🔨 构建项目..."
NODE_OPTIONS="--max-old-space-size=4096" pnpm -r build
echo "   ✅ 项目已构建"

# 4. 初始化数据库
echo "📊 初始化数据库..."
cd packages/database
npx prisma db push --force-reset
cd ..

# 5. 复制数据库文件到 web 包
echo "📂 复制数据库文件..."
mkdir -p packages/web/data
cp packages/database/prisma/data/tech-mate.db packages/web/data/tech-mate.db

# 6. 创建默认用户
echo "👤 创建默认用户..."
sqlite3 packages/web/data/tech-mate.db "INSERT INTO users (id, created_at, updated_at) VALUES ('default-user', datetime('now'), datetime('now'));"
echo "   ✅ 默认用户已创建"

echo ""
echo "=========================================="
echo "  ✅ 初始化完成！"
echo "=========================================="
echo ""
echo "现在可以运行："
echo "   bash scripts/dev/start.sh    # 启动所有服务"
echo "   或"
echo "   pnpm dev                     # 仅启动 Web 服务"
echo ""
echo "访问：http://localhost:3000"
echo ""