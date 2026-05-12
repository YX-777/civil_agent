"use client";

import { useState } from "react";
import { Tooltip, message as antdMessage } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "framer-motion";
import { Message, UsedSource, ExecutionStep } from "@/types";
import "highlight.js/styles/github.css";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

// 时间戳格式化
function formatTimestamp(date: Date): string {
  const now = new Date();
  const msgDate = new Date(date);
  const isToday = now.toDateString() === msgDate.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === msgDate.toDateString();
  const time = msgDate.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `昨天 ${time}`;
  return msgDate.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) + " " + time;
}

// 加载中三点动画
function PendingDots() {
  return (
    <span className="thinking-dots" style={{ marginLeft: 4, color: "#9ca3af" }}>
      <span style={{ animationDelay: "0s" }}>.</span>
      <span style={{ animationDelay: "0.2s" }}>.</span>
      <span style={{ animationDelay: "0.4s" }}>.</span>
    </span>
  );
}

/**
 * 执行轨迹组件 — 基于 LangGraph 节点真实执行步骤
 *
 * 面试讲法："这就是 Agent 调用链路的实时可观测，每一步都对应代码里一个真实的执行节点"
 *
 * 设计：
 * - 流式期间：自动展开，实时显示步骤进度（running → done）
 * - 流式结束后：默认折叠，标题显示总览（已完成 X 步），点击可展开详情
 */
function ExecutionStepsSection({
  steps,
  isStreaming,
}: {
  steps: ExecutionStep[];
  isStreaming: boolean;
}) {
  // 流式期间默认展开，结束后默认收起
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded === null ? isStreaming : userExpanded;

  if (!steps || steps.length === 0) return null;

  // 流式结束后：把任何残留的 running 视为 done（兜底，避免一直显示"执行中"）
  const effectiveSteps: ExecutionStep[] = !isStreaming
    ? steps.map(s => (s.status === "running" ? { ...s, status: "done" as const } : s))
    : steps;

  const doneCount = effectiveSteps.filter(s => s.status !== "running").length;
  const allDone = !isStreaming;

  return (
    <div
      style={{
        marginBottom: 12,
        background: "#f9fafb",
        borderRadius: 10,
        border: "1px solid #f0f0f0",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setUserExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontWeight: 500 }}>
          <span>{allDone ? "🔎" : "⚙️"}</span>
          <span>
            {allDone ? `已完成 ${steps.length} 个执行步骤` : `执行中... (${doneCount}/${steps.length})`}
          </span>
          {!allDone && <PendingDots />}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{expanded ? "收起 ▲" : "展开 ▼"}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "4px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {effectiveSteps.map((step, i) => (
                <div
                  key={`${step.id}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontSize: 14, marginTop: 1 }}>{step.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#374151", fontWeight: 500 }}>{step.label}</span>
                      {step.status === "running" && <PendingDots />}
                      {step.status === "done" && (
                        <span style={{ color: "#16a34a", fontSize: 12 }}>✓</span>
                      )}
                      {step.status === "skip" && (
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>已跳过</span>
                      )}
                    </div>
                    {step.detail && (
                      <div style={{ marginTop: 2, color: "#9ca3af", fontSize: 12 }}>
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 参考来源组件 — 默认折叠，仅展示 kb / web，不透出 memory（内部机制）
 */
function SourcesSection({ sources }: { sources: UsedSource[] }) {
  // 过滤掉 memory，仅显示 kb + web
  const visible = sources.filter(s => s.type !== "memory");
  const [expanded, setExpanded] = useState(false);  // 默认折叠

  if (visible.length === 0) return null;

  const groups = {
    kb: visible.filter(s => s.type === "kb"),
    web: visible.filter(s => s.type === "web"),
  };

  const meta = {
    kb: { icon: "📚", label: "本地知识库", color: "#0891b2", border: "#cffafe" },
    web: { icon: "🌐", label: "联网搜索", color: "#16a34a", border: "#dcfce7" },
  } as const;

  const hostFromUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  };

  const summary = (["kb", "web"] as const)
    .filter(t => groups[t].length > 0)
    .map(t => `${meta[t].icon} ${groups[t].length}`)
    .join(" · ");

  return (
    <div
      style={{
        marginTop: 12,
        background: "#fafafa",
        borderRadius: 10,
        border: "1px solid #f0f0f0",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span style={{ color: "#6b7280", fontWeight: 500 }}>
          📎 参考来源 ({visible.length}) · {summary}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{expanded ? "收起 ▲" : "展开 ▼"}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "4px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.keys(groups) as Array<"kb" | "web">).map(type => {
                const list = groups[type];
                if (!list.length) return null;
                const m = meta[type];
                return (
                  <div key={type}>
                    <div style={{ fontSize: 12, color: m.color, fontWeight: 500, marginBottom: 6 }}>
                      {m.icon} {m.label} · {list.length} 条
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {list.map((s, i) => {
                        const host = hostFromUrl(s.url);
                        const inner = (
                          <div
                            style={{
                              padding: "8px 10px",
                              borderRadius: 6,
                              background: "#fff",
                              border: `1px solid ${m.border}`,
                              fontSize: 13,
                              lineHeight: 1.5,
                              cursor: s.url ? "pointer" : "default",
                              transition: "all 0.15s",
                            }}
                          >
                            <div
                              style={{
                                color: "#374151",
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {s.title}
                            </div>
                            {(host || typeof s.score === "number") && (
                              <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#9ca3af" }}>
                                {host && <span>🔗 {host}</span>}
                                {typeof s.score === "number" && <span>相关度 {(s.score * 100).toFixed(0)}%</span>}
                              </div>
                            )}
                          </div>
                        );
                        if (s.url) {
                          return (
                            <a
                              key={`${type}-${i}`}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              style={{ textDecoration: "none" }}
                            >
                              {inner}
                            </a>
                          );
                        }
                        return <div key={`${type}-${i}`}>{inner}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 答案正文兜底过滤 — LLM 万一还是输出了 "## 参考来源"，切掉避免重复展示
 */
function stripReferencesSection(content: string): string {
  if (!content) return content;
  return content.replace(/\n+#{1,3}\s*[📎🔗]?\s*参考来源[\s\S]*$/u, "").trimEnd();
}

/**
 * LLM 输出归一化（精简版 / minimal safety net）
 *
 * 设计原则：**根本的格式正确由 system prompt 强约束（见 system-prompts.ts DEFAULT）**，
 * 此函数只做最稳定、误伤极小的兜底，应对模型偶尔不遵守 prompt 的情况。
 *
 * 删除的复杂规则（容易互相干扰、误伤其他场景）：
 *  - 内联标题/列表/表格拆分（标题/列表/表格挤在段落里）
 *  - 中文标点后的内联 list marker 拆分
 *  - `***` 拆 list+bold
 *  - 表格 `||` 双竖线
 * 这些场景全部交给 system prompt 处理。
 */
function normalizeMarkdown(content: string): string {
  if (!content) return content;
  let text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // ===== 代码栅栏：5 条最稳定的兜底 =====
  // 1. ``` 紧贴前面非换行非反引号字符 → 补空行
  text = text.replace(/([^\n`])(```)/g, "$1\n\n$2");

  // 2. 已知语言白名单精确匹配 + 紧跟代码字母 → 强制插入 \n
  //    处理 "```typescriptimport React" 这种语言名+代码字母完全连写
  {
    const KNOWN_LANGS = "tsx|jsx|typescript|javascript|python|golang|go|rust|cpp|csharp|java|kotlin|swift|ruby|bash|shell|zsh|powershell|sh|json|yaml|yml|html|css|scss|less|sql|markdown|md|xml|toml|ini|graphql|gql|dockerfile|nginx|diff|vue|svelte|astro|tex|latex|lua|haskell|scala|dart|php|elixir|erlang|clojure|c\\+\\+|c#|c|r|matlab";
    text = text.replace(
      new RegExp(`(\`\`\`)(${KNOWN_LANGS})(?=[A-Za-z])`, "gi"),
      "$1$2\n"
    );
  }

  // 3. ```lang 后紧跟非字母非空白边界字符 → 加 \n
  //    用显式字符类禁止回溯：避免 "(```[A-Za-z]+)(?=\S)" 在 "```typescript\n..." 上
  //    回溯到 "```typescrip" + 后跟 "t" 造成 "typescript" 被切
  text = text.replace(
    /(```[A-Za-z][A-Za-z0-9_+\-]*)([^A-Za-z0-9_+\-\s\n])/g,
    "$1\n$2"
  );

  // 4. 闭合 ``` 后紧跟非空白非字母非反引号 → 补空行
  text = text.replace(/(```)(?![A-Za-z\s`])/g, "$1\n\n");

  // ===== 行首符号缺空格的修复（只动行首，误伤风险极低）=====
  // 5. 行首 # 后紧贴内容 → 加空格："###Header" → "### Header"
  text = text.replace(/(^|\n)(#{1,6})(?![#\s])/g, "$1$2 ");

  // 6. 行首 `-` 后紧贴内容 → 加空格："-关键点" / "-**bold**" → "- xxx"
  //    排除：`-` 后又跟 `-`（避免 `---` 水平线被误拆）
  text = text.replace(/(^|\n)-(?=[^\s\-\n])/g, "$1- ");

  // 7. 行首 `*` 后紧贴内容 → 加空格："*关键点" → "* 关键点"
  //    排除：`*` 后紧跟 `*` 或 `-`（避免破坏 `**bold**` 和 `*-` 罕见组合）
  text = text.replace(/(^|\n)\*(?=[^\s*\-\n])/g, "$1* ");

  // 8. 行首数字 ordered list 后紧贴内容 → 加空格："1.**bold**" → "1. **bold**"
  text = text.replace(/(^|\n)(\d{1,3})\.(?=[^\d\s])/g, "$1$2. ");

  // ===== 关键内联拆分（应对 LLM 偶尔不遵守 prompt）=====
  // 9a. 内联标题（标题挤在段落里 + 之间有空格）→ 拆出独立行
  //     e.g. "上一段。### 我的标题" → "上一段。\n\n### 我的标题"
  text = text.replace(/([^\n#])(#{1,6}[ \t]+\S)/g, "$1\n\n$2");

  // 9b. 内联标题且 # 后**直接紧贴**中文/emoji/英文（LLM 常见输出 "信息###💡 标题" / "...应用###混合架构"）
  //     条件：prev 必须是中文/标点（避免 "tag###1" 这类罕见技术写法被误拆）
  //     # 后是非空格/#/换行
  //     拆出独立行后，规则 5 会接力把 "###X" 加空格变成 "### X"
  text = text.replace(
    /([。！？!?；;，,、：:一-鿿)】»"”」』])(#{1,6})(?=[^\s#\n])/g,
    "$1\n\n$2",
  );

  // 9c. 行首 ### 后直接跟非空白（如 "###混合架构"）→ 加空格
  //     补充规则 5 的覆盖：规则 5 只在行首 ^ 或 \n 后触发，而 9b 拆出来后新行是裸 ###X，此时再加空格
  text = text.replace(/(^|\n)(#{1,6})(?=[^\s#\n])/g, "$1$2 ");

  // 10. 列表项前已经有换行但缺空行 → 补空行
  //     e.g. "上一段内容\n- 第一项" → "上一段内容\n\n- 第一项"
  text = text.replace(/([^\n])\n((?:[-*]|\d{1,3}\.) )/g, "$1\n\n$2");

  // ===== 表格修复（实测 LLM 即便 prompt 约束依然产出残缺表格，必须兜底）=====
  // 11. 行内表格紧贴文字：line scan 方式，把 "文字| cell | cell | cell |" 拆成
  //     两行（文字独占一行 + 表格独占一行）。仅当 line 首字符不是 |、line 含 3+ 个 | 时触发。
  {
    const lines = text.split("\n");
    const out: string[] = [];
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("|")) { out.push(line); continue; }
      const m = line.match(/^([^|]+?[^|\s])([ \t]*)(\|[ \t]*[^|\n]{1,80}[ \t]*\|[ \t]*[^|\n]{1,80}[ \t]*\|.*)$/);
      if (m && m[1].length >= 2) {
        out.push(m[1]);
        out.push("");
        out.push(m[3]);
      } else {
        out.push(line);
      }
    }
    text = out.join("\n");
  }

  // 12. 表格行被 `||` 双竖线连接（qwen 特定 bug）→ 拆成两行
  //     e.g. "数组。 || **同步性** |" → "数组。 |\n| **同步性** |"
  //     最多迭代 5 次直到收敛（一行可能被多次 || 连接）
  for (let pass = 0; pass < 5; pass++) {
    const before = text;
    text = text.replace(/(\|[^\n]{2,200}?)[ \t]*\|\|[ \t]*(?=\S)/g, "$1|\n| ");
    if (text === before) break;
  }

  // 13. 内联 ordered list 拆分：中文/英文标点 + 数字. + 内容 → 拆行 + 加空格
  //     e.g. "...旧值。2.**无限循环**" → "...旧值。\n\n2. **无限循环**"
  //     要求：prev 是结束类标点，next 不是数字（避免 "3.14" 被误拆）
  text = text.replace(/([。：；）」』、！？!?:])[ \t]*(\d{1,3})\.(?=[^\d\s])/g, "$1\n\n$2. ");

  // 14. 内联 dash/star list 拆分：标点 + dash/star + 内容 → 拆行
  //     e.g. "...结束断开。- 内容" → "...结束断开。\n\n- 内容"
  //     注意 lookahead 排除 `*` 避免命中 `**bold**` 的连续 `*`
  text = text.replace(/([。！？!?；;])[ \t]*([-])(?=[ \t]+\S)/g, "$1\n\n$2");
  text = text.replace(/([。！？!?；;])[ \t]*(\*)(?=[ \t]+[^*\s])/g, "$1\n\n$2");

  // ===== 兜底：流式期间未闭合的代码块 =====
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) text += "\n```";

  // ===== 实验性：JS/TS 代码块内启发式换行（针对 LLM 输出代码挤一行的情况）=====
  // 仅对已识别的 JS/TS 语言代码块做最稳定的几条换行恢复：
  //  - `;<keyword>` / `; <keyword>` → `;\n<keyword>`（语句分隔，允许 0+ 空格）
  //  - `;//` / `; //` → `;\n//`（注释独占行）
  //  - `}<keyword>` / `} <keyword>` → `}\n\n<keyword>`（顶级声明）
  //  - 语句结束符 `;` `)` `}` 紧贴 `//` → 注释换到下一行
  //
  // 风险：可能在罕见的字符串字面量里误插换行。整体收益 > 风险，且不影响代码语义解析。
  // 注：模型本身的 intra-token 空格丢失（`importReact`、`constUser`）无法用换行规则修复。
  text = text.replace(
    /```(tsx|jsx|typescript|javascript|ts|js)\n([\s\S]*?)\n```/g,
    (_match, lang, code) => {
      let fixed = code as string;
      // 1. `;[ws]*<keyword>` → `;\n<keyword>`（允许 0 个或多个空白）
      fixed = fixed.replace(
        /;[ \t]*(const|let|var|function|class|import|export|return|if|else|for|while|switch|try|catch|throw|interface|type|async|await|public|private|protected|readonly|static)\b/g,
        ";\n$1"
      );
      // 2. `;[ws]*//` → `;\n//`
      fixed = fixed.replace(/;[ \t]*\/\//g, ";\n//");
      // 3. `}[ws]*<keyword>` → `}\n\n<keyword>`（顶级声明，允许 0 个或多个空白）
      fixed = fixed.replace(
        /\}[ \t]*(const|let|var|function|class|export|interface|type|import)\b/g,
        "}\n\n$1"
      );
      // 4. `};[ws]*<keyword>` 同上
      fixed = fixed.replace(
        /\};[ \t]*(const|let|var|function|class|export|interface|type|import)\b/g,
        "};\n\n$1"
      );
      // 5. 语句结束符 + 注释紧贴 → 注释换行
      fixed = fixed.replace(/([);}])[ \t]*\/\//g, "$1\n//");
      // 6. `}[ws]*catch` `}[ws]*else` `}[ws]*finally` → 保持在一行（JS 习惯）
      //    上面规则 3/4 不会命中这些，因为 keyword 列表里没 catch/else/finally
      // 7. `;<标识符>` 兜底：分号后紧跟字母/$/_（任何 JS 标识符开头）→ 换行
      //    这覆盖了用户函数名（如 `;useEffect(...)`、`;fetchUser()`）等不在关键字白名单里的情况
      //    排除 `;` 后跟字符串引号 / `}` / `)` / 数字（这些不太可能是新语句起点）
      fixed = fixed.replace(/;[ \t]*(?=[A-Za-z_$][A-Za-z0-9_$]*[ \t]*[(={[<])/g, ";\n");
      return "```" + lang + "\n" + fixed + "\n```";
    }
  );

  return text;
}

// AI 头像 - 紫色渐变 T
function AIAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      T
    </div>
  );
}

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      antdMessage.success("已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      antdMessage.error("复制失败");
    }
  };

  // 用户消息：右侧灰色小气泡
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, paddingRight: 8 }}
      >
        <div style={{ padding: "10px 14px", borderRadius: 12, background: "#f3f4f6", maxWidth: "70%" }}>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: "#374151" }}>{message.content}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#9ca3af" }}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </motion.div>
    );
  }

  // 助手消息：左侧头像 + 执行轨迹 + 答案 + 来源
  const hasSteps = (message.steps?.length ?? 0) > 0;
  const hasContent = !!message.content;
  const showInitialLoading = isStreaming && !hasSteps && !hasContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16, paddingLeft: 8 }}
    >
      <AIAvatar />

      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
        {/* 加载中初始态：没有 step 也没有 content 时 */}
        {showInitialLoading && (
          <div style={{ padding: "4px 0", color: "#9ca3af", fontSize: 14 }}>
            正在思考<PendingDots />
          </div>
        )}

        {/* 执行轨迹（思考过程） */}
        {hasSteps && (
          <ExecutionStepsSection steps={message.steps!} isStreaming={isStreaming && !hasContent} />
        )}

        {/* 正式回答 — react-markdown + remark-gfm + 强力 normalize（针对 qwen 输出 bug） */}
        {hasContent && (
          <div
            className="message-content-wrapper"
            style={{ fontSize: 15, lineHeight: 1.7, color: "#374151", maxWidth: "100%" }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {normalizeMarkdown(stripReferencesSection(message.content))}
            </ReactMarkdown>
            {isStreaming && (
              <span className="streaming-cursor" style={{ marginLeft: 2, color: "#a78bfa" }}>▎</span>
            )}
          </div>
        )}

        {/* 参考来源（流式结束后） */}
        {!isStreaming && message.sources && message.sources.length > 0 && (
          <SourcesSection sources={message.sources} />
        )}

        {/* 操作栏 */}
        {(hasContent || hasSteps) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, height: 24 }}>
            <Tooltip title={copied ? "已复制" : "复制"}>
              <button
                onClick={handleCopy}
                style={{
                  padding: "4px 10px",
                  borderRadius: 10,
                  border: "none",
                  background: copied ? "#f0fdf4" : "#f5f3ff",
                  cursor: "pointer",
                  color: copied ? "#10b981" : "#8b5cf6",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s",
                }}
              >
                {copied ? <CheckOutlined style={{ fontSize: 13 }} /> : <CopyOutlined style={{ fontSize: 13 }} />}
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </motion.div>
  );
}
