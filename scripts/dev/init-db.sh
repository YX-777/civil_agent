#!/bin/bash
# 数据库初始化脚本
# 在首次运行项目前执行（仅初始化数据库，不重新安装依赖）

set -e

echo "=========================================="
echo "  TechMate 数据库初始化"
echo "=========================================="

cd "$(dirname "$0")/../.."

# 1. 生成 Prisma Client（必须！）
echo "⚡ 生成 Prisma Client..."
cd packages/database
npx prisma generate
cd ..

# 2. 推送 Prisma schema（创建数据库表）
echo "📊 创建数据库表..."
cd packages/database
npx prisma db push --force-reset
cd ..

# 3. 复制数据库文件到 web 包
echo "📂 复制数据库文件..."
mkdir -p packages/web/data
cp packages/database/prisma/data/tech-mate.db packages/web/data/tech-mate.db

# 4. 创建默认用户
echo "👤 创建默认用户..."
sqlite3 packages/web/data/tech-mate.db "INSERT INTO users (id, created_at, updated_at) VALUES ('default-user', datetime('now'), datetime('now'));"

echo ""
echo "✅ 数据库初始化完成！"
echo "   数据库文件：packages/web/data/tech-mate.db"
echo "   默认用户：default-user"
echo ""