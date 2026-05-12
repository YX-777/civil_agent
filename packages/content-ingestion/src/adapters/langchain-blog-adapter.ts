import { Article, FetchOptions, IContentAdapter } from "../types";
import { XMLParser } from "fast-xml-parser";

/**
 * LangChain Blog adapter
 *
 * 数据源：LangChain 官方博客 RSS feed（Ghost CMS），全是 LangChain/LangGraph/Agent/RAG 主题。
 * 链接 100% 准确（指向 blog.langchain.dev/<slug> 或 changelog.langchain.com）。
 *
 * 候选 feed URL（依次 fallback）：
 * 1. https://blog.langchain.dev/rss/
 * 2. https://blog.langchain.com/rss/
 * 3. https://changelog.langchain.com/feed.xml
 */
const CANDIDATE_FEED_URLS = [
  "https://blog.langchain.dev/rss/",
  "https://blog.langchain.com/rss/",
  "https://changelog.langchain.com/feed.xml",
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

function inferCategory(title: string, content: string): string {
  const text = `${title} ${content.slice(0, 500)}`.toLowerCase();
  if (/\b(langgraph)/.test(text)) return "langchain";
  if (/\b(rag|retrieval[\s-]?augment)/.test(text)) return "rag";
  if (/\b(agent|agentic|tool[\s-]?use)/.test(text)) return "agent";
  if (/\b(llm|gpt|claude|llama|mistral)/.test(text)) return "llm";
  return "langchain";
}

export class LangChainBlogAdapter implements IContentAdapter {
  readonly source = "langchain-blog";

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
      if (verbose) console.log(`[langchain-blog] feed unreachable: ${url}, trying next`);
    }
    if (!xml) {
      console.warn(`[langchain-blog] all feed URLs failed`);
      return [];
    }
    if (verbose) console.log(`[langchain-blog] using feed: ${usedUrl}`);

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed: any = parser.parse(xml);

    const entries: any[] =
      parsed?.rss?.channel?.item ??
      parsed?.feed?.entry ??
      [];

    if (verbose) console.log(`[langchain-blog] entries=${entries.length}`);

    const articles: Article[] = [];
    for (const entry of entries.slice(0, limit)) {
      try {
        const title = entry.title?.["#text"] ?? entry.title ?? "";
        const rawContent =
          entry["content:encoded"] ??
          entry.content?.["#text"] ??
          entry.content ??
          entry.description ??
          entry.summary?.["#text"] ??
          entry.summary ??
          "";
        const text = stripHtml(String(rawContent));
        if (!text) continue;

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
          publishedAt: entry.pubDate ?? entry.published ?? entry.updated,
          author: entry["dc:creator"] ?? entry.author?.name ?? "LangChain",
        });
        if (verbose) console.log(`[langchain-blog] +${titleStr.slice(0, 50)} (${text.length} chars)`);
      } catch (e: any) {
        console.warn(`[langchain-blog] entry parse failed: ${e?.message || e}`);
      }
    }

    return articles;
  }
}
