#!/usr/bin/env python3
"""
启动 ChromaDB Server
"""

import subprocess
import sys
import os

# Chroma CLI 安装路径（pip 安装在用户目录）
CHROMA_PATH = "/Users/sxh/Library/Python/3.9/bin/chroma"

def main():
    # 检查 chromadb 是否安装
    try:
        import chromadb
        print(f"✅ ChromaDB 已安装: {chromadb.__version__}")
    except ImportError:
        print("❌ ChromaDB 未安装，正在安装...")
        subprocess.run([sys.executable, "-m", "pip", "install", "chromadb"], check=True)

    # 检查 chroma CLI 是否存在
    if not os.path.exists(CHROMA_PATH):
        print(f"❌ chroma CLI 不存在: {CHROMA_PATH}")
        print("   请先安装: pip install chromadb")
        sys.exit(1)

    # 启动 server
    print("\n🚀 正在启动 ChromaDB Server...")
    print("   地址: http://localhost:8000")
    print("   数据路径: ./data/chroma")
    print("\n   按 Ctrl+C 停止服务\n")

    # 使用绝对路径启动 chroma CLI
    subprocess.run([
        CHROMA_PATH,
        "run",
        "--host", "localhost",
        "--port", "8000",
        "--path", "./data/chroma"
    ])

if __name__ == "__main__":
    main()