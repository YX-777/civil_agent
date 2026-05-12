/**
 * 用户事实提取器
 *
 * 目标：从用户对话中识别"值得长期记忆"的事实（姓名、岗位、技术栈、偏好等），
 * 直接写入 ChromaDB long_term_memory，让 Profile 页面的"个人记忆"立即可见。
 *
 * 两条路径：
 * 1. 关键词匹配（同步）：「记住...」「我叫 X」「我是 X 岗位」「我的 X 是 Y」
 *    → 命中即写，权重 0.8（高，显式声明）
 * 2. LLM 提取（异步）：每轮对话后用 qwen-turbo 提取隐式事实
 *    → 权重 0.6（中，AI 推断）
 *
 * 写入约定（与 long.ts 一致）：
 *   collection: long_term_memory
 *   id: lm_<uuid>
 *   document: <事实文本>（用于 BM25 / 全文展示）
 *   metadata: { user_id, memory_id, content_type, weight, creation_date, last_accessed, access_count, topics, source }
 */

import { randomUUID } from "crypto";
import {
  getVectorDBService,
  getEmbeddingService,
} from "@tech-mate/database";
import { ChatOpenAI } from "@langchain/openai";

const COLLECTION = "long_term_memory";

export interface ExtractedFact {
  content: string;
  topics: string[];
  weight: number;
  source: "explicit" | "llm";
}

/**
 * 关键词匹配（轻量、同步、零成本）
 * 命中明确的"用户声明"模式，直接产出事实
 */
export function matchExplicitFacts(message: string): ExtractedFact[] {
  const text = message.trim();
  if (text.length < 2 || text.length > 500) return [];

  const facts: ExtractedFact[] = [];

  // 模式 1: "我叫 X" / "我的名字是 X" / "叫我 X"
  const nameMatch = text.match(/(?:^|[^A-Za-z一-龥])(?:我叫|我的名字是|叫我|我是)([A-Za-z一-龥][A-Za-z一-龥0-9_·\s]{0,15}?)(?:[，。,.\s!?!？]|$)/);
  if (nameMatch?.[1]) {
    const name = nameMatch[1].trim();
    if (name.length >= 1 && name.length <= 16 && !/^(?:一个|个|的|了|啊|吧|呢)/.test(name)) {
      facts.push({
        content: `用户的名字/称呼是「${name}」`,
        topics: ["身份", "称呼"],
        weight: 0.9,
        source: "explicit",
      });
    }
  }

  // 模式 2: "我是 X 工程师 / 开发 / 学生 / 程序员"
  const roleMatch = text.match(/我是\s*(.{1,20}?(?:工程师|开发(?:者|人员)?|程序员|学生|实习生|架构师|经理|主管|设计师|产品|测试|运维))/);
  if (roleMatch?.[1]) {
    facts.push({
      content: `用户的职业身份：${roleMatch[1].trim()}`,
      topics: ["职业", "身份"],
      weight: 0.85,
      source: "explicit",
    });
  }

  // 模式 3: 显式"记住"指令 — "记住 X" / "请记住 X" / "帮我记住 X"
  const rememberMatch = text.match(/(?:请|帮我)?记住[：:]?\s*(.{2,200}?)(?:[。！？!?]|$)/);
  if (rememberMatch?.[1]) {
    const fact = rememberMatch[1].trim();
    if (fact.length >= 2) {
      facts.push({
        content: `用户主动要求记住：${fact}`,
        topics: ["用户主动声明"],
        weight: 0.95,
        source: "explicit",
      });
    }
  }

  // 模式 4: "我在用 X / 我用 X / 我的技术栈是 X"
  const stackMatch = text.match(/(?:我(?:在用|用的是|用|目前用|主要用)|我的(?:技术栈|框架|语言|工具)是)\s*([A-Za-z][A-Za-z0-9./+\s-]{1,40})/);
  if (stackMatch?.[1]) {
    const stack = stackMatch[1].trim().replace(/[，。,.]$/, "");
    if (stack.length >= 2) {
      facts.push({
        content: `用户技术栈：${stack}`,
        topics: ["技术栈", "工具"],
        weight: 0.7,
        source: "explicit",
      });
    }
  }

  // 模式 5: "我喜欢 X / 我偏好 X / 我习惯 X"
  const prefMatch = text.match(/(?:我(?:喜欢|偏好|习惯|倾向于|比较喜欢))\s*(.{2,40}?)(?:[，。,.\s!?！？]|$)/);
  if (prefMatch?.[1]) {
    facts.push({
      content: `用户偏好：${prefMatch[1].trim()}`,
      topics: ["偏好"],
      weight: 0.7,
      source: "explicit",
    });
  }

  return facts;
}

/**
 * LLM 提取（异步、成本可控）
 * 让 qwen-turbo 判断当前消息里是否包含"长期值得记忆的事实"
 */
export async function extractFactsViaLLM(
  userMessage: string,
  assistantResponse?: string
): Promise<ExtractedFact[]> {
  if (userMessage.length < 10 || userMessage.length > 800) return [];

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return [];

  const llm = new ChatOpenAI({
    modelName: "qwen-turbo-latest",
    apiKey,
    configuration: {
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    temperature: 0,
    maxTokens: 300,
  });

  const prompt = `你是一个用户事实提取助手。从下面的用户消息中提取「值得长期记忆」的事实。

仅在以下情况提取：
- 用户透露了身份信息（名字、职业、公司、所在地）
- 用户透露了技术背景（在用什么框架/语言/工具、工作年限）
- 用户透露了学习目标（要面试什么公司、要学什么技术）
- 用户透露了明确的偏好（喜欢什么风格、讨厌什么）

不要提取：
- 一次性的问题（如"什么是 React"）
- 临时的情绪
- 通用的技术讨论

输出 JSON 数组（最多 3 条），每条字段：content（事实文本，30 字内）、topics（话题数组，1-2 个）。
没有可提取的事实就返回空数组 []。

用户消息：${userMessage}

JSON：`;

  try {
    const result = await llm.invoke(prompt);
    const text = String(result.content || "").trim();
    // 取 JSON 数组部分
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];
    const arr = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((item: any) => item && typeof item.content === "string" && item.content.length >= 4)
      .slice(0, 3)
      .map((item: any) => ({
        content: item.content.slice(0, 200),
        topics: Array.isArray(item.topics) ? item.topics.slice(0, 3) : [],
        weight: 0.65,
        source: "llm" as const,
      }));
  } catch (err: any) {
    console.warn("[FactExtractor] LLM extract failed:", err?.message || err);
    return [];
  }
}

/**
 * 把事实写入 ChromaDB long_term_memory
 */
export async function persistFacts(userId: string, facts: ExtractedFact[]): Promise<number> {
  if (facts.length === 0) return 0;

  const vectorService = getVectorDBService();
  const embeddingService = getEmbeddingService();
  await vectorService.initialize();

  let saved = 0;
  for (const f of facts) {
    try {
      const vector = await embeddingService.generateEmbedding(f.content);
      const memoryId = `lm_${randomUUID()}`;
      const now = new Date().toISOString();

      await vectorService.addEmbedding(
        COLLECTION,
        memoryId,
        vector,
        {
          user_id: userId,
          memory_id: memoryId,
          content_type: "user_fact",
          weight: f.weight,
          creation_date: now,
          last_accessed: now,
          access_count: 0,
          topics: JSON.stringify(f.topics),
          source: f.source,
        },
        f.content,  // ← document 字段，让 getAllDocuments 能读到
      );
      saved++;
      console.log(`[FactExtractor] saved (${f.source}, w=${f.weight.toFixed(2)}): ${f.content.slice(0, 60)}`);
    } catch (err: any) {
      console.warn("[FactExtractor] persist failed:", err?.message || err);
    }
  }
  return saved;
}

/**
 * 任务完成回写长期记忆
 * 闭环用：Chat 创建任务 → 用户在任务页完成 → 写入 long_term_memory → 下次 Chat RAG 检索到
 */
export async function persistTaskCompletionFact(
  userId: string,
  info: {
    title: string;
    module?: string | null;
    actualMinutes?: number;
    accuracy?: number;
  },
): Promise<void> {
  try {
    const parts = [
      `用户已完成学习任务：${info.title}`,
      info.module ? `模块：${info.module}` : null,
      typeof info.actualMinutes === "number" ? `用时 ${info.actualMinutes} 分钟` : null,
      typeof info.accuracy === "number" ? `正确率 ${Math.round(info.accuracy * 100)}%` : null,
    ].filter(Boolean);

    const fact: ExtractedFact = {
      content: parts.join("，"),
      topics: ["任务完成", info.module || "学习"].filter(Boolean) as string[],
      weight: 0.75,
      source: "explicit",
    };
    await persistFacts(userId, [fact]);
  } catch (err: any) {
    console.warn("[FactExtractor] persistTaskCompletionFact failed:", err?.message || err);
  }
}

/**
 * 专注完成回写长期记忆
 * 闭环用：专注页完成专注 → 写入 long_term_memory → 下次 Chat RAG 检索到学习模块/时长
 */
export async function persistFocusCompletionFact(
  userId: string,
  info: {
    module: string;
    actualMinutes: number;
    reflection?: string | null;
  },
): Promise<void> {
  try {
    const parts = [
      `用户完成了一次专注学习：${info.module} 模块`,
      `时长 ${info.actualMinutes} 分钟`,
      info.reflection && info.reflection.trim() && info.reflection !== "专注模式完成"
        ? `心得：${info.reflection.trim()}`
        : null,
    ].filter(Boolean);

    const fact: ExtractedFact = {
      content: parts.join("，"),
      topics: ["专注学习", info.module].filter(Boolean) as string[],
      weight: 0.7,
      source: "explicit",
    };
    await persistFacts(userId, [fact]);
  } catch (err: any) {
    console.warn("[FactExtractor] persistFocusCompletionFact failed:", err?.message || err);
  }
}

/**
 * 一站式入口：从一条用户消息中提取事实并落库
 * 设计为 fire-and-forget，不抛错、不阻塞主流程
 */
export async function extractAndPersistFacts(userId: string, userMessage: string): Promise<void> {
  try {
    // Path A：关键词匹配（同步、零成本）
    const explicit = matchExplicitFacts(userMessage);

    // Path B：LLM 提取（异步、有成本但可控）
    const llmFacts = await extractFactsViaLLM(userMessage);

    // 去重：如果同一份内容已存在（通过简单包含判断），跳过
    const merged: ExtractedFact[] = [...explicit];
    for (const f of llmFacts) {
      const dup = merged.some((m) => m.content.includes(f.content.slice(0, 20)) || f.content.includes(m.content.slice(0, 20)));
      if (!dup) merged.push(f);
    }

    if (merged.length > 0) {
      await persistFacts(userId, merged);
    }
  } catch (err: any) {
    console.warn("[FactExtractor] extractAndPersistFacts failed:", err?.message || err);
  }
}
