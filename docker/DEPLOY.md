# TechMate 阿里云部署指南

## 一、购买阿里云服务器

### 1. 选择配置
- **产品**：轻量应用服务器 或 ECS 云服务器
- **地域**：华东/华北（离你近的）
- **镜像**：Ubuntu 22.04
- **规格**：2核 4G 内存（最低要求）
- **带宽**：3-5 Mbps
- **费用**：约 60-100 元/月

### 2. 购买后获取
- 公网 IP（如 `123.45.67.89`）
- root 密码（在控制台重置）

---

## 二、连接服务器

```bash
ssh root@123.45.67.89
# 输入密码
```

---

## 三、安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
```

---

## 四、上传项目到服务器

### 方式一：Git Clone（推荐）
```bash
# 在服务器上
git clone https://github.com/YX-777/tech_mate.git
cd tech_mate
```

### 方式二：SCP 上传
```bash
# 在本地电脑执行
scp -r /Users/sxh/Code/project/tech_mate root@123.45.67.89:/root/
```

---

## 五、配置环境变量

编辑 `docker/.env.production`：
```bash
vim docker/.env.production
```

修改以下配置：
```env
# 阿里云千问 API Key（必须配置真实的）
DASHSCOPE_API_KEY=sk-你的真实API_Key

# Embedding API Key（与上面相同）
EMBEDDING_API_KEY=sk-你的真实API_Key
```

---

## 六、构建并启动容器

```bash
cd tech_mate/docker

# 构建镜像
docker build -t techmate:latest .

# 启动容器
docker run -d \
    --name techmate \
    -p 80:80 \
    -p 3000:3000 \
    -p 3001:3001 \
    -p 8000:8000 \
    -v /root/data:/app/data \
    --restart unless-stopped \
    techmate:latest
```

---

## 七、验证部署

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs techmate

# 测试访问
curl http://localhost:3000
```

---

## 八、访客访问

告诉访客访问：
- **主站**：`http://123.45.67.89`
- **ChromaDB UI**：`http://123.45.67.89:3001`

---

## 九、常用运维命令

```bash
# 重启服务
docker restart techmate

# 查看日志
docker logs -f techmate

# 进入容器
docker exec -it techmate sh

# 停止服务
docker stop techmate

# 更新部署
docker build -t techmate:latest .
docker stop techmate
docker rm techmate
docker run -d --name techmate ... techmate:latest
```

---

## 十、安全配置（可选）

### 1. 配置防火墙
```bash
# 只开放必要端口
ufw allow 80
ufw allow 22
ufw enable
```

### 2. 配置域名（如果有）
购买域名后，在阿里云控制台配置 DNS 解析指向服务器 IP。

---

## 常见问题

### Q: ChromaDB 启动失败？
```bash
# 查看日志
docker logs techmate | grep chromadb

# 可能需要更多内存
```

### Q: API 调用失败？
检查 `.env.production` 中 `DASHSCOPE_API_KEY` 是否正确配置。

### Q: 如何更新代码？
```bash
git pull
docker build -t techmate:latest .
docker restart techmate
```

---

## 快速部署脚本

将以下脚本保存为 `deploy.sh`，一键部署：

```bash
#!/bin/bash
set -e

echo "🚀 开始部署 TechMate..."

# 安装 Docker
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
fi

# 克隆项目
if [ ! -d "tech_mate" ]; then
    echo "克隆项目..."
    git clone https://github.com/YX-777/tech_mate.git
fi

cd tech_mate/docker

# 构建镜像
echo "构建镜像..."
docker build -t techmate:latest .

# 启动容器
echo "启动容器..."
docker run -d \
    --name techmate \
    -p 80:80 -p 3000:3000 -p 3001:3001 -p 8000:8000 \
    -v /root/data:/app/data \
    --restart unless-stopped \
    techmate:latest

echo "✅ 部署完成！访问 http://$(curl -s ifconfig.me)"
```