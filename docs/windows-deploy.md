# TechMate Windows Server 部署指南

## 一、服务器准备

### 1. 连接服务器
- 使用 Windows 远程桌面连接（RDP）
- 输入公网 IP + 管理员账号密码

### 2. 安装必要软件

#### Node.js 18
```powershell
# 下载安装包
# https://nodejs.org/dist/v18.20.0/node-v18.20.0-x64.msi
# 双击安装，一路 Next
```

#### Python 3.11
```powershell
# 下载安装包
# https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe
# 安装时勾选 "Add Python to PATH"
```

#### pnpm
```powershell
npm install -g pnpm@8
```

#### Git
```powershell
# 下载安装包
# https://git-scm.com/download/win
# 安装后可用 Git Bash
```

#### ChromaDB
```powershell
pip install chromadb
```

---

## 二、克隆项目

打开 **Git Bash**：
```bash
cd C:/Users/Administrator
git clone https://github.com/YX-777/tech_mate.git
cd tech_mate
```

---

## 三、配置环境变量

编辑 `packages/web/.env`：
```bash
notepad packages/web/.env

# 修改以下配置（填写真实的 API Key）：
DASHSCOPE_API_KEY=sk-你的真实API_Key
EMBEDDING_API_KEY=sk-你的真实API_Key
```

---

## 四、安装依赖并构建

```bash
# Git Bash 中执行
pnpm install
pnpm -r build
```

---

## 五、初始化数据库（重要！）

首次部署必须执行此步骤：

```bash
# 执行数据库初始化脚本
bash init-db.sh
```

或手动执行：
```bash
cd packages/database
npx prisma db push
cp prisma/data/tech-mate.db ../web/data/
cd ..
```

> 注意：如果报错 `/api/conversations 500`，说明数据库未初始化

---

## 六、开放端口（腾讯云）

登录腾讯云控制台：
1. 进入 **云服务器 CVM** → 找到你的服务器
2. 点击 **安全组** → 配置规则
3. 添加入站规则：

| 端口 | 协议 | 来源 |
|------|------|------|
| 3000 | TCP | 0.0.0.0/0 |
| 3001 | TCP | 0.0.0.0/0 |
| 8000 | TCP | 0.0.0.0/0 |

---

## 七、启动服务

双击运行 `start-windows.bat`

或手动启动：
```powershell
# 1. 启动 ChromaDB
python -m chroma run --host 0.0.0.0 --port 8000 --path ./data/chroma

# 2. 启动 MCP 服务
cd packages/mcp-bailian-rag
node dist/http-server.js

# 3. 启动 Web 服务
cd packages/web
pnpm dev
```

---

## 八、验证部署

在服务器上浏览器访问：
- `http://localhost:3000`

外部访问（面试官）：
- `http://你的公网IP:3000`

---

## 九、常见问题

### Q: `/api/conversations 500` 报错？
数据库未初始化。执行 `bash init-db.sh` 初始化数据库

### Q: 外部无法访问？
检查腾讯云安全组是否开放端口 3000

### Q: ChromaDB 启动失败？
确保 Python 已安装 chromadb：`pip install chromadb`

### Q: 端口被占用？
```powershell
netstat -ano | findstr :3000
taskkill /PID 进程ID /F
```

---

## 十、停止服务

双击运行 `stop-windows.bat`

或手动：
```powershell
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

---

## 十一、开机自启动（可选）

1. 打开 **任务计划程序**
2. 创建基本任务
3. 触发器：计算机启动时
4. 操作：启动程序 `start-windows.bat`