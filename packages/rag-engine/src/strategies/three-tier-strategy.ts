/**
 * 三级响应策略
 */

import { getRAGConfig } from "../config/rag.config";

export interface TieredResponse {
  tier: "precise" | "candidates" | "expand" | "fallback";
  answer?: string;
  candidates?: Array<{ content: string; score: number; source: string }>;
  needExpansion?: boolean;
  partialResults?: Array<{ content: string; score: number }>;
  message: string;
}

export interface RerankedResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export class ThreeTierStrategy {
  private config = getRAGConfig().threeTierStrategy;

  classify(results: RerankedResult[], query: string): TieredResponse {
    if (!results.length) {
      return {
        tier: "fallback",
        message: "未找到相关知识，请提供更具体的问题或尝试其他关键词",
        needExpansion: true,
      };
    }

    const topScore = results[0].score;

    // Tier 1: 高置信 (>0.85) - 直接返回精确答案
    if (topScore >= this.config.tier1Threshold) {
      const source = results[0].metadata?.source || results[0].metadata?.title || "本地知识库";
      return {
        tier: "precise",
        answer: results[0].content,
        message: `找到高度匹配的知识（置信度 ${(topScore * 100).toFixed(0)}%）`,
        candidates: [{
          content: results[0].content,
          score: topScore,
          source,
        }],
      };
    }

    // Tier 2: 中置信 (>0.6) - 返回多候选供选择
    if (topScore >= this.config.tier2Threshold) {
      const candidates = results.slice(0, 3).map(r => ({
        content: r.content,
        score: r.score,
        source: r.metadata?.source || r.metadata?.title || "本地知识库",
      }));

      return {
        tier: "candidates",
        message: `找到多个相关知识候选（最佳置信度 ${(topScore * 100).toFixed(0)}%）`,
        candidates,
      };
    }

    // Tier 3: 低置信 - 建议扩展搜索或 LLM 补充
    return {
      tier: "expand",
      message: `找到部分相关知识，但置信度较低（${(topScore * 100).toFixed(0)}%），建议提供更多上下文`,
      needExpansion: true,
      partialResults: results.slice(0, 5).map(r => ({
        content: r.content,
        score: r.score,
      })),
    };
  }

  // 生成用于 LLM 的上下文 prompt
  buildPromptForLLM(response: TieredResponse, query: string): string {
    if (response.tier === "precise" && response.answer) {
      return `请基于以下高置信知识回答用户问题：

知识内容：
${response.answer}

用户问题：${query}

请用技术学习的语言风格，简洁明了地回答问题。`;
    }

    if (response.tier === "candidates" && response.candidates) {
      const candidatesText = response.candidates
        .map((c, i) => `候选 ${i + 1}（置信 ${(c.score * 100).toFixed(0)}%）:\n${c.content}`)
        .join("\n\n");

      return `请综合以下多个知识候选回答用户问题：

${candidatesText}

用户问题：${query}

请选择最相关的知识，或综合多个候选给出完整回答。使用技术学习的语言风格。`;
    }

    // Tier 3 或 fallback：只给部分信息，让 LLM 自己补充
    if (response.partialResults?.length) {
      const partialText = response.partialResults
        .map(r => r.content)
        .join("\n");

      return `以下是部分相关知识，但可能不够完整：

${partialText}

用户问题：${query}

请基于以上信息，结合你的技术知识，给出最佳回答。如果信息不足，请诚实说明。`;
    }

    // 完全没有匹配
    return `用户问题：${query}

本地知识库中没有找到相关知识。请基于你的技术知识回答，如果不确定，请建议用户提供更具体的问题。`;
  }
}