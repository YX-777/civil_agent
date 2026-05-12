#!/usr/bin/env python3
"""
迁移本地 ChromaDB 的 tech_knowledge collection 到远程 ChromaDB。
只迁移 tech_knowledge，不动其他 collection（避免泄露本地长期记忆）。

用法：
  # 1. 本地启动 chromadb（如果没开）
  python3 start_chroma_server.py  # 监听 8000

  # 2. SSH tunnel 把远程 chromadb 映射到本地 8001
  #    保持这个 SSH 窗口开着
  ssh -N -L 8001:localhost:8000 ubuntu@<your-remote-server>

  # 3. 另开一个窗口跑迁移
  pip install chromadb tqdm
  python3 tools/migrate-tech-knowledge.py

参数（可选环境变量）：
  LOCAL_PORT=8000   本地 chromadb 端口
  REMOTE_PORT=8001  SSH tunnel 转发的远程 chromadb 端口
  BATCH_SIZE=200    每批拉/推的条数
"""
import os
import sys
import time

try:
    import chromadb
    from tqdm import tqdm
except ImportError:
    print("❌ 缺依赖：pip install chromadb tqdm", file=sys.stderr)
    sys.exit(1)

LOCAL_PORT = int(os.environ.get("LOCAL_PORT", 8000))
REMOTE_PORT = int(os.environ.get("REMOTE_PORT", 8001))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 200))
COLLECTION_NAME = "tech_knowledge"

print(f"📡 连接本地 ChromaDB http://localhost:{LOCAL_PORT}")
local = chromadb.HttpClient(host="localhost", port=LOCAL_PORT)

print(f"📡 连接远程 ChromaDB http://localhost:{REMOTE_PORT} (SSH tunnel)")
remote = chromadb.HttpClient(host="localhost", port=REMOTE_PORT)

# 健康检查
try:
    local.heartbeat()
    remote.heartbeat()
except Exception as e:
    print(f"❌ 连接失败：{e}")
    print(f"   检查：本地 chroma 是否启动？SSH tunnel 是否开着（-L {REMOTE_PORT}:localhost:8000）？")
    sys.exit(1)

# 源
try:
    src = local.get_collection(COLLECTION_NAME)
except Exception as e:
    print(f"❌ 本地没有 {COLLECTION_NAME} collection：{e}")
    sys.exit(1)

total = src.count()
print(f"📦 本地 {COLLECTION_NAME}: {total} 条")

# 目标：先尝试取 → 没有就新建
try:
    dst = remote.get_collection(COLLECTION_NAME)
    existing = dst.count()
    print(f"📦 远程 {COLLECTION_NAME}: {existing} 条")
    if existing > 0:
        ans = input(f"⚠️  远程已有 {existing} 条，是否清空后重灌？(y/N) ").strip().lower()
        if ans == "y":
            remote.delete_collection(COLLECTION_NAME)
            dst = remote.create_collection(COLLECTION_NAME)
            print(f"   ✅ 已清空，重新创建")
        else:
            print("   将合并（按 id 去重，远程已有的 id 会跳过）")
except Exception:
    print(f"📦 远程没有 {COLLECTION_NAME}，新建")
    dst = remote.create_collection(COLLECTION_NAME)

# 批量迁移
print(f"🚀 开始迁移，每批 {BATCH_SIZE} 条...")
migrated = 0
skipped = 0
errors = 0

for offset in tqdm(range(0, total, BATCH_SIZE), desc="迁移进度"):
    try:
        data = src.get(
            limit=BATCH_SIZE,
            offset=offset,
            include=["documents", "metadatas", "embeddings"],
        )
        if not data["ids"]:
            continue

        # upsert 比 add 安全（同 id 会覆盖而不是报错）
        dst.upsert(
            ids=data["ids"],
            documents=data["documents"],
            metadatas=data["metadatas"],
            embeddings=data["embeddings"],
        )
        migrated += len(data["ids"])
    except Exception as e:
        errors += 1
        print(f"\n⚠️  批次 offset={offset} 失败：{e}")
        time.sleep(2)

print()
print(f"✅ 迁移完成：成功 {migrated} 条，跳过 {skipped} 条，失败批次 {errors}")
print(f"   远程当前总数：{dst.count()} 条")
