import type { MCPToolResult } from "../tools/mcp-tools";

// 这里不是做严格分类器，而是先用一组高价值关键词做 MVP 白名单命中。
// 目标是把“考公经验/上岸经验/选岗避坑”这类问题优先路由到本地沉淀知识，
// 避免回答时误走成“实时搜索小红书”。
const XIAOHONGSHU_RAG_KEYWORDS = [
  "杭州考公",
  "浙江省考",
  "杭州事业单位",
  "杭州事业编",
  "事业单位考试",
  "省考",
  "国考",
  "考公",
  "选岗",
  "报岗",
  "上岸",
  "备考经验",
  "面试经验",
  "报班",
  "避坑",
];

export interface RoutedKnowledgeResult {
  shouldUseRag: boolean;
  ragQuery: string;
  ragContext: string;
  ragResults: any[];
  sourceNotes: string[];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function shouldRouteToXiaohongshuRag(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  return XIAOHONGSHU_RAG_KEYWORDS.some((keyword) =>
    normalizedMessage.includes(normalizeText(keyword))
  );
}

export function buildXiaohongshuRagQuery(message: string): string {
  const trimmedMessage = message.trim();
  // 空消息时给一个稳定兜底词，避免上层调用还要处理“空 query”分支。
  return trimmedMessage.length > 0 ? trimmedMessage : "浙江省考 备考经验";
}

function stringifyMetadata(metadata: Record<string, any> | undefined): string[] {
  if (!metadata) {
    return [];
  }

  const sourceParts: string[] = [];
  if (typeof metadata.title === "string" && metadata.title.trim()) {
    sourceParts.push(`标题：${metadata.title.trim()}`);
  }
  if (typeof metadata.author === "string" && metadata.author.trim()) {
    sourceParts.push(`作者：${metadata.author.trim()}`);
  }
  if (typeof metadata.post_id === "string" && metadata.post_id.trim()) {
    sourceParts.push(`帖子ID：${metadata.post_id.trim()}`);
  }
  if (typeof metadata.source_url === "string" && metadata.source_url.trim()) {
    sourceParts.push(`来源：${metadata.source_url.trim()}`);
  }
  return sourceParts;
}

export function formatXiaohongshuRagContext(results: any[]): {
  ragContext: string;
  sourceNotes: string[];
} {
  // RAG 结果既要给模型“可直接消费的上下文”，也要保留可引用来源，
  // 所以这里拆成正文摘要和来源备注两部分返回。
  if (results.length === 0) {
    return {
      ragContext: "",
      sourceNotes: [],
    };
  }

  const contentBlocks = results
    .map((result, index) => {
      const content =
        typeof result?.content === "string" ? result.content.trim() : "";
      if (!content) {
        return "";
      }
      return `参考经验 ${index + 1}：\n${content}`;
    })
    .filter(Boolean);

  const sourceNotes = results
    .map((result) => stringifyMetadata(result?.metadata))
    .flat()
    .filter(Boolean);

  return {
    ragContext: contentBlocks.join("\n\n"),
    sourceNotes,
  };
}

export function resolveXiaohongshuKnowledge(
  message: string,
  ragResult: MCPToolResult
): RoutedKnowledgeResult {
  const shouldUseRag = shouldRouteToXiaohongshuRag(message);
  const ragQuery = buildXiaohongshuRagQuery(message);

  // 这里故意把“命中了白名单，但本地知识没有命中”也保留下来，
  // 这样上层可以知道：这类问题本应优先查本地知识，只是当前没有查到可用结果。
  if (!shouldUseRag || !ragResult.success || !ragResult.data?.results?.length) {
    return {
      shouldUseRag,
      ragQuery,
      ragContext: "",
      ragResults: [],
      sourceNotes: [],
    };
  }

  const ragResults = ragResult.data.results;
  const { ragContext, sourceNotes } = formatXiaohongshuRagContext(ragResults);

  return {
    shouldUseRag,
    ragQuery,
    ragContext,
    ragResults,
    sourceNotes,
  };
}

export function buildGeneralAnswerPrompt(message: string, routed: RoutedKnowledgeResult): string {
  // 没命中本地知识时，直接回退成普通问答 prompt，不额外污染模型上下文。
  if (!routed.shouldUseRag || !routed.ragContext) {
    return message;
  }

  const sourceSection =
    routed.sourceNotes.length > 0
      ? `\n可引用来源：\n- ${routed.sourceNotes.join("\n- ")}`
      : "";

  return [
    "请优先基于以下本地整理的小红书经验内容回答用户问题，不要假装实时搜索，也不要编造未提供的来源。",
    `用户问题：${message}`,
    `本地经验摘要：\n${routed.ragContext}${sourceSection}`,
    "回答要求：",
    "1. 先直接回答用户问题。",
    "2. 若引用经验，请明确说明是基于本地整理的经验帖。",
    "3. 如果本地经验不足，就诚实说明信息有限，再给出通用建议。",
  ].join("\n\n");
}
