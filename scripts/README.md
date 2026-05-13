# scripts/

项目运维脚本集中目录。按使用场景分三类：

- **dev/** —— 本地开发：启动 / 停止 / 初始化
- **data/** —— 数据准备：知识库 bootstrap / 迁移
- **deploy/** —— 生产部署：Linux 环境配置、systemd、热更新

所有脚本设计为在**项目根目录**调用：

```bash
bash scripts/<sub>/<script>.sh
```

脚本内部使用相对自身的路径解析（`SCRIPT_DIR/../..`），从任意 CWD 调用都会自动定位到项目根。

---

## dev/ —— 本地开发

| 脚本 | 用途 | 何时跑 |
| --- | --- | --- |
| `start.sh` | 一键启动 ChromaDB Server + ChromaDB UI + MCP + Web，前台守护；Ctrl+C 全停 | 日常开发 |
| `stop.sh` | 停止 `start.sh` 拉起的全部服务（按 PID 文件 + lsof 兜底） | 任意 |
| `init-first-run.sh` | 首次拉代码后跑一次：清依赖 → `pnpm install` → 生成 Prisma Client → `pnpm -r build` → 初始化 SQLite → 建默认用户 | 第一次进项目 / 改 monorepo 链接坏了 |
| `init-db.sh` | 仅重建 SQLite 数据库（不动依赖），强制 `prisma db push --force-reset` | 数据库 schema 变了 / 想清空业务数据 |
| `start-chroma.py` | 单独起 ChromaDB Server（端口 8000），脱离 `start.sh` 单服务调试时用 | 仅需向量库 |

典型流程：

```bash
bash scripts/dev/init-first-run.sh   # 第一次
bash scripts/dev/start.sh            # 起服务
# 写代码 / 测试 ...
# Ctrl+C 停止
```

---

## data/ —— 数据准备

| 脚本 | 用途 |
| --- | --- |
| `init-knowledge-base.py` | 从内置 JSON 把基础技术知识灌入 ChromaDB（约 40 条 Agent / RAG / LangChain 知识） |
| `bootstrap-kb.sh` | 拉起 `content-ingestion` 全量采集（dev.to / ruanyf-weekly / awesome / atom），扩展到 750+ 条；需要 `DASHSCOPE_API_KEY` |

按需调用：

```bash
# 1. 起 ChromaDB（dev/start.sh 已自带，但单跑也行）
python3 scripts/dev/start-chroma.py &

# 2. 灌入最小集
python3 scripts/data/init-knowledge-base.py

# 3. 或者全量 bootstrap
bash scripts/data/bootstrap-kb.sh
bash scripts/data/bootstrap-kb.sh --source devto --limit 50  # 单源限量
```

---

## deploy/ —— 生产部署（Linux）

适用于 Ubuntu Server 22.04+ 的服务器场景。

| 脚本 | 用途 | 何时跑 |
| --- | --- | --- |
| `init-linux.sh` | 全新服务器首次初始化：装 Node 18 / pnpm / Python 3 / ChromaDB / 必要时配 2GB swap | 新服务器开荒 |
| `deploy-linux.sh` | 一键完成「环境 + 项目 + systemd + 启动」全流程 | 全自动部署 |
| `setup-systemd.sh` | 仅配置 systemd（chromadb / web / mcp） | 已部署后单独改 systemd 配置 |
| `setup-swap.sh` | 创建 4GB swap（2GB 内存机跑 Next.js 构建避免 OOM） | 内存紧张时 |
| `update-server.sh` | 热更新：`git pull` → 重装依赖 → 重建 → 重启 systemd 服务 | 推送新版本后 |

典型上线：

```bash
sudo bash scripts/deploy/init-linux.sh        # 第一次
sudo bash scripts/deploy/deploy-linux.sh      # 一把梭部署
# 之后每次发版：
bash scripts/deploy/update-server.sh
```

---

## 命名约定

- shell 脚本：`<动作>-<对象>.sh`（kebab-case）
- python 脚本：`<动作>-<对象>.py`（kebab-case，与历史 `snake_case` 区分）
- 长期保留的工具脚本入 `scripts/`，临时一次性的脚本放 `tools/`

修改任何脚本时请保持 `set -e` / `set -euo pipefail` 等容错策略，并尊重 `SCRIPT_DIR/../..` 的根目录解析。
