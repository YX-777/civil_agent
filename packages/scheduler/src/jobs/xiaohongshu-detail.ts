export type DetailFailCategory =
  | "access_denied"
  | "transient"
  | "parse_empty"
  | "login_required"
  | "invalid_param"
  | "lookup_miss"
  | "unknown";

const DETAIL_UNAVAILABLE_PATTERNS = [
  "Sorry, This Page Isn't Available Right Now",
  "请打开小红书App扫码查看",
  "笔记不可访问",
];

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isMeaningfulText(text: string): boolean {
  // 这里故意做得保守一些，过滤掉 URL、过短字符串、纯空白，
  // 避免把页面噪音、埋点字段或错误提示当成正文。
  const normalized = normalizeInlineText(text);
  if (!normalized) return false;
  if (/^https?:\/\//i.test(normalized)) return false;
  if (normalized.length < 2) return false;
  return true;
}

function dedupeStrings(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = normalizeInlineText(line);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function collectNestedText(
  input: any,
  matcher: (lowerKey: string, path: string[]) => boolean,
  out: string[],
  path: string[] = [],
  depth = 0
): void {
  // 小红书详情结构在不同接口返回下差异较大，这里不假设固定 schema，
  // 而是递归扫描“像正文/像评论”的字段。depth 上限用于防止异常深度对象拖垮解析。
  if (input == null || depth > 6) return;

  if (Array.isArray(input)) {
    for (const item of input) {
      collectNestedText(item, matcher, out, path, depth + 1);
    }
    return;
  }

  if (typeof input !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    const nextPath = [...path, lowerKey];

    if (typeof value === "string" && matcher(lowerKey, nextPath) && isMeaningfulText(value)) {
      out.push(value);
      continue;
    }

    collectNestedText(value, matcher, out, nextPath, depth + 1);
  }
}

function extractBodyText(detail: any): string[] {
  const lines: string[] = [];
  // 先尝试一轮常见字段直取，这是目前最稳定的正文来源。
  const commonPaths = [
    detail?.noteCard?.desc,
    detail?.noteCard?.description,
    detail?.note_card?.desc,
    detail?.note_card?.description,
    detail?.data?.noteCard?.desc,
    detail?.data?.noteCard?.description,
    detail?.data?.note?.desc,
    detail?.data?.note?.content,
    detail?.note?.desc,
    detail?.note?.content,
    detail?.desc,
    detail?.content,
    detail?.text,
  ];

  for (const candidate of commonPaths) {
    if (typeof candidate === "string" && isMeaningfulText(candidate)) {
      lines.push(candidate);
    }
  }

  collectNestedText(
    detail,
    (lowerKey, path) => {
      // 正文提取时主动排除 comment/reply 树，避免把评论误混进正文。
      if (!["desc", "description", "content", "text"].some((key) => lowerKey.includes(key))) {
        return false;
      }
      return !path.some((segment) => segment.includes("comment") || segment.includes("reply"));
    },
    lines
  );

  return dedupeStrings(lines);
}

function extractCommentText(detail: any, limit = 3): string[] {
  const lines: string[] = [];

  collectNestedText(
    detail,
    (lowerKey, path) => {
      // 评论这里只做“摘录补充”，不追求完整采集，避免内容冗长且噪音过多。
      const insideCommentTree = path.some(
        (segment) => segment.includes("comment") || segment.includes("reply")
      );
      if (!insideCommentTree) {
        return false;
      }
      return ["content", "text", "desc"].some((key) => lowerKey.includes(key));
    },
    lines
  );

  return dedupeStrings(lines).slice(0, limit);
}

export function extractDetailContent(detail: any): string {
  if (typeof detail === "string") {
    // 某些异常场景底层直接返回字符串，这里先保留截断文本，交给上层继续判断是否可用。
    return detail.slice(0, 6000);
  }

  const bodyLines = extractBodyText(detail);
  const commentLines = extractCommentText(detail);
  const sections: string[] = [];

  if (bodyLines.length > 0) {
    sections.push(`正文：\n${bodyLines.join("\n")}`);
  }

  if (commentLines.length > 0) {
    sections.push(
      `评论摘录：\n${commentLines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`
    );
  }

  if (sections.length === 0) {
    return "";
  }

  // 统一截断长度，避免超长正文或评论树把存储和下游 prompt 撑爆。
  return sections.join("\n\n").slice(0, 6000);
}

export function isDetailUnavailableText(text: string): boolean {
  if (!text) return false;
  return DETAIL_UNAVAILABLE_PATTERNS.some((pattern) => text.includes(pattern));
}

export function classifyDetailError(message: string): DetailFailCategory {
  // 失败分类的目标不是“学术上完美”，而是要能指导后续动作：
  // 哪些需要登录、哪些值得重试、哪些是参数问题、哪些是详情映射失效。
  const text = (message || "").toLowerCase();

  if (
    text.includes("未登录") ||
    text.includes("not logged in") ||
    text.includes("login required") ||
    text.includes("xiaohongshu mcp is not logged in")
  ) {
    return "login_required";
  }

  if (
    text.includes("missing required") ||
    text.includes("feed_id") ||
    text.includes("xsec_token") ||
    text.includes("invalid argument") ||
    text.includes("bad request")
  ) {
    return "invalid_param";
  }

  if (
    text.includes("not found in notedetailmap") ||
    text.includes("notedetailmap")
  ) {
    return "lookup_miss";
  }

  if (
    text.includes("detail page unavailable from get_feed_detail") ||
    text.includes("sorry, this page isn't available right now") ||
    text.includes("请打开小红书app扫码查看") ||
    text.includes("笔记不可访问")
  ) {
    return "access_denied";
  }

  if (
    text.includes("timeout") ||
    text.includes("net::err") ||
    text.includes("navigation") ||
    text.includes("fetch failed") ||
    text.includes("socket hang up")
  ) {
    return "transient";
  }

  if (text.includes("empty") || text.includes("inaccessible from get_feed_detail")) {
    return "parse_empty";
  }

  return "unknown";
}

export function isRetryableDetailError(message: string): boolean {
  // 这里只返回值得自动重试的类型，避免对明显不会成功的错误做无效重试。
  const category = classifyDetailError(message);
  return category === "transient" || category === "parse_empty" || category === "lookup_miss";
}

export function buildDetailRefreshQueries(feed: any): string[] {
  // lookup_miss 时，优先拿标题和原始关键词回搜，
  // 这是当前刷新 feed/xsec_token 的最低成本补救方式。
  const candidates = [
    typeof feed?.title === "string" ? feed.title : "",
    typeof feed?.noteCard?.displayTitle === "string" ? feed.noteCard.displayTitle : "",
    typeof feed?.noteCard?.title === "string" ? feed.noteCard.title : "",
    typeof feed?._keyword === "string" ? feed._keyword : "",
  ];

  const normalized = candidates
    .map((item) => normalizeInlineText(item))
    .filter((item) => item.length >= 2);

  return dedupeStrings(normalized);
}

function getFeedId(feed: any): string | undefined {
  return feed?.id ?? feed?.postId ?? feed?.post_id ?? feed?.noteCard?.noteId ?? feed?.noteCard?.id;
}

function getFeedTitle(feed: any): string {
  return normalizeInlineText(
    String(
      feed?.title ??
        feed?.noteCard?.displayTitle ??
        feed?.noteCard?.title ??
        feed?.note_card?.displayTitle ??
        ""
    )
  );
}

export function selectRefreshFeedCandidate(originalFeed: any, feeds: any[]): any | null {
  const originalId = getFeedId(originalFeed);
  const originalTitle = getFeedTitle(originalFeed);

  for (const feed of feeds) {
    // 有原始 postId 时优先按 id 精确命中，这比标题可靠得多。
    if (originalId && getFeedId(feed) === originalId) {
      return feed;
    }
  }

  if (!originalTitle) {
    return null;
  }

  for (const feed of feeds) {
    // 标题全等是第二优先级，适合处理 id 失效但搜索结果仍能定位到原帖的场景。
    if (getFeedTitle(feed) === originalTitle) {
      return feed;
    }
  }

  for (const feed of feeds) {
    const title = getFeedTitle(feed);
    // 最后才做“包含关系”兜底。调用方仍需要再判断是不是同一条帖子，
    // 否则很容易把相似标题误判成恢复成功。
    if (title && (title.includes(originalTitle) || originalTitle.includes(title))) {
      return feed;
    }
  }

  return null;
}
