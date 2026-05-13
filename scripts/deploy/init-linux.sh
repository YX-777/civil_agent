#!/bin/bash
# TechMate Linux 环境初始化脚本
# 用于腾讯云 Ubuntu Server 22.04 LTS 首次部署
# 使用方法：sudo bash init-linux.sh

set -e

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 权限运行此脚本"
    echo "   sudo bash init-linux.sh"
    exit 1
fi

echo "=========================================="
echo "  TechMate Linux 环境初始化"
echo "=========================================="

# 检测系统类型
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "系统：$PRETTY_NAME"
else
    echo "警告：无法检测系统类型"
fi

# ========== 1. 更新系统包 ==========
echo ""
echo "1️⃣  更新系统包..."
apt update && apt upgrade -y
apt install -y curl git build-essential sqlite3
echo "   ✅ 系统包已更新"

# ========== 2. 安装 Node.js 18.x ==========
echo ""
echo "2️⃣  安装 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   Node.js 已安装: $NODE_VERSION"
else
    # 使用 NodeSource 安装 Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo "   ✅ Node.js 已安装: $(node -v)"
fi

# ========== 3. 安装 pnpm ==========
echo ""
echo "3️⃣  安装 pnpm..."
if command -v pnpm &> /dev/null; then
    echo "   pnpm 已安装: $(pnpm -v)"
else
    npm install -g pnpm
    echo "   ✅ pnpm 已安装: $(pnpm -v)"
fi

# ========== 4. 安装 Python 3 ==========
echo ""
echo "4️⃣  安装 Python 3..."
if command -v python3 &> /dev/null; then
    echo "   Python 已安装: $(python3 --version)"
else
    apt install -y python3 python3-pip
    echo "   ✅ Python 已安装: $(python3 --version)"
fi

# ========== 5. 安装 ChromaDB ==========
echo ""
echo "5️⃣  安装 ChromaDB..."
if python3 -c "import chromadb" 2>/dev/null; then
    CHROMA_VERSION=$(python3 -c "import chromadb; print(chromadb.__version__)")
    echo "   ChromaDB 已安装: $CHROMA_VERSION"
else
    # Ubuntu 23.04+ 使用 PEP 668，需要 --break-system-packages
    # --ignore-installed 跳过卸载系统包（如 rich、click、bcrypt）
    pip3 install --break-system-packages --ignore-installed chromadb
    echo "   ✅ ChromaDB 已安装"
fi

# ========== 6. 检查内存配置 ==========
echo ""
echo "6️⃣  检查系统内存..."
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
echo "   总内存：${TOTAL_MEM}MB"

if [ $TOTAL_MEM -lt 2048 ]; then
    echo "   ⚠️  内存不足 2GB，建议使用 swap"
    # 创建 2GB swap 文件
    if [ ! -f /swapfile ]; then
        echo "   创建 swap 文件..."
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
        echo "   ✅ Swap 已创建 (2GB)"
    fi
else
    echo "   ✅ 内存充足"
fi

# ========== 7. 克隆项目（如果不存在） ==========
echo ""
echo "7️⃣  检查项目目录..."
PROJECT_DIR="/opt/tech_mate"

if [ -d "$PROJECT_DIR" ]; then
    echo "   项目目录已存在: $PROJECT_DIR"
else
    echo "   克隆项目..."
    # 如果是本地运行此脚本，使用项目根目录（脚本位于 scripts/deploy/）
    LOCAL_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
    if [ -f "$LOCAL_ROOT/scripts/dev/start.sh" ]; then
        PROJECT_DIR="$LOCAL_ROOT"
        echo "   使用本地目录: $PROJECT_DIR"
    else
        # 否则克隆 GitHub 仓库（需要用户提供仓库地址）
        echo "   请手动克隆项目到 $PROJECT_DIR"
        echo "   例如：git clone https://github.com/xxx/tech_mate.git $PROJECT_DIR"
    fi
fi

# ========== 8. 完成提示 ==========
echo ""
echo "=========================================="
echo "  ✅ Linux 环境初始化完成！"
echo "=========================================="
echo ""
echo "已安装组件："
echo "   - Node.js: $(node -v)"
echo "   - pnpm: $(pnpm -v)"
echo "   - Python: $(python3 --version)"
echo "   - ChromaDB: 已安装"
echo "   - SQLite: 已安装"
echo ""
echo "下一步："
echo "   cd $PROJECT_DIR"
echo "   bash scripts/dev/init-first-run.sh    # 首次运行初始化"
echo "   bash scripts/dev/start.sh             # 启动所有服务"
echo ""
echo "或者使用一键部署："
echo "   bash scripts/deploy/deploy-linux.sh   # 完整部署（环境 + 项目初始化 + 启动）"
echo ""