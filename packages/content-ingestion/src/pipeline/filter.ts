import { Article } from "../types";

/**
 * 关键词白名单 — 命中任一才算技术内容
 * 标题或前 300 字符必须命中
 */
const KEYWORDS = [
  // 前端
  "react", "vue", "next", "nuxt", "svelte", "angular", "typescript", "javascript",
  "前端", "组件", "hook", "ssr", "csr", "webpack", "vite", "esbuild", "rollup",
  "css", "tailwind", "样式", "动画", "响应式",
  // 后端 & 工程
  "node", "express", "nest", "koa", "后端", "服务端", "api", "rest", "graphql",
  "数据库", "mysql", "postgres", "redis", "mongodb", "sqlite", "orm", "prisma",
  "架构", "微服务", "云", "docker", "kubernetes", "k8s",
  // 算法 & 工程
  "算法", "数据结构", "leetcode", "面试", "性能优化", "工程",
  // AI / Agent / RAG
  "ai", "agent", "llm", "大模型", "向量", "embedding", "rag", "langchain", "langgraph",
  "openai", "claude", "chatgpt", "gpt", "transformer", "fine-tune", "prompt",
  "deepseek", "qwen", "anthropic", "mistral", "gemini",
  // 通用技术
  "性能", "缓存", "并发", "异步", "网络", "安全", "测试", "ci/cd", "devops",
];

/**
 * 中文比例：用于过滤纯英文小说之类的噪音
 */
function chineseRatio(text: string): number {
  if (!text) return 0;
  const matches = text.match(/[一-鿿]/g);
  return matches ? matches.length / text.length : 0;
}

export interface FilterOptions {
  minLength?: number;       // 默认 300
  maxLength?: number;       // 默认 12000
  minChineseRatio?: number; // 默认 0（允许全英文）
  requireKeyword?: boolean; // 默认 true
}

export class ArticleFilter {
  constructor(private readonly opt: FilterOptions = {}) {}

  accept(article: Article): { ok: boolean; reason?: string } {
    const content = article.content || "";
    const title = article.title || "";

    const minLen = this.opt.minLength ?? 300;
    const maxLen = this.opt.maxLength ?? 30000;

    if (content.length < minLen) {
      return { ok: false, reason: `too_short(${content.length}<${minLen})` };
    }
    if (content.length > maxLen) {
      return { ok: false, reason: `too_long(${content.length}>${maxLen})` };
    }

    const minCn = this.opt.minChineseRatio ?? 0;
    if (minCn > 0) {
      const ratio = chineseRatio(content);
      if (ratio < minCn) {
        return { ok: false, reason: `low_chinese_ratio(${ratio.toFixed(2)})` };
      }
    }

    if (this.opt.requireKeyword ?? true) {
      const sample = (title + " " + content.slice(0, 300)).toLowerCase();
      const hit = KEYWORDS.some((kw) => sample.includes(kw));
      if (!hit) {
        return { ok: false, reason: "no_keyword" };
      }
    }

    return { ok: true };
  }
}
