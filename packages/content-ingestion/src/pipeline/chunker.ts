import { Article } from "../types";

/**
 * 长文切片
 * - 优先按段落（连续 \n）切
 * - 然后按句号/换行切
 * - 保留 title + sourceUrl + tags 等元数据
 *
 * 设计目标：每个 chunk 1500-2500 字，避免 embedding 模型 token 超限，
 * 也避免 RAG 召回时塞给 LLM 的 context 过长
 */
const TARGET = 2000;
const MAX = 3000;
const MIN = 600;

export function chunk(article: Article): Article[] {
  const content = (article.content || "").trim();
  if (content.length <= MAX) return [article];

  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";

  for (const para of paragraphs) {
    if (buf.length === 0) {
      buf = para;
      continue;
    }
    if (buf.length + para.length + 2 <= TARGET) {
      buf = buf + "\n\n" + para;
    } else if (buf.length < MIN) {
      // 当前 buf 太短，强行合并
      buf = buf + "\n\n" + para;
    } else {
      chunks.push(buf);
      buf = para;
    }
  }
  if (buf) chunks.push(buf);

  // 超长段落兜底：单个段落超 MAX，按句号切
  const final: string[] = [];
  for (const c of chunks) {
    if (c.length <= MAX) {
      final.push(c);
    } else {
      const sentences = c.split(/(?<=[。！？.!?])\s+/);
      let s = "";
      for (const sent of sentences) {
        if (s.length + sent.length <= TARGET) {
          s = s + sent;
        } else {
          if (s) final.push(s);
          s = sent;
        }
      }
      if (s) final.push(s);
    }
  }

  return final.map((piece, idx) => ({
    ...article,
    content: piece,
    title: final.length > 1 ? `${article.title} (${idx + 1}/${final.length})` : article.title,
  }));
}
