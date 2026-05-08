#!/bin/bash
# TechMate 一键部署脚本
# 在阿里云服务器上执行此脚本

set -e

echo "=========================================="
echo "  TechMate 阿里云一键部署"
echo "=========================================="

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户执行此脚本"
    exit 1
fi

# 1. 安装 Docker
echo "📦 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker 已安装"
else
    echo "✅ Docker 已存在"
fi

# 2. 克隆项目
echo "📥 克隆项目..."
if [ ! -d "/root/tech_mate" ]; then
    cd /root
    git clone https://github.com/YX-777/tech_mate.git
    echo "✅ 项目已克隆"
else
    cd /root/tech_mate
    git pull
    echo "✅ 项目已更新"
fi

# 3. 配置环境变量
echo "⚙️ 配置环境变量..."
cd /root/tech_mate/docker

# 提示用户输入 API Key
if grep -q "your_dashscope_api_key_here" .env.production; then
    echo ""
    echo "⚠️  请配置阿里云千问 API Key"
    echo "   编辑 /root/tech_mate/docker/.env.production"
    echo "   修改 DASHSCOPE_API_KEY 和 EMBEDDING_API_KEY"
    echo ""
    read -p "是否现在配置？(y/n): " configure
    if [ "$configure" = "y" ]; then
        read -p "请输入 DASHSCOPE_API_KEY: " api_key
        sed -i "s/your_dashscope_api_key_here/$api_key/g" .env.production
        sed -i "s/your_dashscope_api_key_here/$api_key/g" .env.production
        echo "✅ API Key 已配置"
    fi
fi

# 4. 构建镜像
echo "🔨 构建 Docker 镜像..."
docker build -t techmate:latest .

# 5. 启动容器
echo "🚀 启动容器..."
docker run -d \
    --name techmate \
    -p 80:80 \
    -p 3000:3000 \
    -p 3001:3001 \
    -p 8000:8000 \
    -v /root/data:/app/data \
    --restart unless-stopped \
    techmate:latest

# 6. 获取公网 IP
PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "📋 访问地址："
echo "   主站：     http://$PUBLIC_IP"
echo "   ChromaDB： http://$PUBLIC_IP:3001"
echo ""
echo "📝 常用命令："
echo "   查看日志： docker logs -f techmate"
echo "   重启服务： docker restart techmate"
echo "   进入容器： docker exec -it techmate sh"
echo ""
echo "⚠️  如果 API Key 未配置，请编辑："
echo "   /root/tech_mate/docker/.env.production"
echo "   然后重启： docker restart techmate"
echo ""