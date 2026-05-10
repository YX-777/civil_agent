#!/bin/bash
# TechMate 服务器更新脚本（Linux）
# 使用方法：bash update-server.sh

set -e

echo "=========================================="
echo "  TechMate 服务器更新"
echo "=========================================="

cd "$(dirname "$0")"

# 1. 拉取最新代码
echo ""
echo "1️⃣  拉取最新代码..."
git pull

# 2. 清理旧依赖
echo ""
echo "2️⃣  清理旧依赖..."
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml 2>/dev/null || true
rm -rf packages/web/.next 2>/dev/null || true

# 3. 安装依赖
echo ""
echo "3️⃣  安装依赖..."
pnpm install

# 4. 生成 Prisma Client
echo ""
echo "4️⃣  生成 Prisma Client..."
cd packages/database && npx prisma generate && cd ..

# 5. 编译 TypeScript 包
echo ""
echo "5️⃣  编译 TypeScript 包..."
cd packages/agent-langgraph && pnpm build && cd ../..
cd packages/database && pnpm build && cd ../..
cd packages/rag-engine && pnpm build && cd ../..
cd packages/core && pnpm build && cd ../..

# 6. 构建项目（内存限制）
echo ""
echo "6️⃣  构建项目..."
NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter @tech-mate/web build

# 7. 重启服务（使用 systemd）
echo ""
echo "7️⃣  重启服务..."
if systemctl is-active techmate-web &>/dev/null; then
    systemctl restart techmate-web
    echo "   ✅ Web 服务已重启"
else
    echo "   提示：服务未使用 systemd 管理，请手动重启"
fi

echo ""
echo "=========================================="
echo "  ✅ 更新完成！"
echo "=========================================="
echo ""
echo "常用命令："
echo "   查看状态: systemctl status techmate-web techmate-chroma"
echo "   查看日志: journalctl -u techmate-web -f"
echo "   手动启动: bash start-all.sh"
echo ""