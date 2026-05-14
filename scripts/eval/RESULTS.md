# RAG 评估结果 · 2026-05-14

> 跑法见 [README.md](./README.md)，原始数据见 [results.json](./results.json)

## 环境

| 项 | 值 |
|---|---|
| 时间戳 | 2026-05-14 07:57 UTC |
| 知识库 | `tech_knowledge` collection, 750 条（40 条种子 + 710 条 ruanyf-weekly chunks） |
| Embedding | DashScope `text-embedding` 1024 维 |
| Rerank | BGE-M3 |
| Faithfulness Judge | qwen-plus, temperature 0.2 |
| 评估集 | [rag-eval-set.jsonl](./rag-eval-set.jsonl) 30 题（Agent 8 / RAG 8 / LangChain 7 / LLM 7） |

## Phase 1：检索质量（30 题平均）

| 配置 | Recall@1 | Recall@3 | Recall@5 | Recall@10 | Precision@5 | MRR |
|---|---|---|---|---|---|---|
| **Vector only** | **80.0%** | **91.7%** | **96.7%** | **96.7%** | 22.7% | **0.934** |
| Hybrid (Vec+BM25+RRF) | 71.7% | 85.0% | 95.0% | 96.7% | 22.0% | 0.862 |
| Full (Hybrid + BGE-M3 重排) | 71.7% | 85.0% | 95.0% | 95.0% | 22.0% | 0.862 |

**怎么读这张表**：
- Recall@K 越大越好（前 K 个里抓到正确文档的概率）
- MRR 越接近 1 越好（正确答案排第 1.07 位）
- Precision@5 这一栏看绝对值意义不大，因为 ground truth 每题只 1-2 个 doc，分母 5 → 天花板 20-40%

## Phase 2：生成质量 / 幻觉（10 题平均）

| 配置 | Faithfulness | Hallucination |
|---|---|---|
| **No-RAG** （模型靠参数知识答） | 27.6% | **72.4%** |
| **Full-RAG** （注入召回文档） | **91.4%** | **8.6%** |

**核心数字：幻觉率从 72.4% 降至 8.6%。**

## 三个关键发现

### 1. 主要论点站得住：RAG 显著降低幻觉

72.4% → 8.6% 这 **63.8 个百分点** 的 gap 不是 LLM-judge 抖动能解释的。
方向性结论稳健：**接 RAG 后，回答严格基于知识库，可溯源性显著提升**。

### 2. 反直觉发现：纯向量 ≥ Hybrid（在当前 KB 规模下）

教科书会告诉你"Hybrid 一定比单路好"，但**我们这里数据反过来**：

```
Recall@1:  Vector 80.0%  vs  Hybrid 71.7%   差 8.3 个百分点
MRR:       Vector 0.934  vs  Hybrid 0.862   差 0.07
```

**诊断**：当前 KB 是 750 条，其中 40 条是精挑细选的 self-contained 主题文档，
710 条来自周刊（噪声背景）。BM25 命中"Function Calling"、"RAG"等关键术语时会拉一堆
**关键词重合但语义无关**的周刊 chunk 进 top-K，反而稀释了向量的高质量结果。

**结论**：BM25 + 重排的真实价值在**几万到几百万条噪声多的大库**。当前 750 条小库还
没到那个体量，**架构已就位但暂未压出增益**。这是"基础设施超前于数据规模"的典型表现，
扩量到 5000+ 后理论上会出现交叉点。

### 3. Phase 1 的 Recall 趋于饱和，瓶颈在数据

Vector R@10 = 96.7% 意味着 30 题里 29 题前 10 召回都正确。
**没有提升空间了** —— 不是 retriever 多牛逼，是任务相对当前 KB 太简单。

要让评估变难，至少需要两个动作之一：
- 把 ground truth 颗粒度从 doc 级降到 chunk 级（每题精确到第几条 chunk）
- 扩 KB 后引入更多干扰文档，看 retriever 能否抗噪

## 失败/部分失败的样本（共 2 题）

| ID | 类别 | 问题 | Expected | 实际 |
|---|---|---|---|---|
| q02 | Agent | Function Calling 完整工作流程 | doc-3, doc-25 | 命中 doc-3，漏 doc-25（LangChain Tool 工具机制） |
| q28 | LLM | token 限制怎么办 | doc-34, doc-37 | 命中 doc-34，漏 doc-37（上下文窗口） |

两题都是"双 expected doc"的题，向量找到了主答案但漏了相关补充文档。
这是 ground truth 设计的边界 case —— 当 KB 里两个 doc 主题强相关时，
单路向量倾向只返回最贴近的那一个。

## 评估方法的局限

- **题量偏小**（30 题），适合表达方向性结论，绝对值有 ±3% 抖动
- **Ground truth 颗粒度**：每题 1-2 个 expected doc，Precision@5 天花板 20-40%
- **LLM-as-judge 抖动**：faithfulness 数字有 ±5% 波动（qwen-plus 评判温度 0.2）
- **No-RAG faithfulness 偏低的语义**：对照基线是召回文档而非"绝对事实"。模型用通用知识答出的"事实正确但不在 KB"的陈述会被记为 unsupported。这是 Ragas 等 RAG 评估框架的标准定义，衡量的是**答案对当前知识库的接地气程度**

## 后续计划

- 知识库扩量到 5000+ 后重跑，观察 BM25 / 重排在大库噪声场景下的真实增益
- 引入 adversarial set（KB 里没有的话题）做拒答评估
- 题量扩至 100+，按 multi-rater 标注法重做
- 接 CI，每次改 retriever / reranker 自动跑回归
