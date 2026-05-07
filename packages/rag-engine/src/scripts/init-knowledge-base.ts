/**
 * 技术知识库初始化脚本
 * 包含 Agent/RAG/LangChain/大模型 40条知识数据
 */

import { VectorRetriever } from "../retrievers/vector-retriever";
import { BM25Retriever } from "../retrievers/bm25-retriever";

// ==================== Agent 知识 (10条) ====================
const AGENT_KNOWLEDGE = [
  {
    content: `Agent 核心概念

什么是 AI Agent？
Agent 是一种能够自主决策、调用工具、完成复杂任务的智能代理系统。与普通 LLM 对话不同，Agent 具备以下核心能力：

1. 自主决策能力
Agent 能够分析用户意图，自主决定下一步行动，而不是简单地生成文本回复。

2. 工具调用能力
Agent 可以调用外部工具（API、数据库、搜索引擎等）来获取信息或执行操作。

3. 循环执行能力
Agent 采用 Thought-Action-Observation 循环，持续迭代直到完成任务。

Agent 与普通 LLM 的区别：
- 普通 LLM：输入 → 输出文本
- Agent：输入 → 分析 → 调用工具 → 观察结果 → 继续执行 → 最终输出

典型应用场景：
- 智能客服：自动查询订单、处理退款
- 数据分析：自动获取数据、生成报告
- 自动化工作流：跨系统任务编排`,
    metadata: { title: "Agent 核心概念", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `LangChain Agent 架构

LangChain Agent 采用三层架构设计：

1. Agent（决策引擎）
负责分析用户输入，决定调用哪个工具，以及如何组合多个工具完成任务。

核心方法：
- plan(): 分析输入，生成执行计划
- decide(): 根据当前状态选择下一步行动

2. Tools（工具集）
定义 Agent 可调用的外部能力，每个工具包含：
- name: 工具名称
- description: 工具描述（Agent 根据描述选择工具）
- func: 实际执行函数

示例定义：
const tools = [
  new Tool({
    name: "search",
    description: "搜索互联网获取信息",
    func: (query) => searchAPI(query)
  }),
  new Tool({
    name: "calculator",
    description: "执行数学计算",
    func: (expr) => eval(expr)
  })
];

3. AgentExecutor（执行器）
编排 Agent 的执行流程，管理工具调用、错误处理、循环控制。

执行流程：
初始化 → Agent.decide() → 执行工具 → 观察结果 → 继续或结束`,
    metadata: { title: "LangChain Agent 架构", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `Tool Calling 原理

Function Calling 是 LLM 调用外部工具的核心机制：

1. 工具注册
将工具定义注册到 LLM，包含参数 Schema：

const toolSchema = {
  name: "get_weather",
  description: "获取指定城市的天气信息",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "城市名称" },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] }
    },
    required: ["city"]
  }
};

2. LLM 决策
LLM 分析用户输入，决定是否调用工具，并生成参数：

用户输入："北京今天天气怎么样？"
LLM 输出：{ tool: "get_weather", arguments: { city: "北京" } }

3. 参数解析
从 LLM 输出中提取工具名称和参数，验证参数有效性。

4. 工具执行
调用实际工具函数，获取结果。

5. 结果回传
将工具结果返回给 LLM，继续生成最终回复。

LangChain Tool 实现：
class Tool {
  name: string;
  description: string;
  func: (input: string) => string;
}`,
    metadata: { title: "Tool Calling 原理", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `Agent 类型对比

LangChain 提供多种 Agent 类型，适用于不同场景：

1. ZeroShotAgent（零样本决策）
- 特点：无需示例，直接根据工具描述选择
- 适用：工具数量少、任务明确的场景
- 优势：快速部署、简单易用
- 缺点：复杂任务可能决策错误

2. ConversationalAgent（对话式代理）
- 特点：支持多轮对话，保持上下文记忆
- 适用：客服、助手类应用
- 优势：用户体验连贯
- 缺点：长对话可能偏离目标

3. ReActAgent（推理+行动）
- 特点：显式 Thought-Action-Observation 循环
- 适用：需要复杂推理的任务
- 优势：决策过程透明、可调试
- 缺点：执行步骤多、耗时较长

4. StructuredToolAgent（结构化工具调用）
- 特点：支持多参数、复杂 Schema
- 适用：API 调用、数据库操作
- 优势：参数验证严格、错误率低
- 缺点：Schema 定义复杂

选择建议：
- 简单工具调用 → ZeroShotAgent
- 多轮对话 → ConversationalAgent
- 复杂推理任务 → ReActAgent
- API/数据库操作 → StructuredToolAgent`,
    metadata: { title: "Agent 类型对比", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `ReAct 推理模式

ReAct = Reasoning + Acting，是一种显式的推理-行动循环模式：

核心循环：Thought → Action → Observation

1. Thought（推理）
Agent 分析当前状态，生成推理过程：
"用户想知道北京的天气，我需要调用天气工具"

2. Action（行动）
根据推理结果，选择并执行工具：
Action: get_weather("北京")

3. Observation（观察）
获取工具执行结果：
Observation: 北京今天晴，温度25°C

4. 继续循环
根据观察结果，继续推理或结束：
"已获取天气信息，可以回复用户"
Final Answer: 北京今天晴天，温度25摄氏度

ReAct 优势：
- 决策过程透明，便于调试
- 错误可追溯，容易定位问题
- 支持复杂任务的分步执行

LangChain ReAct 实现：
const agent = Agent.fromAgentAndTools({
  agentType: "react",
  tools: [searchTool, calculatorTool],
  llm: chatModel
});`,
    metadata: { title: "ReAct 推理模式", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `多 Agent 协作

复杂任务需要多个 Agent 协作完成：

1. 任务分解
将复杂任务分解为子任务，分配给不同 Agent：
- 主 Agent：任务分配、结果汇总
- 子 Agent：执行具体子任务

2. Agent 间通信
Agent 通过共享状态或消息传递进行协作：

共享状态模式：
const sharedState = {
  taskQueue: [],
  results: {},
  status: {}
};

消息传递模式：
agentA.sendMessage(agentB, { type: "task_complete", data: result });

3. 协作模式
- 顺序协作：Agent A → Agent B → Agent C
- 并行协作：多个 Agent 同时执行
- 层级协作：主 Agent 分配任务，子 Agent 执行

LangGraph 多 Agent 实现：
const workflow = new StateGraph({
  channels: { input, output, intermediate }
})
  .addNode("agentA", agentANode)
  .addNode("agentB", agentBNode)
  .addEdge("agentA", "agentB");

应用场景：
- 数据处理流水线：采集 → 清洗 → 分析 → 存储
- 客服系统：意图识别 → 信息查询 → 回复生成`,
    metadata: { title: "多 Agent 协作", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `Agent 记忆机制

Agent 需要记忆系统来保持上下文和历史信息：

1. 短期记忆（对话记忆）
存储当前对话的上下文信息：
- 最近 N 条消息
- 当前任务状态

LangChain 实现：
const memory = new ConversationBufferMemory({
  returnMessages: true,
  memoryKey: "chat_history"
});

2. 长期记忆（向量记忆）
将历史对话存储到向量数据库，支持语义检索：
- 用户偏好
- 历史任务记录

实现方案：
const vectorMemory = new VectorStoreMemory({
  vectorStore: chromaStore,
  inputKey: "input",
  memoryKey: "history"
});

3. 记忆检索策略
- 时间窗口：只保留最近 N 条
- 重要性筛选：保留关键信息
- 语义检索：检索相关历史

记忆优化技巧：
- 定期压缩：将长对话压缩为摘要
- 分类存储：按主题分类存储记忆
- 去重过滤：避免重复信息`,
    metadata: { title: "Agent 记忆机制", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `Agent 规划能力

复杂任务需要 Agent 进行规划和任务分解：

1. 任务分解（Plan-and-Execute）
将大任务分解为有序子任务：

Plan 步骤：
输入：用户想要完成 X
输出：任务列表 [step1, step2, step3]

Execute 步骤：
按顺序执行每个子任务，记录结果

LangChain 实现：
const executor = PlanAndExecuteAgent.fromLLMAndTools({
  llm: plannerLLM,
  tools: executionTools
});

2. 动态规划
根据执行结果动态调整计划：
- 执行失败 → 重新规划
- 发现新需求 → 补充任务

3. 执行顺序优化
- 依赖分析：确定任务依赖关系
- 并行执行：无依赖的任务并行处理
- 错误隔离：单个任务失败不影响整体

最佳实践：
- 任务粒度适中，避免过细或过粗
- 关键任务优先执行
- 设置任务超时和重试机制`,
    metadata: { title: "Agent 规划能力", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `Agent 常见问题与解决方案

1. 工具选择错误
现象：Agent 调用了不合适的工具
原因：工具描述不清晰、工具数量过多
解决：
- 优化工具 description，明确适用场景
- 工具数量控制在 10 个以内
- 使用 StructuredToolAgent 增强参数验证

2. 死循环问题
现象：Agent 重复执行相同步骤
原因：缺少终止条件、工具返回异常
解决：
- 设置最大循环次数（max_iterations）
- 添加早停条件（early_stopping_method）
- 工具返回明确的结束信号

3. 幻觉导致的错误决策
现象：Agent 基于幻觉信息做出错误决策
原因：LLM 生成虚构信息、缺少事实验证
解决：
- 使用 RAG 提供真实上下文
- 工具结果优先于 LLM 推理
- 添加事实校验步骤

4. 任务偏离
现象：Agent 执行了与目标无关的操作
原因：缺少目标约束、中间步骤过多
解决：
- 明确任务目标，每步验证是否偏离
- 使用 ReActAgent 显式推理过程
- 设置任务完成条件检测

调试技巧：
- 使用 LangSmith 追踪完整执行链路
- 打印 Thought/Action/Observation 日志
- 单步调试工具调用`,
    metadata: { title: "Agent 常见问题", source: "TechMate 知识库", category: "agent" },
  },
  {
    content: `Agent 实战案例

案例一：智能客服 Agent

场景：用户查询订单状态、处理退款
架构：
- 意图识别 Agent：识别用户意图（查询/退款/投诉）
- 订单查询 Tool：调用订单 API
- 退款处理 Tool：调用退款 API
- 回复生成 Agent：生成客服回复

实现：
const customerServiceAgent = AgentExecutor.fromAgentAndTools({
  agentType: "conversational",
  tools: [orderQueryTool, refundTool, knowledgeBaseTool],
  memory: conversationMemory
});

案例二：数据分析 Agent

场景：自动获取数据、分析、生成报告
架构：
- 数据获取 Tool：从数据库/API 获取数据
- 分析计算 Tool：执行统计分析
- 可视化 Tool：生成图表
- 报告生成 Agent：整合结果生成报告

案例三：代码生成 Agent

场景：根据需求生成代码
架构：
- 需求分析 Agent：理解用户需求
- 代码生成 Tool：调用代码生成 API
- 代码验证 Tool：执行代码检查
- 文档生成 Tool：生成使用文档

关键设计原则：
- 单一职责：每个 Tool 只做一件事
- 错误处理：工具失败有降级方案
- 结果验证：验证工具返回的有效性`,
    metadata: { title: "Agent 实战案例", source: "TechMate 知识库", category: "agent" },
  },
];

// ==================== RAG 知识 (12条) ====================
const RAG_KNOWLEDGE = [
  {
    content: `RAG 核心原理

什么是 RAG？
RAG = Retrieval-Augmented Generation，检索增强生成。它通过检索外部知识来增强 LLM 的生成能力。

RAG 与微调的区别：

| 方式 | 原理 | 适用场景 | 成本 |
|------|------|----------|------|
| 微调 | 更新模型参数 | 特定风格/领域适配 | 高（需训练） |
| RAG | 检索外部知识 | 动态知识、事实问答 | 低（无需训练） |

RAG 核心优势：
1. 知识实时更新：无需重新训练模型
2. 减少幻觉：基于检索的事实生成
3. 可追溯性：答案来源可追踪
4. 成本低：无需大规模训练资源

RAG 适用场景：
- 企业知识库问答
- 技术文档问答
- 客服智能助手
- 法律/医疗等专业领域问答

何时选择 RAG：
- 知识频繁更新
- 需要引用具体来源
- 预算有限无法微调
- 事实准确性要求高`,
    metadata: { title: "RAG 核心原理", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `RAG 流程详解

完整的 RAG 流程包含五个步骤：

1. Query（用户查询）
用户输入问题："什么是 React Hooks？"

2. Embedding（向量化）
将用户查询转换为向量：
queryEmbedding = embeddingModel.encode("什么是 React Hooks？")

Embedding 模型选择：
- text-embedding-ada-002（OpenAI）
- text-embedding-v2（阿里云）
- bge-large-zh（开源中文模型）

3. Retrieval（检索）
在向量数据库中检索相似文档：
results = vectorDB.search(queryEmbedding, topK=5)

检索策略：
- 向量检索：语义相似度
- 关键词检索：精确匹配
- 混合检索：两者结合

4. Prompt 构建
将检索结果构建为 Prompt：
prompt = f"根据以下知识回答问题：
知识：{retrieved_docs}
问题：{query}"

5. Generation（生成）
LLM 基于 Prompt 生成答案：
answer = llm.generate(prompt)

优化点：
- Query 改写：优化查询表达
- 多路召回：提高检索覆盖
- 重排序：筛选最相关结果`,
    metadata: { title: "RAG 流程详解", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `向量数据库对比

主流向量数据库对比：

| 数据库 | 特点 | 适用场景 |
|--------|------|----------|
| Chroma | 轻量级、易部署、本地优先 | 开发测试、中小规模 |
| Pinecone | 云托管、高性能、免运维 | 生产环境、大规模 |
| Milvus | 开源、分布式、高性能 | 大规模企业应用 |
| Weaviate | 云原生、支持多种索引 | 混合检索场景 |
| Qdrant | Rust 实现、高性能 | 高并发场景 |

Chroma 特点：
- 本地部署，无需云服务
- Python/JS SDK 支持
- 内置 Embedding 集成
- 适合开发和小规模应用

选型建议：
- 开发阶段 → Chroma（快速迭代）
- 生产环境 → Pinecone（免运维）
- 大规模 → Milvus（分布式）

Chroma 基础操作：
import chromadb
client = chromadb.Client()
collection = client.create_collection("docs")
collection.add(documents=["doc1", "doc2"])
results = collection.query(query_texts=["query"])`,
    metadata: { title: "向量数据库对比", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `向量检索原理

Embedding 向量化原理：

Embedding 模型将文本转换为高维向量：
输入："React Hooks 是状态管理工具"
输出：[0.1, -0.2, 0.3, ...] (1536维)

向量语义特性：
- 相似文本 → 向量相近
- 不同文本 → 向量远离

相似度计算方法：

1. Cosine Similarity（余弦相似度）
cosine_sim = dot(a, b) / (norm(a) * norm(b))
范围：[-1, 1]，越大越相似

2. Euclidean Distance（欧氏距离）
euclidean_dist = sqrt(sum((a - b)^2))
范围：[0, ∞]，越小越相似

3. Dot Product（点积）
dot_product = sum(a * b)
范围：取决于向量归一化

推荐使用余弦相似度：
- 不受向量长度影响
- 只关注方向相似性
- 语义检索效果更好

Chroma 默认使用余弦相似度`,
    metadata: { title: "向量检索原理", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `BM25 关键词检索

BM25 是经典的关键词检索算法：

核心公式：
BM25(D, Q) = sum(IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D|/avgDl)))

关键要素：
1. TF（词频）：词在文档中出现次数
2. IDF（逆文档频率）：词的稀有程度
3. 文档长度归一化

BM25 vs 向量检索：

| 对比项 | BM25 | 向量检索 |
|--------|------|----------|
| 查询方式 | 关键词精确匹配 | 语义相似度 |
| 理解能力 | 无语义理解 | 语义理解 |
| 精确匹配 | 强 | 弱 |
| 同义词扩展 | 弱 | 强 |
| 中文支持 | 需分词 | 原生支持 |

BM25 适用场景：
- 专业术语搜索（如代码函数名）
- 精确关键词查询
- 与向量检索互补

中文 BM25 实现：
需要中文分词（jieba/pkuseg）：
import jieba
tokens = jieba.cut("React Hooks入门")
# ['React', 'Hooks', '入门']`,
    metadata: { title: "BM25 关键词检索", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `Hybrid 混合检索

Hybrid = 向量检索 + BM25 关键词检索

为什么需要混合检索：
- 向量检索擅长语义理解，但精确匹配弱
- BM25 擅长关键词匹配，但无语义理解
- 混合检索互补，提高召回率

融合算法 - RRF（Reciprocal Rank Fusion）：

RRF(d) = sum(1 / (k + rank(d, method_i)))

其中 k 通常取 60

示例：
文档 A：向量排名 2，BM25 排名 5
RRF(A) = 1/(60+2) + 1/(60+5) = 0.016 + 0.015 = 0.031

实现流程：
1. 并行执行向量检索和 BM25 检索
2. 各返回 topK 结果
3. 使用 RRF 融合排名
4. 返回融合后的 topN 结果

HybridRetriever 实现：
const vectorResults = await vectorRetriever.search(query, topK=20);
const bm25Results = await bm25Retriever.search(query, topK=20);
const fusedResults = rrfFusion(vectorResults, bm25Results, topN=10);`,
    metadata: { title: "Hybrid 混合检索", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `Re-ranking 重排

Re-ranking 是在初次检索后进行精细排序：

两阶段检索架构：
第一阶段：粗检索（快速，大量候选）
第二阶段：重排序（精细，少量候选）

为什么需要重排：
- 初检模型轻量，精度有限
- 重排模型精细，计算成本高
- 分阶段处理平衡速度和精度

常用重排模型：

1. BGE-M3
- 多语言支持
- 高精度重排
- 支持稠密/稀疏/混合检索

2. Cohere Rerank
- 云 API 服务
- 高精度
- 多语言支持

重排流程：
candidates = hybridRetrieval(query, topK=50)
reranked = reranker.rerank(query, candidates, topN=10)

重排输入：
{
  query: "什么是 React Hooks",
  documents: ["doc1...", "doc2...", ...]
}

重排输出：
[
  { document: "doc1", score: 0.95 },
  { document: "doc2", score: 0.82 },
  ...
]

优化建议：
- 初检返回足够多候选（50-100）
- 重排选择少量结果（10-20）
- 重排模型与检索模型解耦`,
    metadata: { title: "Re-ranking 重排", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `LlamaIndex 概述

LlamaIndex 是专门为 RAG 应用设计的数据框架：

定位：连接自定义数据源到 LLM

核心组件：

1. Reader（数据读取）
从各种数据源读取文档：
- SimpleDirectoryReader：读取本地文件夹
- WebPageReader：读取网页
- DatabaseReader：读取数据库

2. Index（索引构建）
构建不同类型的索引：
- VectorStoreIndex：向量索引
- KeywordTableIndex：关键词索引
- TreeIndex：树形索引

3. Retriever（检索执行）
从索引中检索相关内容：
- VectorIndexRetriever
- KeywordTableRetriever

4. QueryEngine（查询引擎）
编排检索和生成流程：
queryEngine = index.as_query_engine()
response = queryEngine.query("什么是 RAG？")

快速开始：
from llama_index import VectorStoreIndex, SimpleDirectoryReader
documents = SimpleDirectoryReader("./docs").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("your query")`,
    metadata: { title: "LlamaIndex 概述", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `LlamaIndex vs LangChain

核心定位差异：

| 框架 | 定位 | 核心能力 |
|------|------|----------|
| LlamaIndex | 数据框架 | 索引构建、检索优化、知识管理 |
| LangChain | Agent 编排框架 | Chain、Tool、Memory、流程控制 |

详细对比：

1. 数据处理
- LlamaIndex：丰富的 Reader，支持 PDF/数据库/API
- LangChain：基础文档加载，需要额外配置

2. 检索能力
- LlamaIndex：内置多种索引、检索策略、重排
- LangChain：基础向量检索，需自行实现高级功能

3. Agent 能力
- LlamaIndex：简单的 ReAct Agent
- LangChain：强大的 Agent 编排、多 Agent 协作

4. 适用场景
- LlamaIndex：文档问答、知识库、RAG 优化
- LangChain：Agent 应用、多步骤任务、工具调用

协同使用：
LangChain 负责 Agent 流程编排
LlamaIndex 负责 RAG 检索模块

from langchain.agents import AgentExecutor
from llama_index import VectorStoreIndex

# LlamaIndex 提供检索能力
index = VectorStoreIndex.from_documents(docs)
retriever = index.as_retriever()

# LangChain 提供 Agent 编排
agent = AgentExecutor.from_agent_and_tools(...)`,
    metadata: { title: "LlamaIndex vs LangChain", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `知识库构建

知识库构建的关键步骤：

1. 数据收集
来源选择：
- 内部文档：产品文档、技术文档
- 外部数据：博客、论文、API 文档
- 用户数据：FAQ、历史问答

2. 文档切分（Chunking）
切分策略：
- 固定长度：每块 500-1000 字符
- 语义切分：按段落/标题切分
- 滑动窗口：Overlap 50-100 字符

最佳实践：
- Chunk Size：500-1000 字符
- Overlap：10-20%
- 保留上下文：包含标题/元数据

LlamaIndex 切分：
from llama_index.node_parser import SimpleNodeParser
parser = SimpleNodeParser.from_defaults(
  chunk_size=512,
  chunk_overlap=50
)
nodes = parser.get_nodes_from_documents(docs)

3. 元数据添加
为每个 Chunk 添加元数据：
metadata = {
  source: "React文档.pdf",
  page: 15,
  category: "react",
  title: "Hooks入门"
}

4. 向量化存储
将切分后的文档向量化并存入向量数据库`,
    metadata: { title: "知识库构建", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `RAG 常见问题

问题一：检索召回不足
现象：查询返回的文档与问题不相关
原因：
- Embedding 模型不适合该领域
- 知识库内容覆盖不全
- 查询表达与文档表达差异

解决：
- 使用领域适配的 Embedding 模型
- 扩充知识库内容
- Query 改写优化

问题二：幻觉问题
现象：LLM 生成与检索内容不符的信息
原因：
- 检索结果被忽略
- LLM 过度依赖自身知识
- Prompt 指令不够明确

解决：
- 强化 Prompt 指令："仅根据检索内容回答"
- 使用低温度参数（temperature=0.1）
- 添加来源引用要求

问题三：知识库更新延迟
现象：新知识未及时反映在回答中
原因：
- 知识库更新周期长
- 缺少增量更新机制

解决：
- 增量索引：新文档实时添加
- 定期重建：全量更新索引
- 混合策略：增量 + 定期全量`,
    metadata: { title: "RAG 常见问题", source: "TechMate 知识库", category: "rag" },
  },
  {
    content: `RAG 优化策略

三级检索策略：

1. Precise（精确检索）
- 目标：高度相关的精确答案
- 条件：Query 与知识高度匹配
- 实现：高相似度阈值（>0.8）

2. Candidates（候选检索）
- 目标：提供多个候选答案
- 条件：Query 有一定相关性
- 实现：中等阈值（0.5-0.8）

3. Expand（扩展检索）
- 目标：泛化知识检索
- 条件：Query 匹配度低
- 实现：放宽条件、扩大范围

4. Fallback（兜底）
- 目标：避免无结果返回
- 条件：所有检索无结果
- 实现：返回通用知识或提示用户

Fallback 机制：
if preciseResults.length === 0:
  if candidateResults.length > 0:
    return candidateResults
  else:
    return fallbackResponse("暂无相关知识")

Query 改写优化：
原始 Query："怎么用 Hooks"
改写后："React Hooks 使用方法和最佳实践"

改写方法：
- 扩展关键词
- 补充上下文
- 规范化表达`,
    metadata: { title: "RAG 优化策略", source: "TechMate 知识库", category: "rag" },
  },
];

// ==================== LangChain 知识 (9条) ====================
const LANGCHAIN_KNOWLEDGE = [
  {
    content: `LangChain 核心概念

LangChain 是一个 LLM 应用开发框架，核心组件：

1. Chain（链）
将多个组件串联执行：
SimpleChain: LLM → Output
SequentialChain: Input → LLM1 → LLM2 → Output

2. Tool（工具）
定义 LLM 可调用的外部能力：
const tool = new Tool({
  name: "search",
  description: "搜索互联网",
  func: (query) => searchAPI(query)
});

3. Memory（记忆）
保持对话上下文和历史信息：
ConversationBufferMemory: 存储完整对话
VectorStoreMemory: 向量检索历史

4. Prompt Template（提示模板）
结构化的 Prompt 定义：
const template = PromptTemplate.fromTemplate(
  "你是一个{role}，请回答：{question}"
);

核心设计理念：
- 模块化：组件独立、可组合
- 可扩展：自定义组件
- 可观测：执行过程可追踪`,
    metadata: { title: "LangChain 核心概念", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `Chain 编排模式

LangChain 提供多种 Chain 编排模式：

1. SimpleChain（简单链）
单一组件执行：
const chain = new LLMChain({
  llm: chatModel,
  prompt: promptTemplate
});
const result = await chain.run("你好");

2. SequentialChain（顺序链）
多个链顺序执行，传递中间结果：
const chain = new SequentialChain({
  chains: [extractChain, summarizeChain],
  inputVariables: ["text"],
  outputVariables: ["summary"]
});

3. RouterChain（路由链）
根据输入动态选择子链：
const routerChain = new RouterChain({
  destinations: {
    "技术问题": techChain,
    "闲聊": chatChain
  },
  defaultChain: defaultChain
});

4. TransformChain（转换链）
处理中间数据转换：
const transformChain = new TransformChain({
  transform: (input) => ({ processed: processData(input) })
});

组合使用：
const chain = new SequentialChain({
  chains: [routerChain, transformChain, llmChain]
});`,
    metadata: { title: "Chain 编排模式", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `Tool 工具机制

LangChain Tool 定义规范：

基础定义：
const tool = new Tool({
  name: "calculator",       // 工具名称（唯一）
  description: "执行数学计算，输入数学表达式",  // 描述（Agent 依据此选择）
  func: (input) => eval(input)  // 执行函数
});

StructuredTool（结构化工具）：
支持多参数和 Schema 定义：
const tool = new StructuredTool({
  name: "weather",
  description: "获取天气信息",
  schema: {
    city: { type: "string" },
    date: { type: "string", optional: true }
  },
  func: async ({ city, date }) => {
    return await weatherAPI.get(city, date);
  }
});

Tool 调用流程：
1. Agent 分析用户输入
2. 根据 description 选择工具
3. 解析参数并调用 func
4. 返回结果给 Agent

工具设计原则：
- 单一职责：一个工具只做一件事
- 描述清晰：明确适用场景和参数
- 错误处理：返回友好错误信息`,
    metadata: { title: "Tool 工具机制", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `Memory 记忆系统

LangChain Memory 类型：

1. ConversationBufferMemory
存储完整对话历史：
const memory = new ConversationBufferMemory({
  memoryKey: "chat_history",
  returnMessages: true
});
// 存储所有消息，无压缩

缺点：长对话 Token 消耗大

2. ConversationBufferWindowMemory
只保留最近 N 条消息：
const memory = new ConversationBufferWindowMemory({
  k: 5  // 只保留最近5条
});

优点：控制 Token 消耗

3. ConversationSummaryMemory
将历史对话压缩为摘要：
const memory = new ConversationSummaryMemory({
  llm: chatModel,
  memoryKey: "summary"
});

优点：保留关键信息，节省 Token

4. VectorStoreMemory
将历史存储到向量数据库，支持检索：
const memory = new VectorStoreMemory({
  vectorStore: chromaStore,
  memoryKey: "relevant_history"
});

适用：需要检索相关历史场景

选择建议：
- 短对话 → ConversationBufferMemory
- 长对话 → ConversationSummaryMemory
- 需检索历史 → VectorStoreMemory`,
    metadata: { title: "Memory 记忆系统", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `Prompt Template

Prompt Template 结构化定义：

基础模板：
const template = PromptTemplate.fromTemplate(
  "你是一个{role}助手，请回答用户问题：{question}"
);

const prompt = await template.format({
  role: "技术",
  question: "什么是 React？"
});

带示例的模板（Few-shot）：
const template = new PromptTemplate({
  template: "示例：\\n问题：什么是 Python？\\n回答：Python 是一种编程语言。\\n\\n问题：{question}\\n回答：",
  inputVariables: ["question"]
});

系统提示组合：
const prompt = new ChatPromptTemplate([
  new SystemMessagePromptTemplate.fromTemplate("你是{role}"),
  new HumanMessagePromptTemplate.fromTemplate("{question}")
]);

模板最佳实践：
- 变量命名清晰：{role} {question} {context}
- 包含角色定义：明确 LLM 角色
- Few-shot 示例：引导输出格式
- 输出格式约束：要求特定格式`,
    metadata: { title: "Prompt Template", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `LangGraph 状态图

LangGraph 是 LangChain 的状态编排扩展：

核心概念：

1. StateGraph（状态图）
定义状态和节点：
const workflow = new StateGraph({
  channels: {
    input: { value: null },
    output: { value: null },
    intermediate: { value: null, reducer: (a, b) => b }
  }
});

2. Node（节点）
定义处理逻辑：
workflow.addNode("analyze", async (state) => {
  const result = await analyze(state.input);
  return { intermediate: result };
});

3. Edge（边）
定义节点间流转：
workflow.addEdge("analyze", "process");
workflow.addConditionalEdge("process", shouldContinue, {
  continue: "analyze",
  end: END
});

循环控制：
支持节点间的循环执行：
workflow.addLoopEdge("agent", "tools");

完整示例：
const app = workflow.compile();
const result = await app.invoke({ input: "Hello" });

适用场景：
- Agent 循环执行
- 多步骤任务编排
- 复杂状态管理`,
    metadata: { title: "LangGraph 状态图", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `LangSmith 调试

LangSmith 是 LangChain 的调试追踪平台：

核心功能：

1. Trace 追踪
记录完整执行链路：
- Chain 执行顺序
- 每个步骤的输入输出
- Token 消耗统计
- 执行耗时

2. 调试 Agent 行为
查看 Agent 决策过程：
- Thought 推理内容
- Action 工具选择
- Observation 工具结果
- 循环次数统计

3. 性能分析
- Token 消耗分布
- 耗时瓶颈识别
- 成本优化建议

使用方式：
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=your_key

执行后自动上传到 LangSmith 平台

调试技巧：
- 对比不同配置的 Trace
- 定位 Token 消耗高的步骤
- 分析工具调用成功率
- 优化 Prompt 减少 Token`,
    metadata: { title: "LangSmith 调试", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `LangChain Expression Language (LCEL)

LCEL 是 LangChain 的管道语法：

基础语法：
const chain = prompt | model | outputParser;
const result = await chain.invoke({ question: "Hello" });

管道组合：
// 单一链路
const chain = promptTemplate | chatModel | StrOutputParser();

// 并行链路
const chain = RunnableParallel({
  joke: jokeChain,
  poem: poemChain
});

// 条件分支
const chain = RunnableBranch({
  conditions: [
    [isQuestion, qaChain],
    [isChat, chatChain]
  ],
  default: defaultChain
});

Runnable 接口：
所有组件实现 Runnable 接口：
- invoke(): 单次执行
- batch(): 批量执行
- stream(): 流式输出
- map(): 并行执行

链式调用：
const result = await prompt
  .pipe(model)
  .pipe(outputParser)
  .invoke({ input: "test" });

优势：
- 代码简洁
- 组件可组合
- 类型安全`,
    metadata: { title: "LCEL 管道语法", source: "TechMate 知识库", category: "langchain" },
  },
  {
    content: `LangChain 最佳实践

1. Chain 拆分原则
- 单一职责：一个 Chain 做一件事
- 合理粒度：避免过细或过粗
- 可组合性：支持复用

2. 错误处理
const chain = new LLMChain({
  llm: model,
  prompt: template,
  callbacks: [
    {
      handleError: (error) => {
        logError(error);
        return fallbackResponse;
      }
    }
  ]
});

3. 版本管理
- Prompt 模板版本化
- Chain 配置存储
- 执行结果追踪

4. 性能优化
- 减少不必要的 LLM 调用
- 缓存重复计算结果
- 批量处理并行执行

5. 测试策略
- Prompt 测试：验证模板效果
- Chain 测试：验证执行流程
- Agent 测试：验证工具调用

测试示例：
const testPrompt = async () => {
  const results = await Promise.all(
    testCases.map(case => chain.invoke(case))
  );
  evaluateResults(results);
};

6. 监控告警
- Token 消耗监控
- 错误率告警
- 响应时间追踪`,
    metadata: { title: "LangChain 最佳实践", source: "TechMate 知识库", category: "langchain" },
  },
];

// ==================== 大模型知识 (9条) ====================
const LLM_KNOWLEDGE = [
  {
    content: `大模型基础概念

Transformer 架构：
大模型基于 Transformer 架构，核心组件：
- Encoder：编码输入序列
- Decoder：生成输出序列
- Attention：注意力机制，捕获序列依赖

预训练：
模型在海量数据上预训练，学习通用语言能力：
- 语言理解：语义、语法、上下文
- 语言生成：流畅、连贯、多样化

参数规模：
| 模型 | 参数量 |
|------|--------|
| GPT-3 | 175B |
| Claude | ~200B |
| Llama-2 | 7B-70B |
| Qwen | 7B-72B |

参数量影响：
- 更大参数 → 更强能力
- 更大参数 → 更高推理成本
- 更大参数 → 更长推理时间

模型类型：
- Base Model：预训练模型，无特定任务优化
- Instruction Model：指令微调，适合对话
- Chat Model：对话优化，多轮交互`,
    metadata: { title: "大模型基础概念", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `Prompt Engineering

提示词设计技巧：

1. 明确角色
"你是一个资深前端工程师，请解释..."

2. 清晰指令
"请用简单易懂的语言解释 React Hooks，包含代码示例"

3. Few-shot 示例
提供示例引导输出格式：
示例：
问题：什么是 Python？
回答：Python 是一种解释型编程语言，特点是语法简洁。

问题：什么是 TypeScript？
回答：

4. Chain-of-Thought（思维链）
引导模型展示推理过程：
"请一步步分析：1.首先... 2.然后... 3.最后..."

5. 输出格式约束
"请以 Markdown 格式输出，包含标题和代码块"

6. 约束条件
"回答不超过200字，不使用专业术语"

Prompt 模板示例：
const prompt = "角色：你是{role}\\n任务：{task}\\n格式：{format}\\n约束：{constraints}\\n\\n请开始回答：";

调试技巧：
- 调整角色定义
- 增加示例数量
- 明确输出格式
- 添加负面约束`,
    metadata: { title: "Prompt Engineering", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `Token 限制处理

Token 计算：
- 英文：约 4 字符 = 1 Token
- 中文：约 1-2 字符 = 1 Token
- 代码：Token 密度更高

常用模型 Token 限制：
| 模型 | 最大 Token |
|------|------------|
| GPT-3.5 | 4K |
| GPT-4 | 8K-32K |
| Claude | 100K-200K |
| Qwen | 8K-32K |

超限处理策略：

1. 截断
截取关键部分：
const truncatedText = text.slice(0, maxTokens);

2. 分段处理
将长文本分段处理：
for (const chunk of splitText(text, chunkSize)) {
  await processChunk(chunk);
}

3. 滑动窗口
保留窗口内内容：
while (hasMore) {
  window = getNextWindow(text, windowSize, overlap);
  await process(window);
}

4. 概要压缩
先压缩再处理：
const summary = await summarize(longText);
const result = await process(summary);

最佳实践：
- 预估 Token 数量
- 留出输出空间（输入 < 总限制 - 输出预估）
- 优先保留关键信息`,
    metadata: { title: "Token 限制处理", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `幻觉问题

什么是幻觉：
LLM 生成与事实不符或虚构的信息

幻觉类型：
1. 事实错误：错误的事实陈述
2. 资源虚构：虚构不存在的引用、链接
3. 逻辑错误：推理结论与前提不符

幻觉成因：
- 训练数据不完整或错误
- 模型过度依赖概率生成
- 缺少事实验证机制
- Prompt 不够明确

检测方法：
- 事实核查：对比权威来源
- 逻辑验证：检查推理一致性
- 来源追踪：验证引用是否存在

缓解策略：

1. 使用 RAG
提供真实上下文，减少幻觉：
prompt = "根据以下知识回答，不要编造信息：\\n知识：{retrieved_docs}\\n问题：{query}";

2. 降低温度
temperature=0.1，减少随机性

3. 明确约束
"如果不确定，请说明'我不确定'"

4. 添加校验
要求引用来源，便于验证`,
    metadata: { title: "幻觉问题", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `微调 vs RAG

微调（Fine-tuning）：
更新模型参数，适配特定任务

适用场景：
- 特定风格输出（如品牌文案）
- 领域术语理解（如医疗、法律）
- 任务格式固定（如代码生成）

成本：
- 训练成本高（算力、数据准备）
- 更新周期长（需重新训练）

RAG（检索增强生成）：
检索外部知识增强生成

适用场景：
- 动态知识问答
- 事实准确性要求高
- 知识频繁更新

成本：
- 无需训练，成本低
- 知识实时更新

对比决策：

| 需求 | 选择 |
|------|------|
| 特定输出风格 | 微调 |
| 动态知识更新 | RAG |
| 成本敏感 | RAG |
| 领域术语适配 | 微调 + RAG |

最佳组合：
先微调领域适配，再用 RAG 提供事实知识`,
    metadata: { title: "微调 vs RAG", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `上下文窗口

Context Window 是模型的输入限制：

常见窗口大小：
| 模型 | 窗口大小 |
|------|----------|
| GPT-3.5 | 4K |
| GPT-4-turbo | 128K |
| Claude 3 | 200K |
| Qwen | 32K |

有效利用策略：

1. 优先级排序
优先包含最相关内容：
const context = sortByRelevance(allDocs).slice(0, maxTokens);

2. 概要先行
先提供概要，再展开细节：
prompt = "概要：{summary}\\n详细内容：{topDetails}";

3. 分层加载
按重要性分层：
layer1: 核心信息（必须包含）
layer2: 扩展信息（窗口足够时包含）
layer3: 补充信息（可选）

4. 动态压缩
根据窗口大小动态调整：
if (tokenCount > maxWindow * 0.8) {
  context = compress(context);
}

窗口管理最佳实践：
- 预留输出空间
- 监控 Token 消耗
- 关键信息优先`,
    metadata: { title: "上下文窗口", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `模型选型

主流模型对比：

| 模型 | 特点 | 适用场景 |
|------|------|----------|
| GPT-4 | 能力最强、成本高 | 复杂推理、高精度任务 |
| GPT-3.5 | 成本低、速度快 | 日常对话、简单任务 |
| Claude | 窗口大、安全强 | 长文档处理、安全场景 |
| Qwen | 中文强、成本低 | 中文场景、国内应用 |
| Llama | 开源、可本地部署 | 私有化、定制化场景 |

选型考虑因素：

1. 任务复杂度
- 简单任务 → GPT-3.5/Qwen
- 复杂推理 → GPT-4/Claude

2. 语言场景
- 英文为主 → GPT/Claude
- 中文为主 → Qwen/Claude

3. 成本预算
- 预算充足 → GPT-4
- 预算有限 → Qwen/GPT-3.5

4. 部署方式
- 云服务 → GPT/Claude/Qwen
- 本地部署 → Llama

5. 数据安全
- 公有云 → GPT/Claude
- 私有化 → Llama/本地模型

组合策略：
简单任务用小模型，复杂任务用大模型`,
    metadata: { title: "模型选型", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `流式输出

流式输出实现 Token 级别实时返回：

SSE（Server-Sent Events）实现：
服务端：
res.setHeader('Content-Type', 'text/event-stream');
for (const token of streamTokens) {
  res.write("data: " + JSON.stringify({ token }) + "\\n\\n");
}
res.end();

客户端：
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  displayToken(data.token);
};

LangChain 流式输出：
const stream = await model.stream(prompt);
for (const chunk of stream) {
  console.log(chunk.content);
}

WebSocket 实现：
适用双向通信场景：
socket.on('stream', (data) => {
  displayToken(data.token);
});

流式输出优势：
- 实时反馈，用户体验好
- 减少等待时间感知
- 支持长文本生成

注意事项：
- 错误处理：流中断的恢复
- 前端渲染：增量显示优化
- 性能监控：流式耗时统计`,
    metadata: { title: "流式输出", source: "TechMate 知识库", category: "llm" },
  },
  {
    content: `模型调用最佳实践

1. 请求重试机制
const callWithRetry = async (prompt, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await model.invoke(prompt);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));  // 递增延迟
    }
  }
};

2. 超时处理
const result = await Promise.race([
  model.invoke(prompt),
  timeout(30000, 'LLM 调用超时')
]);

3. 并发控制
const semaphore = new Semaphore(5);  // 最大并发5
const results = await Promise.all(
  prompts.map(p => semaphore.acquire().then(() =>
    model.invoke(p).finally(() => semaphore.release())
  ))
);

4. 缓存机制
const cache = new Map();
const cachedCall = async (prompt) => {
  const key = hashPrompt(prompt);
  if (cache.has(key)) return cache.get(key);
  const result = await model.invoke(prompt);
  cache.set(key, result);
  return result;
};

5. 成本监控
记录每次调用的 Token 消耗：
const logUsage = (promptTokens, completionTokens) => {
  totalCost += calculateCost(promptTokens, completionTokens);
};

最佳实践总结：
- 重试：应对临时失败
- 超时：避免长时间阻塞
- 并发控制：保护 API 配额
- 缓存：减少重复调用
- 监控：追踪成本`,
    metadata: { title: "模型调用最佳实践", source: "TechMate 知识库", category: "llm" },
  },
];

// 合并所有知识
const ALL_KNOWLEDGE = [
  ...AGENT_KNOWLEDGE,
  ...RAG_KNOWLEDGE,
  ...LANGCHAIN_KNOWLEDGE,
  ...LLM_KNOWLEDGE,
];

export async function initializeKnowledgeBase(): Promise<void> {
  console.log("Initializing TechMate knowledge base...");

  const vectorRetriever = new VectorRetriever();
  const bm25Retriever = new BM25Retriever();

  // 添加向量索引
  console.log("Adding documents to vector index...");
  const ids = await vectorRetriever.addBatchDocuments(ALL_KNOWLEDGE);
  console.log(`Added ${ids.length} documents to vector index`);

  // 构建 BM25 索引
  console.log("Building BM25 index...");
  await bm25Retriever.buildIndex(
    ALL_KNOWLEDGE.map((doc, i) => ({
      id: ids[i],
      content: doc.content,
      metadata: doc.metadata,
    }))
  );
  console.log("BM25 index built successfully");

  console.log("Knowledge base initialized!");
}

// 导出知识文档供测试使用
export { ALL_KNOWLEDGE, AGENT_KNOWLEDGE, RAG_KNOWLEDGE, LANGCHAIN_KNOWLEDGE, LLM_KNOWLEDGE };