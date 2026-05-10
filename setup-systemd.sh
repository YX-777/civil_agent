#!/bin/bash
# TechMate systemd 服务配置脚本
# 使用方法：sudo bash setup-systemd.sh

set -e

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 权限运行：sudo bash setup-systemd.sh"
    exit 1
fi

# 自动检测项目目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "=========================================="
echo "  TechMate systemd 服务配置"
echo "=========================================="
echo "项目目录：$PROJECT_DIR"

# ========== 1. ChromaDB 服务（Docker） ==========
echo ""
echo "1️⃣  配置 ChromaDB 服务（Docker）..."

# 先检查 Docker 是否有 chromadb 容器
if docker ps -a | grep -q chromadb; then
    echo "   ChromaDB Docker 容器已存在"
else
    echo "   创建 ChromaDB Docker 容器..."
    docker run -d --name chromadb \
        -p 8000:8000 \
        -v $PROJECT_DIR/data/chroma:/chroma/chroma \
        --restart always \
        chromadb/chroma:latest
fi

echo "   ✅ ChromaDB 服务已配置"

# ========== 2. ChromaDB Web UI 服务 ==========
echo ""
echo "2️⃣  配置 ChromaDB Web UI 服务..."

cat > /etc/systemd/system/techmate-chroma-ui.service << EOF
[Unit]
Description=TechMate ChromaDB Web UI
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/chroma-web-ui
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
User=ubuntu
Environment=NODE_ENV=development

[Install]
WantedBy=multi-user.target
EOF

echo "   ✅ ChromaDB Web UI 服务已配置"

# ========== 3. TechMate Web 服务 ==========
echo ""
echo "3️⃣  配置 TechMate Web 服务..."

# 读取 DASHSCOPE_API_KEY（如果已配置）
DASHSCOPE_KEY=""
if [ -f "$PROJECT_DIR/packages/web/.env" ]; then
    DASHSCOPE_KEY=$(grep "DASHSCOPE_API_KEY" "$PROJECT_DIR/packages/web/.env" | cut -d'=' -f2 | tr -d '"' || true)
fi

cat > /etc/systemd/system/techmate-web.service << EOF
[Unit]
Description=TechMate Web Server
After=network.target techmate-chroma.service

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/packages/web
Environment=DATABASE_URL=file:/home/ubuntu/code/tech_mate/packages/web/data/tech-mate.db
Environment=CHROMADB_URL=http://localhost:8000
Environment=NODE_OPTIONS=--max-old-space-size=4096
Environment=DASHSCOPE_API_KEY=$DASHSCOPE_KEY
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=5
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

echo "   ✅ TechMate Web 服务已配置"

# ========== 4. MCP 服务（可选） ==========
echo ""
echo "4️⃣  配置 MCP 服务..."

if [ -d "$PROJECT_DIR/packages/mcp-bailian-rag" ]; then
    cat > /etc/systemd/system/techmate-mcp.service << EOF
[Unit]
Description=TechMate MCP Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/packages/mcp-bailian-rag
ExecStart=/usr/bin/pnpm start:http
Restart=always
RestartSec=5
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF
    echo "   ✅ MCP 服务已配置"
else
    echo "   ⏭️  MCP 目录不存在，跳过"
fi

# ========== 5. 启用并启动服务 ==========
echo ""
echo "5️⃣  启用服务..."

systemctl daemon-reload

# 启用服务（开机自启）
systemctl enable techmate-chroma-ui techmate-web

# 启动 ChromaDB UI
systemctl start techmate-chroma-ui

# 等待 ChromaDB UI 启动
sleep 3

# 启动 Web 服务
systemctl start techmate-web

echo "   ✅ 服务已启动"

# ========== 6. 显示状态 ==========
echo ""
echo "=========================================="
echo "  ✅ systemd 配置完成！"
echo "=========================================="
echo ""
echo "服务状态："
systemctl status techmate-web techmate-chroma-ui --no-pager | head -20
echo ""
echo "常用命令："
echo "   查看状态: systemctl status techmate-web techmate-chroma-ui"
echo "   查看日志: journalctl -u techmate-web -f"
echo "   重启服务: systemctl restart techmate-web"
echo "   停止服务: systemctl stop techmate-web"
echo ""
echo "访问地址："
echo "   - Web 服务:    http://服务器IP:3000"
echo "   - ChromaDB UI: http://服务器IP:3001"
echo "   - ChromaDB:    http://服务器IP:8000"
echo ""