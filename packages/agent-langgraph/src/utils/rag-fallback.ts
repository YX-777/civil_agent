/**
 * RAG 检索降级封装
 * 优先使用 HybridRetriever，失败时降级到 MCP RAG
 */

import { getHybridRetriever, RetrieveOptions, HybridSearchResult } from "@civil-agent/rag-engine";
import { getMCPToolClient } from "../tools/mcp-tools";
import { getAgentConfig } from "../config/agent.config";

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
  }
): Promise<RAGFallbackResult> {
  const config = getAgentConfig();
  const effectiveOptions = {
    category: options?.category ?? inferCategoryFromQuery(query),
    topK: options?.topK ?? 5,
    preferHybrid: options?.preferHybrid ?? config.features?.ragEnabled ?? true,
    fallbackToMCP: options?.fallbackToMCP ?? true,
  };

  // Step 1: 尝试 HybridRetriever
  if (effectiveOptions.preferHybrid) {
    try {
      const hybridRetriever = getHybridRetriever();
      const retrieveOptions: RetrieveOptions = {
        topK: effectiveOptions.topK,
        category: effectiveOptions.category,
      };

      const result = await hybridRetriever.retrieve(query, retrieveOptions);

      // 非完全失败时返回 Hybrid 结果
      if (result.tier !== "fallback" || result.allResults.length > 0) {
        return {
          context: result.promptForLLM,
          results: result.allResults.slice(0, effectiveOptions.topK),
          source: "hybrid",
          tier: result.tier,
        };
      }
    } catch (error) {
      console.warn("[RAG Fallback] HybridRetriever failed:", error);
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
  return {
    context: `用户问题：${query}\n本地知识库中没有找到相关知识，请用自身知识回答。`,
    results: [],
    source: "none",
    tier: "fallback",
  };
}