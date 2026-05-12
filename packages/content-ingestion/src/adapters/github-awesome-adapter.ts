import { Article, FetchOptions, IContentAdapter } from "../types";

/**
 * GitHub Awesome READMEs adapter
 *
 * 拉取几个知名 awesome 仓库的 README，按 `## ` heading 切分，
 * 每个 section 作为一条 Article。
 *
 * 数据源：raw.githubusercontent.com，完全合规、稳定。
 */

interface AwesomeRepo {
  /** GitHub 仓库路径 owner/repo */
  repo: string;
  /** 默认分支 */
  branch: string;
  /** README 文件路径 */
  readmePath: string;
  /** 主题类目 */
  category: string;
  /** 备注 */
  hint: string;
}

const REPOS: AwesomeRepo[] = [
  { repo: "enaqx/awesome-react", branch: "master", readmePath: "README.md", category: "frontend", hint: "React 生态" },
  { repo: "vuejs/awesome-vue", branch: "master", readmePath: "README.md", category: "frontend", hint: "Vue 生态" },
  { repo: "sindresorhus/awesome-nodejs", branch: "main", readmePath: "readme.md", category: "backend", hint: "Node.js 生态" },
  { repo: "e2b-dev/awesome-ai-agents", branch: "main", readmePath: "README.md", category: "ai", hint: "AI Agents" },
  { repo: "hannibal046/Awesome-LLM", branch: "main", readmePath: "README.md", category: "ai", hint: "LLM 资源" },
  { repo: "Hannibal046/Awesome-LLM", branch: "main", readmePath: "README.md", category: "ai", hint: "LLM 资源（大小写兜底）" },
];

async function fetchText(url: string, timeoutMs = 20000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "TechMate-Ingestion/1.0" },
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
 * 按 `## ` 切分 markdown，每个 section 作为一篇
 * 跳过过短的 section
 */
function splitByH2(md: string): Array<{ title: string; body: string }> {
  // 用 `\n## ` 切，第一段是 H1 前的导言，可保留作为 intro
  const parts = md.split(/\n##\s+/);
  if (parts.length < 2) return [];
  const head = parts[0];
  const sections: Array<{ title: string; body: string }> = [];

  // 头部如果包含 H1，可以单独作为 intro 部分
  const introMatch = head.match(/^#\s+(.+)$/m);
  if (introMatch && head.length > 500) {
    sections.push({ title: introMatch[1].trim() + " · 导言", body: head });
  }

  for (let i = 1; i < parts.length; i++) {
    const piece = parts[i];
    const firstLine = piece.split("\n")[0].trim();
    const body = "## " + piece;
    if (body.length < 500) continue;
    sections.push({ title: firstLine.replace(/[#`*]/g, "").trim(), body });
  }
  return sections;
}

export class GithubAwesomeAdapter implements IContentAdapter {
  readonly source = "github-awesome";

  async fetch(options: FetchOptions = {}): Promise<Article[]> {
    const limit = options.limit ?? 80;
    const verbose = options.verbose;
    const articles: Article[] = [];

    for (const repo of REPOS) {
      if (articles.length >= limit) break;
      // jsdelivr CDN 比 raw.githubusercontent.com 在国内稳定得多
      const url = `https://cdn.jsdelivr.net/gh/${repo.repo}@${repo.branch}/${repo.readmePath}`;
      const md = await fetchText(url);
      if (!md) {
        if (verbose) console.log(`[awesome] ${repo.repo} fetch failed, skip`);
        continue;
      }
      const sections = splitByH2(md);
      if (verbose) console.log(`[awesome] ${repo.repo} → ${sections.length} sections`);

      for (const sec of sections) {
        if (articles.length >= limit) break;
        articles.push({
          title: `${repo.hint} · ${sec.title}`,
          content: sec.body,
          source: this.source,
          sourceUrl: `https://github.com/${repo.repo}`,
          category: repo.category,
          author: repo.repo,
          tags: ["awesome", repo.category],
        });
      }
    }

    return articles;
  }
}
