#!/bin/bash
# TechMate 知识库一键填充脚本（在远程服务器上跑）
#
# 跑 packages/content-ingestion 的 bootstrap，依次拉：
#   hf-blog / langchain-blog / weekly / awesome / devto
#
# 内存友好：单进程，串行 fetch + embedding，峰值 ~300MB，2GB 机器 + swap 没问题。
#
# 用法：
#   bash bootstrap-kb.sh                # 全量跑
#   bash bootstrap-kb.sh --source devto # 只跑某一个源（透传给 cli）
#   bash bootstrap-kb.sh --limit 50     # 调单源 limit

set -e

# 切换到项目根目录（脚本位于 scripts/data/）
cd "$(dirname "$0")/../.."

echo "=========================================="
echo "  TechMate 知识库 bootstrap"
echo "=========================================="

# 1. 检查 ChromaDB 服务
echo ""
echo "1️⃣  检查 ChromaDB..."
if ! curl -s --max-time 5 http://localhost:8000/api/v1/heartbeat >/dev/null 2>&1; then
  echo "   ❌ ChromaDB 未在 8000 端口运行"
  echo "      请先启动：systemctl start techmate-chroma 或 bash scripts/dev/start.sh"
  exit 1
fi
echo "   ✅ ChromaDB 在线"

# 2. 当前知识库规模
BEFORE=$(curl -s http://localhost:8000/api/v1/collections 2>/dev/null \
  | python3 -c "import json,sys,urllib.request; \
cols=json.load(sys.stdin); \
tk=next((c for c in cols if c.get('name')=='tech_knowledge'),None); \
print(0 if not tk else __import__('urllib.request').request.urlopen(f'http://localhost:8000/api/v1/collections/{tk[\"id\"]}/count').read().decode())" 2>/dev/null || echo "0")
echo "   📊 当前 tech_knowledge: $BEFORE 条"

# 3. 检查 .env DASHSCOPE_API_KEY（embedding 调用必需）
if [ -f packages/web/.env ]; then
  if ! grep -q "DASHSCOPE_API_KEY=.\+" packages/web/.env 2>/dev/null; then
    echo "   ⚠️  packages/web/.env 缺少 DASHSCOPE_API_KEY，embedding 会失败"
    exit 1
  fi
  # 把 .env 导出到当前 shell（content-ingestion 通过 process.env 读）
  set -a
  source packages/web/.env
  set +a
else
  echo "   ⚠️  packages/web/.env 不存在"
  exit 1
fi

# 4. 内存检查（提示，不强制）
echo ""
echo "2️⃣  系统状态..."
free -h 2>/dev/null | head -3 || true

# 5. 解析参数：默认跑 bootstrap，传 --source 走单源 cli
if [ "$1" = "--source" ]; then
  echo ""
  echo "3️⃣  单源采集: $2 ${@:3}"
  pnpm --filter @tech-mate/content-ingestion ingest -- "$@"
else
  echo ""
  echo "3️⃣  全源 bootstrap（预计 5-15 分钟）..."
  pnpm --filter @tech-mate/content-ingestion bootstrap
fi

# 6. 入库后规模
echo ""
echo "4️⃣  入库结果"
AFTER=$(curl -s http://localhost:8000/api/v1/collections 2>/dev/null \
  | python3 -c "import json,sys,urllib.request; \
cols=json.load(sys.stdin); \
tk=next((c for c in cols if c.get('name')=='tech_knowledge'),None); \
print(0 if not tk else __import__('urllib.request').request.urlopen(f'http://localhost:8000/api/v1/collections/{tk[\"id\"]}/count').read().decode())" 2>/dev/null || echo "?")
echo "   📊 tech_knowledge: $BEFORE → $AFTER 条"

# 7. 类目分布
echo ""
echo "5️⃣  类目分布（从 sqlite）"
CHROMA_DB="$(find data/chroma -name chroma.sqlite3 2>/dev/null | head -1)"
if [ -n "$CHROMA_DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$CHROMA_DB" \
    "SELECT em.string_value as cat, COUNT(*) FROM embedding_metadata em WHERE em.key='category' GROUP BY em.string_value ORDER BY COUNT(*) DESC;" 2>/dev/null | sed 's/^/   /'
fi

echo ""
echo "=========================================="
echo "  ✅ bootstrap 完成"
echo "=========================================="
