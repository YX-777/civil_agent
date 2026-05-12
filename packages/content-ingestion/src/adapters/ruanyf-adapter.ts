import { Article, FetchOptions, IContentAdapter } from "../types";
import { XMLParser } from "fast-xml-parser";

/**
 * 阮一峰博客 atom feed adapter
 * - URL: https://www.ruanyifeng.com/blog/atom.xml
 * - feed 直接带 <content type="html">，无需二次抓
 * - 内容质量极高（科技爱好者周刊为主）
 */
const FEED_URL = "https://www.ruanyifeng.com/blog/atom.xml";

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

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 TechMate-Ingestion/1.0" },
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(t);
  }
}

export class RuanyfAdapter implements IContentAdapter {
  readonly source = "ruanyf";

  async fetch(options: FetchOptions = {}): Promise<Article[]> {
    const limit = options.limit ?? 30;
    const verbose = options.verbose;

    const xml = await fetchText(FEED_URL);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed: any = parser.parse(xml);

    const entries: any[] = parsed?.feed?.entry ?? [];
    if (verbose) console.log(`[ruanyf] feed entries=${entries.length}`);

    const articles: Article[] = [];
    for (const entry of entries.slice(0, limit)) {
      try {
        const title = entry.title?.["#text"] || entry.title || "无标题";
        // <content type="html"><![CDATA[...]]></content>
        // fast-xml-parser 把 CDATA 直接解开为 text
        const rawContent = entry.content?.["#text"] || entry.content || "";
        const text = stripHtml(String(rawContent));
        if (!text) continue;

        const linkObj = Array.isArray(entry.link) ? entry.link[0] : entry.link;
        const url = linkObj?.["@_href"] || "";

        articles.push({
          title: String(title).trim(),
          content: text,
          source: this.source,
          sourceUrl: url,
          category: "general",
          publishedAt: entry.published,
          author: entry.author?.name || "阮一峰",
        });
        if (verbose) console.log(`[ruanyf] +${String(title).slice(0, 40)} (${text.length} chars)`);
      } catch (e: any) {
        console.warn(`[ruanyf] entry parse failed: ${e?.message || e}`);
      }
    }

    return articles;
  }
}
