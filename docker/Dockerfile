# TechMate 生产环境镜像
# 单阶段构建，确保依赖正确

FROM node:18-alpine

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    nginx \
    supervisor \
    git

# 安装 ChromaDB 和 pnpm
RUN pip3 install --break-system-packages chromadb
RUN npm install -g pnpm@8

WORKDIR /app

# 复制整个项目
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages ./packages
COPY chroma-web-ui ./chroma-web-ui

# 安装依赖并构建
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm -r build

# 复制 Docker 配置文件
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/start-container.sh /app/start-container.sh
COPY docker/.env.production /app/.env.production

RUN chmod +x /app/start-container.sh

# 创建数据目录
RUN mkdir -p /app/data/chroma

# 暴露端口
EXPOSE 80 3000 3001 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -fsS http://localhost:3000 || exit 1

# 启动
CMD ["/app/start-container.sh"]