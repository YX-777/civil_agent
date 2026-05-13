#!/bin/bash
# TechMate 服务器 swap 一次性配置脚本（仅 Linux）
# 适用场景：2GB 内存服务器跑 Next.js 构建（峰值 3-4GB）会 OOM，加 4GB swap 兜底。
#
# 用法（在服务器上，root 或 sudo 跑一次即可）：
#   sudo bash setup-swap.sh
#
# 幂等：已经配置过 swap 会跳过。

set -e

SWAP_FILE="/swapfile"
SWAP_SIZE="4G"

echo "=========================================="
echo "  配置 ${SWAP_SIZE} swap"
echo "=========================================="
echo ""

# 必须 root
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 sudo 或 root 运行"
  exit 1
fi

# 1. 检查是否已有 swap
CURRENT_SWAP=$(swapon --show=NAME --noheadings | head -n 1 || true)
if [ -n "$CURRENT_SWAP" ]; then
  echo "ℹ️  已有 swap：$CURRENT_SWAP"
  swapon --show
  echo ""
  read -p "是否仍要新增一个 ${SWAP_FILE}? (y/N) " ans
  if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
    echo "已跳过"
    exit 0
  fi
fi

# 2. 检查文件是否已存在
if [ -f "$SWAP_FILE" ]; then
  echo "ℹ️  $SWAP_FILE 已存在，跳过 fallocate"
else
  echo "1️⃣  创建 ${SWAP_SIZE} swap 文件..."
  fallocate -l "$SWAP_SIZE" "$SWAP_FILE" || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=4096
  chmod 600 "$SWAP_FILE"
fi

# 3. 格式化并启用
if ! swapon --show=NAME --noheadings | grep -q "^${SWAP_FILE}$"; then
  echo "2️⃣  格式化并启用..."
  mkswap "$SWAP_FILE"
  swapon "$SWAP_FILE"
fi

# 4. 写入 fstab 持久化
if ! grep -q "^${SWAP_FILE}" /etc/fstab; then
  echo "3️⃣  写入 /etc/fstab（开机自动挂载）..."
  echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
else
  echo "ℹ️  /etc/fstab 已含 swap 配置"
fi

# 5. 验证
echo ""
echo "=========================================="
echo "  ✅ swap 配置完成"
echo "=========================================="
echo ""
free -h
echo ""
swapon --show
