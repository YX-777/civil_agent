/**
 * RAG 检索降级封装
 * 优先使用 LlamaIndex QueryEngine（HybridFusion + BGE-M3 重排 + 三级策略），
 * 失败时降级到 MCP RAG。
 */

import {
  getLlamaIndexQueryEngine,
  getHybridRetriever,
  RetrieveOptions,
  HybridSearchResult,
} from "@tech-mate/rag-engine";
import { MetadataMode } from "llamaindex";
import { getMCPToolClient } from "../tools/mcp-tools";
import { getAgentConfig } from "../config/agent.config";
import { logAgentEvent } from "./event-logger";
import { checkToolInvocation } from "../guardrail";
import { withSpan } from "../otel/instrumentation";

export interface RAGFallbackResult {
  context: string;                         // 构建给 LLM 的 prompt
  results: any[];                          // 检索到的文档列表
  source: "hybrid" | "mcp" | "none";       // 来源标识
  tier: string;                            // 三级策略结果
}

/**
 * 根据查询内容推断知识分类
 */
export function inferCategoryFromQuery(query: string): string | undefined {
  const normalizedQuery = query.toLowerCase();

  // 关键词 → 分类映射
  const categoryMap: Record<string, string> = {
    // Agent 相关
    "agent": "agent",
    "ai agent": "agent",
    "智能代理": "agent",
    "tool calling": "agent",
    "function calling": "agent",
    "react": "agent",       // ReAct 推理模式
    "规划": "agent",
    "协作": "agent",

    // RAG 相关
    "rag": "rag",
    "检索增强": "rag",
    "向量检索": "rag",
    "embedding": "rag",
    "向量数据库": "rag",
    "chroma": "rag",
    "bm25": "rag",
    "混合检索": "rag",
    "重排": "rag",
    "rerank": "rag",
    "llamaindex": "rag",

    // LangChain 相关
    "langchain": "langchain",
    "chain": "langchain",
    "langgraph": "langchain",
    "memory": "langchain",
    "tool": "langchain",
    "prompt template": "langchain",
    "lcel": "langchain",

    // 大模型相关
    "llm": "llm",
    "大模型": "llm",
    "gpt": "llm",
    "claude": "llm",
    "qwen": "llm",
    "prompt": "llm",
    "token": "llm",
    "幻觉": "llm",
    "微调": "llm",
    "上下文": "llm",
    "流式": "llm",
  };

  // 遍历映射查找匹配
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (normalizedQuery.includes(keyword.toLowerCase())) {
      return category;
    }
  }

  // 无匹配时不限定分类（检索所有）
  return undefined;
}

/**
 * 带降级的 RAG 检索
 * 优先尝试 HybridRetriever，失败时降级到 MCP RAG
 */
export async function retrieveWithFallback(
  query: string,
  options?: {
    category?: string;
    topK?: number;
    preferHybrid?: boolean;
    fallbackToMCP?: boolean;
    userId?: string;
  }
): Promise<RAGFallbackResult> {
  const config = getAgentConfig();
  const effectiveOptions = {
    category: options?.category ?? inferCategoryFromQuery(query),
    topK: options?.topK ?? 5,
    preferHybrid: options?.preferHybrid ?? config.features?.ragEnabled ?? true,
    fallbackToMCP: options?.fallbackToMCP ?? true,
  };
  const ragT0 = Date.now();

  // ========== GuardRail L2：工具参数校验 ==========
  const guard = checkToolInvocation("rag_retrieve", {
    query,
    topK: effectiveOptions.topK,
    category: effectiveOptions.category,
  }, { userId: options?.userId });
  if (!guard.passed) {
    console.warn(`[RAG] GuardRail 拦截: ${guard.hits.map(h => h.reason).join("；")}`);
    return {
      context: `用户问题：${query}\n[GuardRail 拦截：${guard.hits[0]?.reason || "参数不合法"}]`,
      results: [],
      source: "none",
      tier: "fallback",
    };
  }

  // OTel: 整段检索流程包到一个 span 里，方便回放
  return withSpan("tool.rag_retrieve", async (span) => {
    span?.setAttributes({
      category: effectiveOptions.category || "(none)",
      topK: effectiveOptions.topK,
      preferHybrid: effectiveOptions.preferHybrid,
    });
    return retrieveWithFallbackInner(query, effectiveOptions, ragT0, options);
  });
}

async function retrieveWithFallbackInner(
  query: string,
  effectiveOptions: {
    category?: string;
    topK: number;
    preferHybrid: boolean;
    fallbackToMCP: boolean;
  },
  ragT0: number,
  options?: { userId?: string },
): Promise<RAGFallbackResult> {
  const emit = (source: string, payload: Record<string, any>) => {
    if (!options?.userId) return;
    logAgentEvent({
      userId: options.userId,
      eventType: "rag",
      eventName: source,
      payload,
      durationMs: Date.now() - ragT0,
    });
  };

  // Step 1: 优先使用 LlamaIndex QueryEngine（HybridFusion + BGE-M3 + 三级策略）
  if (effectiveOptions.preferHybrid) {
    try {
      const queryEngine = getLlamaIndexQueryEngine();
      const retrieveResult = await queryEngine.retrieveOnly({
        query,
        topK: effectiveOptions.topK,
        category: effectiveOptions.category,
      });

      const hasResults = retrieveResult.sourceNodes.length > 0;
      if (hasResults || retrieveResult.tier !== "fallback") {
        const mapped = retrieveResult.sourceNodes.slice(0, effectiveOptions.topK).map((nws) => ({
          id: nws.node.id_,
          content: nws.node.getContent(MetadataMode.NONE),
          score: nws.score ?? 0,
          metadata: nws.node.metadata || {},
        }));
        const avgScore = mapped.length > 0
          ? mapped.reduce((s, r) => s + (r.score || 0), 0) / mapped.length
          : 0;
        emit("hybrid_retrieval", {
          tier: retrieveResult.tier,
          hits: mapped.length,
          avgScore: Number(avgScore.toFixed(3)),
          vectorCount: mapped.length,
          bm25Count: 0,
          webCount: 0,
          category: effectiveOptions.category,
        });
        return {
          context: retrieveResult.promptForLLM,
          results: mapped,
          source: "hybrid",
          tier: retrieveResult.tier,
        };
      }
    } catch (error) {
      console.warn("[RAG Fallback] LlamaIndex QueryEngine failed:", error);
      // 二次兜底：旧 HybridRetriever（生产保险，避免 LlamaIndex 路径异常时主流程整体失败）
      try {
        const hybridRetriever = getHybridRetriever();
        const retrieveOptions: RetrieveOptions = {
          topK: effectiveOptions.topK,
          category: effectiveOptions.category,
        };
        const result = await hybridRetriever.retrieve(query, retrieveOptions);
        if (result.tier !== "fallback" || result.allResults.length > 0) {
          return {
            context: result.promptForLLM,
            results: result.allResults.slice(0, effectiveOptions.topK),
            source: "hybrid",
            tier: result.tier,
          };
        }
      } catch (legacyError) {
        console.warn("[RAG Fallback] Legacy HybridRetriever also failed:", legacyError);
      }
    }
  }

  // Step 2: 降级到 MCP RAG
  if (effectiveOptions.fallbackToMCP) {
    try {
      const mcpClient = getMCPToolClient();
      const mcpResult = await mcpClient.searchKnowledge({
        query,
        category: effectiveOptions.category || "tech_experience",
        topK: effectiveOptions.topK,
      });

      if (mcpResult.success && mcpResult.data?.results?.length > 0) {
        // 构建 MCP RAG context
        const context = mcpResult.data.results
          .map((r: any) => r.content)
          .join("\n\n");

        emit("mcp_fallback", {
          tier: "mcp_fallback",
          hits: mcpResult.data.results.length,
          webCount: 0,
          category: effectiveOptions.category,
        });
        return {
          context: `用户问题：${query}\n相关知识：\n${context}`,
          results: mcpResult.data.results,
          source: "mcp",
          tier: "mcp_fallback",
        };
      }
    } catch (error) {
      console.warn("[RAG Fallback] MCP RAG also failed:", error);
    }
  }

  // Step 3: 完全失败，返回空 context
  emit("no_results", { tier: "fallback", hits: 0 });
  return {
    context: `用户问题：${query}\n本地知识库中没有找到相关知识，请用自身知识回答。`,
    results: [],
    source: "none",
    tier: "fallback",
  };
}