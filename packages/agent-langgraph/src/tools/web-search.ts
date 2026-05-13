/**
 * Tavily Web Search 工具
 *
 * Tavily 是专为 AI Agent 设计的搜索 API，特点：
 * - 在国内可直连，无需代理
 * - 返回结构化结果 + 综合 answer + score
 * - 免费额度 1000 次/月，足够单人项目使用
 *
 * - 选择 Tavily 而非 Perplexity / Serper 是基于"AI Agent 友好"+"国内连通性"两个维度
 * - 智能路由：本地 RAG tier=fallback/expand 或问题命中时效词时才调，避免无谓调用
 * - 失败静默降级，不阻塞主流程
 *
 * 环境变量：
 *   TAVILY_API_KEY     - 必填，从 https://tavily.com 申请，免费 1000 次/月
 */

import { logger } from "@tech-mate/core";
import { checkToolInvocation } from "../guardrail";
import { withSpan } from "../otel/instrumentation";

export interface WebSearchCitation {
  url: string;
  title?: string;
  content?: string;
  score?: number;
}

export interface WebSearchResult {
  answer: string;
  citations: WebSearchCitation[];
  raw?: any;
}

/**
 * 判定是否应该走联网搜索（智能路由）。
 *
 * 触发条件（任一）：
 * 1. RAG 三级策略命中 fallback（本地知识库完全无结果）
 * 2. RAG 命中 expand（低置信度，需要补充）
 * 3. 问题包含时效性关键词："最新""现在""今天""今年""2026""新闻"等
 * 4. 问题明示需要联网："搜一下""搜索""查一下""上网查"
 */
export function shouldUseWebSearch(query: string, ragTier?: string): boolean {
  if (ragTier === "fallback" || ragTier === "expand") return true;

  const q = query.toLowerCase();

  const timeKeywords = ["最新", "现在", "今天", "今年", "去年", "刚刚", "目前", "近期", "最近", "this week", "today", "current"];
  if (timeKeywords.some((k) => q.includes(k))) return true;

  if (/20(2[4-9]|3\d)/.test(q)) return true;

  const explicitKeywords = ["搜一下", "搜索", "查一下", "查询", "上网查", "在线搜", "联网"];
  if (explicitKeywords.some((k) => q.includes(k))) return true;

  return false;
}

/**
 * 调用 Tavily Search API。
 * 失败返回 null，调用方自行兜底。
 */
export async function webSearch(query: string): Promise<WebSearchResult | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    logger.warn("[WebSearch] TAVILY_API_KEY 未配置，跳过联网搜索");
    return null;
  }

  // ========== GuardRail L2：工具参数校验 ==========
  const guard = checkToolInvocation("web_search", { query });
  if (!guard.passed) {
    logger.warn(`[WebSearch] GuardRail 拦截: ${guard.hits.map(h => h.reason).join("；")}`);
    return null; // 静默降级，主流程仍可基于本地知识库回答
  }

  return withSpan("tool.web_search", async (span) => {
    span?.setAttributes({ queryLength: query.length });
    const startedAt = Date.now();
    try {
      console.log(`🌐 [WebSearch] 调用 Tavily: "${query}"`);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: 5,
          search_depth: "basic",      // basic 速度快，advanced 更精确（贵 2x）
          include_answer: true,        // Tavily 会综合一段答案，省一次 LLM 调用
          include_raw_content: false,
        }),
        // 5s 上限：Tavily 偶尔抽到 8-10s，会把整条 Chat 链路拖死
        // 失败/超时 → null，调用方有兜底（LLM 仍然能基于本地知识库回答）
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        logger.warn(`[WebSearch] Tavily HTTP ${response.status}: ${errBody.slice(0, 200)}`);
        span?.setAttribute("status", `http_${response.status}`);
        return null;
      }

      const data = (await response.json()) as any;
      const answer: string = data?.answer || "";
      const rawResults: any[] = Array.isArray(data?.results) ? data.results : [];

      const citations: WebSearchCitation[] = rawResults
        .filter((r) => r?.url)
        .map((r) => ({
          url: r.url,
          title: r.title,
          content: r.content,
          score: typeof r.score === "number" ? r.score : undefined,
        }));

      console.log(`🌐 [WebSearch] 完成 ${Date.now() - startedAt}ms, ${citations.length} 个结果`);
      span?.setAttributes({ resultsCount: citations.length, durationMs: Date.now() - startedAt });

      return { answer, citations, raw: data };
    } catch (error) {
      logger.warn(
        `[WebSearch] 调用失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  });
}
