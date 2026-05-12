#!/bin/bash
# TechMate 服务器更新脚本（Linux）
# 使用方法：bash update-server.sh

set -e

echo "=========================================="
echo "  TechMate 服务器更新"
echo "=========================================="

cd "$(dirname "$0")"

# 1. 拉取最新代码（带超时+重试，防国内网络卡死）
echo ""
echo "1️⃣  拉取最新代码..."
PULL_OK=0
for i in 1 2 3; do
  if timeout 90 git pull; then
    PULL_OK=1
    break
  fi
  echo "   第 $i 次失败（超时或网络中断），10s 后重试..."
  sleep 10
done
if [ $PULL_OK -eq 0 ]; then
  echo "   ❌ git pull 三次都失败，建议："
  echo "      1) 检查网络：ping github.com"
  echo "      2) 改 origin 走 ghproxy："
  echo "         git remote set-url origin https://ghproxy.com/\$(git remote get-url origin)"
  echo "      3) 或在本地跑 deploy-from-local.sh 跳过服务端 git pull"
  exit 1
fi

# 2. 停止服务释放内存（2GB 机器关键，腾出 400-800MB 给后续 build）
echo ""
echo "2️⃣  停止服务释放内存..."
for svc in techmate-web techmate-chroma; do
  if systemctl is-active "$svc" &>/dev/null; then
    systemctl stop "$svc" && echo "   ⏸️  $svc 已停止"
  else
    echo "   ℹ️  $svc 未运行，跳过"
  fi
done
# 兜底：kill 掉非 systemd 拉起的 node/next/python chromadb 进程
pkill -f "next start" 2>/dev/null || true
pkill -f "chromadb.cli" 2>/dev/null || true
sleep 2
free -h 2>/dev/null | head -3 || true

# 3. 清理旧依赖
echo ""
echo "3️⃣  清理旧依赖..."
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml 2>/dev/null || true
rm -rf packages/web/.next 2>/dev/null || true
rm -rf packages/*/dist 2>/dev/null || true   # 强制重建，避免旧 dist 残留导致新导出丢失

# 4. 安装依赖
echo ""
echo "4️⃣  安装依赖..."
pnpm install

# 5. 生成 Prisma Client
echo ""
echo "5️⃣  生成 Prisma Client..."
cd packages/database && npx prisma generate && cd ..

# 6. 编译 TypeScript 包（按依赖顺序：core → database → rag-engine → agent-langgraph）
echo ""
echo "6️⃣  编译 TypeScript 包..."
cd packages/core && pnpm build && cd ../..
cd packages/database && pnpm build && cd ../..
cd packages/rag-engine && pnpm build && cd ../..
cd packages/agent-langgraph && pnpm build && cd ../..

# 7. 构建项目（内存限制）
echo ""
echo "7️⃣  构建项目..."
NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter @tech-mate/web build

# 8. 启动服务（先 chroma 后 web，遵守 systemd After 依赖）
echo ""
echo "8️⃣  启动服务..."
START_ANY=0
for svc in techmate-chroma techmate-web; do
  if systemctl list-unit-files "$svc.service" &>/dev/null && \
     systemctl cat "$svc" &>/dev/null; then
    systemctl start "$svc" && echo "   ▶️  $svc 已启动"
    START_ANY=1
  fi
done
if [ $START_ANY -eq 0 ]; then
  echo "   提示：未检测到 systemd 服务，请手动启动：bash start-all.sh"
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