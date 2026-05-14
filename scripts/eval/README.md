# RAG 评估套件

本目录包含 TechMate RAG 系统的端到端评估方法论、数据集和复现脚本。

## 目的

为 TechMate RAG 系统的核心指标（Recall@K、faithfulness、幻觉率）提供**可复现、可回归**的度量基准。
评估集 + 种子数据 + 脚本均纳入版本控制，任何环境跑两条命令即可复现。

## 文件清单

| 文件 | 作用 |
|---|---|
| `rag-eval-set.jsonl` | 30 题人工标注评估集，每题含 `question` / `expected_doc_ids` / `expected_keywords` |
| `results.json` | 最近一次评估的完整跑数（每题 vector/hybrid/full 三套召回 id + Phase 2 详情） |
| `RESULTS.md` | 当前结果的解读 + 关键发现 + 方法局限 + 后续计划 |
| `../../packages/rag-engine/scripts/run-rag-eval.ts` | 评估脚本（导入 rag-engine 内部组件直跑） |

## 数据依赖

评估集的 ground truth 是 **doc-1 ~ doc-40**，由项目的种子初始化脚本固定生成：

```bash
python3 scripts/data/init-knowledge-base.py
```

该脚本内嵌 40 条 KNOWLEDGE_DATA 数组（覆盖 Agent / RAG / LangChain / LLM 四个 topic），
写入 ChromaDB `tech_knowledge` collection 时使用确定性 id `doc-1` 到 `doc-40`。

**这意味着**：任何环境只要跑过 init 脚本，评估集都能直接复现。不存在"我自己造的私有数据"。

## 三个对比配置

| 配置 | 流水线 | 用途 |
|---|---|---|
| **Config B (Vector only)** | 仅 ChromaDB 向量检索 top-10 | baseline 1：单路 |
| **Config C (Hybrid + RRF)** | 向量 + BM25，RRF 融合 top-10，无重排 | baseline 2：混合 |
| **Config D (Full)** | 向量 + BM25 + RRF + BGE-M3 重排 top-5 | 全链路 |

## 两个评估阶段

### Phase 1：检索质量（30 题，纯检索指标）

- **Recall@K**：前 K 个返回里，有没有命中 ground truth 文档
- **Precision@5**：前 5 个返回里，相关文档占比（受 ground truth 数量天花板影响）
- **MRR (Mean Reciprocal Rank)**：第一个正确文档排第几，倒数平均

### Phase 2：生成质量（10 题，端到端生成指标）

- **Faithfulness**：LLM-as-judge 判断答案陈述能被召回文档支持的比例
  - 计算流程：(1) 数答案里独立事实陈述总数 N (2) 数其中能在召回文档里找到根据的 M (3) faithfulness = M/N
- **Hallucination rate = 1 - faithfulness**
- 对比两个变量：`No-RAG`（模型靠参数知识答）vs `Full-RAG`（注入召回文档后答）

## 复现步骤

```bash
# 1. 确保 ChromaDB 跑着 + tech_knowledge collection 已经初始化
curl -s http://localhost:8000/api/v2/heartbeat   # 应返回 200
python3 scripts/data/init-knowledge-base.py      # 若 doc-1~40 还未灌入

# 2. 确保 .env 有 DASHSCOPE_API_KEY（评估脚本用 qwen-plus 做 faithfulness judge）

# 3. 一条命令跑完
pnpm --filter @tech-mate/rag-engine exec tsx scripts/run-rag-eval.ts

# 输出会写入 scripts/eval/results.json，控制台同时打印汇总
```

预计耗时：**8-15 分钟**（受 DashScope embedding/LLM API 延迟影响）

## 评估方法的局限

1. **题量偏小**（30 题）—— 适合表达**方向性结论**，绝对值有 ±3% 抖动
2. **Ground truth 颗粒度**：每题 1-2 个 expected doc，Precision@5 天花板 20-40%
3. **LLM-as-judge 抖动**：faithfulness 数字本身有 ±5% 波动（qwen-plus 评判温度 0.2）
4. **No-RAG faithfulness 偏低的语义**：评判模型对照的是**召回文档**，所以模型用通用知识答出的"事实正确但不在 KB"的陈述也会被记为 unsupported。这是 RAG 评估的标准做法（Ragas 框架同思路），但解读时需要清楚这衡量的是**"答案对你这个知识库的接地气程度"** 而不是"绝对事实正确率"。

## 后续要做的

- [ ] 题量扩到 100+，按 ragas + multi-rater 标注法做一遍
- [ ] 加 "**adversarial set**"：刻意问 KB 里没有的话题，看 RAG 系统是否能 graceful 拒答而不是硬答
- [ ] 知识库扩量到 5000+ 后重跑，看 BM25/重排在大噪声场景的真实增益（目前 750 条规模下纯向量已饱和）
- [ ] 把 eval 接到 CI，每次改 retriever/reranker 自动跑回归
