import { Article, FetchOptions, IContentAdapter } from "../types";
import { XMLParser } from "fast-xml-parser";

/**
 * HuggingFace Blog adapter
 *
 * 数据源：HF 官方博客 Atom/RSS feed，全是 AI/LLM/Agent/RAG/Transformer 一手内容。
 * 链接 100% 准确（指向 huggingface.co/blog/<slug>）。
 *
 * 候选 feed URL（依次 fallback，URL 可能随时间变）：
 * 1. https://huggingface.co/blog/feed.xml
 * 2. https://huggingface.co/blog.atom
 */
const CANDIDATE_FEED_URLS = [
  "https://huggingface.co/blog/feed.xml",
  "https://huggingface.co/blog.atom",
];

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "[图片]")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchText(url: string, timeoutMs = 20000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 TechMate-Ingestion/1.0" },
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * 根据标题/摘要推断更细类目（高于 "ai" 默认）
 */
function inferCategory(title: string, content: string): string {
  const text = `${title} ${content.slice(0, 500)}`.toLowerCase();
  if (/\b(rag|retrieval[\s-]?augment)/.test(text)) return "rag";
  if (/\b(agent|agentic|tool[\s-]?use|function[\s-]?call)/.test(text)) return "agent";
  if (/\b(langchain|langgraph)/.test(text)) return "langchain";
  if (/\b(llm|language model|gpt|llama|mistral|qwen|claude)/.test(text)) return "llm";
  return "ai";
}

export class HuggingFaceBlogAdapter implements IContentAdapter {
  readonly source = "huggingface-blog";

  async fetch(options: FetchOptions = {}): Promise<Article[]> {
    const limit = options.limit ?? 50;
    const verbose = options.verbose;

    let xml: string | null = null;
    let usedUrl = "";
    for (const url of CANDIDATE_FEED_URLS) {
      xml = await fetchText(url);
      if (xml) {
        usedUrl = url;
        break;
      }
      if (verbose) console.log(`[hf-blog] feed unreachable: ${url}, trying next`);
    }
    if (!xml) {
      console.warn(`[hf-blog] all feed URLs failed`);
      return [];
    }
    if (verbose) console.log(`[hf-blog] using feed: ${usedUrl}`);

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed: any = parser.parse(xml);

    // 兼容 atom (feed.entry) 和 rss (rss.channel.item)
    const entries: any[] =
      parsed?.feed?.entry ??
      parsed?.rss?.channel?.item ??
      [];

    if (verbose) console.log(`[hf-blog] entries=${entries.length}`);

    const articles: Article[] = [];
    for (const entry of entries.slice(0, limit)) {
      try {
        const title = entry.title?.["#text"] ?? entry.title ?? "";
        // atom: <content>; rss: <description>/<content:encoded>
        const rawContent =
          entry.content?.["#text"] ??
          entry.content ??
          entry["content:encoded"] ??
          entry.summary?.["#text"] ??
          entry.summary ??
          entry.description ??
          "";
        const text = stripHtml(String(rawContent));
        if (!text) continue;

        // atom: link 是对象数组（带 @_href）；rss: link 是字符串
        let url = "";
        if (entry.link) {
          if (typeof entry.link === "string") {
            url = entry.link;
          } else if (Array.isArray(entry.link)) {
            url = entry.link[0]?.["@_href"] || entry.link[0] || "";
          } else {
            url = entry.link["@_href"] || entry.link["#text"] || "";
          }
        }

        const titleStr = String(title).trim();
        articles.push({
          title: titleStr,
          content: text,
          source: this.source,
          sourceUrl: url,
          category: inferCategory(titleStr, text),
          publishedAt: entry.published ?? entry.pubDate ?? entry.updated,
          author: entry.author?.name ?? entry["dc:creator"] ?? "HuggingFace",
        });
        if (verbose) console.log(`[hf-blog] +${titleStr.slice(0, 50)} (${text.length} chars)`);
      } catch (e: any) {
        console.warn(`[hf-blog] entry parse failed: ${e?.message || e}`);
      }
    }

    return articles;
  }
}
