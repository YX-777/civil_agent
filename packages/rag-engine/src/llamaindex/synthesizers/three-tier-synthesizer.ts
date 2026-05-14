/**
 * 三级策略响应合成器
 *
 * 基于现有 ThreeTierStrategy（precise/candidates/expand/fallback 四个置信档），
 * 把检索到的 NodeWithScore 转成给 LLM 的 prompt，调用 DashScope 生成最终答案。
 *
 * - 这是 LlamaIndex ResponseSynthesizer 的位置，但我们要求按检索分数做"分级响应"
 * - 高置信(>0.85)直接用知识库内容；中置信(>0.6)多候选合并；低置信告知用户并补充 LLM 知识
 * - 不直接继承 LlamaIndex BaseSynthesizer 是为了避免再写一个 DashScope LLM 适配器
 */

import { EngineResponse, MetadataMode } from "llamaindex";
import type { NodeWithScore } from "llamaindex";
import { ThreeTierStrategy } from "../../strategies/three-tier-strategy";
import { getRAGConfig } from "../../config/rag.config";

export interface ThreeTierSynthesizeInput {
  query: string;
  nodes: NodeWithScore[];
}

export interface ThreeTierSynthesizeResult {
  response: EngineResponse;
  tier: "precise" | "candidates" | "expand" | "fallback";
  promptForLLM: string;
}

export class ThreeTierSynthesizer {
  private strategy = new ThreeTierStrategy();
  private config = getRAGConfig();

  async synthesize(input: ThreeTierSynthesizeInput): Promise<ThreeTierSynthesizeResult> {
    const { query, nodes } = input;

    // NodeWithScore → ThreeTierStrategy 期望的 RerankedResult 结构
    const reranked = nodes.map((nws) => ({
      id: nws.node.id_,
      content: nws.node.getContent(MetadataMode.NONE),
      score: nws.score ?? 0,
      metadata: nws.node.metadata || {},
    }));

    const tiered = this.strategy.classify(reranked, query);
    const promptForLLM = this.strategy.buildPromptForLLM(tiered, query);

    console.log(`[LlamaIndex/Synthesizer] tier=${tiered.tier} message="${tiered.message}"`);

    const answer = await this.callLLM(promptForLLM);

    const response = EngineResponse.fromResponse(answer, false, nodes);

    return {
      response,
      tier: tiered.tier,
      promptForLLM,
    };
  }

  /**
   * 调用 LLM 生成答案。
   * 直接用 fetch 而不是接 LlamaIndex BaseLLM，避免再写一层适配器。
   * 模型与 agent-langgraph 的 T2 主力共享（env LLM_MODEL_T2，默认 qwen-plus）。
   */
  private async callLLM(prompt: string): Promise<string> {
    const apiKey = this.config.reranker.apiKey;
    if (!apiKey) {
      console.warn("[LlamaIndex/Synthesizer] 缺少 DASHSCOPE_API_KEY，返回 prompt 兜底");
      return "抱歉，模型服务未配置。";
    }

    const model = process.env.LLM_MODEL_T2 || "qwen-plus";
    const baseURL = process.env.LLM_BASE_URL_T2 || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    try {
      const response = await fetch(
        `${baseURL}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "你是 TechMate 技术学习助手，专注于前端开发技术。必须使用技术词汇：React、TypeScript、JavaScript、CSS、Node.js。禁止使用技术学习、学习、写作等词汇。",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          }),
        }
      );

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "抱歉，无法生成回答。";
    } catch (error) {
      console.warn("[LlamaIndex/Synthesizer] LLM 调用失败:", error);
      return "抱歉，生成回答时出现错误。";
    }
  }
}
