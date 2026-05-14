/**
 * Web Search 工具 —— 支持 Serper.dev / Tavily 两个 provider
 *
 * 选择规则（按优先级）：
 *  1. 显式指定 SEARCH_PROVIDER=serper|tavily
 *  2. 否则：有 SERPER_API_KEY 走 Serper（中文 + 速度更优），否则回退 Tavily
 *
 * Serper.dev：基于 Google 实时索引，150-500ms，中文覆盖好
 * Tavily：自家爬虫 + 一句话 answer，覆盖窄，偶尔抽到 8-10s
 *
 * 失败静默降级，不阻塞主流程
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
  provider: "serper" | "tavily";
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
 * 决定当前实际使用的 provider。
 */
function resolveProvider(): "serper" | "tavily" | null {
  const forced = (process.env.SEARCH_PROVIDER || "").trim().toLowerCase();
  if (forced === "serper" && process.env.SERPER_API_KEY) return "serper";
  if (forced === "tavily" && process.env.TAVILY_API_KEY) return "tavily";
  if (forced) {
    logger.warn(`[WebSearch] SEARCH_PROVIDER=${forced} 但缺失对应 API_KEY，按可用 key 自动选择`);
  }
  if (process.env.SERPER_API_KEY) return "serper";
  if (process.env.TAVILY_API_KEY) return "tavily";
  return null;
}

/**
 * Serper.dev — Google 实时索引检索。
 * Endpoint: https://google.serper.dev/search
 */
async function serperSearch(query: string): Promise<WebSearchResult | null> {
  const apiKey = process.env.SERPER_API_KEY!;
  const startedAt = Date.now();
  try {
    console.log(`🌐 [WebSearch] 调用 Serper: "${query}"`);

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 5,
        hl: "zh-cn",
        gl: "cn",
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      logger.warn(`[WebSearch] Serper HTTP ${response.status}: ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as any;
    const organic: any[] = Array.isArray(data?.organic) ? data.organic : [];

    // 优先用 answerBox / knowledgeGraph 作为合成 answer，否则拼接前 2 条 snippet
    const answer: string =
      data?.answerBox?.answer ||
      data?.answerBox?.snippet ||
      data?.knowledgeGraph?.description ||
      organic.slice(0, 2).map((r) => r.snippet).filter(Boolean).join(" ");

    const citations: WebSearchCitation[] = organic
      .filter((r) => r?.link)
      .map((r) => ({
        url: r.link,
        title: r.title,
        content: r.snippet,
        // Serper 没有 score，用 position 反向归一化（1 → 1.0, 5 → 0.2）
        score: typeof r.position === "number" ? Math.max(0, 1 - (r.position - 1) * 0.2) : undefined,
      }));

    console.log(`🌐 [WebSearch] Serper 完成 ${Date.now() - startedAt}ms, ${citations.length} 个结果`);
    return { answer: answer || "", citations, provider: "serper", raw: data };
  } catch (error) {
    logger.warn(`[WebSearch] Serper 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Tavily —— 保留作为 fallback provider。
 */
async function tavilySearch(query: string): Promise<WebSearchResult | null> {
  const apiKey = process.env.TAVILY_API_KEY!;
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
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      logger.warn(`[WebSearch] Tavily HTTP ${response.status}: ${errBody.slice(0, 200)}`);
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

    console.log(`🌐 [WebSearch] Tavily 完成 ${Date.now() - startedAt}ms, ${citations.length} 个结果`);
    return { answer, citations, provider: "tavily", raw: data };
  } catch (error) {
    logger.warn(`[WebSearch] Tavily 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * 统一入口：根据 provider 路由到具体实现。失败返回 null。
 */
export async function webSearch(query: string): Promise<WebSearchResult | null> {
  const provider = resolveProvider();
  if (!provider) {
    logger.warn("[WebSearch] 未配置 SERPER_API_KEY 或 TAVILY_API_KEY，跳过联网搜索");
    return null;
  }

  // ========== GuardRail L2：工具参数校验 ==========
  const guard = checkToolInvocation("web_search", { query });
  if (!guard.passed) {
    logger.warn(`[WebSearch] GuardRail 拦截: ${guard.hits.map(h => h.reason).join("；")}`);
    return null;
  }

  return withSpan(`tool.web_search.${provider}`, async (span) => {
    span?.setAttributes({ queryLength: query.length, provider });
    const result = provider === "serper" ? await serperSearch(query) : await tavilySearch(query);
    if (result) {
      span?.setAttributes({ resultsCount: result.citations.length });
    }
    return result;
  });
}
