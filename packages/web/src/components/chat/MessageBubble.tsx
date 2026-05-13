"use client";

import { useState, useRef } from "react";
import { Tooltip, message as antdMessage } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "framer-motion";
import { Message, UsedSource, ExecutionStep, GuardRailSummary } from "@/types";
import "highlight.js/styles/github.css";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  conversationId?: string;
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
 * 执行轨迹组件 — 基于 LangGraph 节点真实执行步骤。
 * 每一步都对应代码里一个真实的执行节点，是 Agent 调用链路的实时可观测视图。
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
 * GuardRail 三层防护徽章 —— 在 sources 下方展示
 * 命中 0 → 绿色 ✅ "已通过 3 层防护"
 * 命中 1+ → 黄色 ⚠️ 列出层级 + 命中数
 */
function GuardRailBadge({ guardrail, traceId, conversationId }: { guardrail: GuardRailSummary; traceId?: string; conversationId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const inputPassed = guardrail.input.passed;
  const outputPassed = guardrail.output.passed;
  const toolBlockedCount = guardrail.tool?.count ?? 0;
  const allPassed = inputPassed && outputPassed && toolBlockedCount === 0;

  const bg = allPassed ? "#f0fdf4" : "#fffbeb";
  const border = allPassed ? "#bbf7d0" : "#fde68a";
  const color = allPassed ? "#16a34a" : "#d97706";
  const icon = allPassed ? "🛡️" : "⚠️";
  const totalIssues = guardrail.input.hits + toolBlockedCount + guardrail.output.hits;
  const text = allPassed
    ? "已通过 3 层 GuardRail 防护（L1 输入 · L2 工具 · L3 输出）"
    : `GuardRail 检测到 ${totalIssues} 项告警`;

  return (
    <div
      style={{
        marginTop: 8,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color,
        }}
      >
        <span style={{ fontWeight: 500 }}>{icon} {text}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{expanded ? "收起 ▲" : "展开 ▼"}</span>
      </button>
      {expanded && (
        <div style={{ padding: "0 12px 10px", fontSize: 12, color: "#4b5563", display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            <strong>L1 输入注入检测</strong>: {inputPassed ? "✅ 通过" : `⚠️ ${guardrail.input.hits} 项 · 风险 ${guardrail.input.maxRisk}`}
          </div>
          <div>
            <strong>L2 工具参数校验</strong>:{" "}
            {toolBlockedCount === 0 ? (
              <span>✅ 通过（Zod schema + 黑名单）</span>
            ) : (
              <span style={{ color: "#d97706" }}>⚠️ 拦截 {toolBlockedCount} 次工具调用</span>
            )}
          </div>
          {guardrail.tool?.blocks?.map((b, i) => (
            <div key={i} style={{ fontSize: 11, color: "#7c2d12", paddingLeft: 16, marginTop: 2 }}>
              ❌ <code style={{ fontFamily: "monospace" }}>{b.tool}</code> · 风险 {b.maxRisk}
              {b.hits.slice(0, 2).map((h, j) => (
                <div key={j} style={{ paddingLeft: 16 }}>
                  • {h.reason}
                  {h.matchedText && (
                    <span style={{ marginLeft: 4, padding: "1px 4px", background: "#fee2e2", borderRadius: 2, fontFamily: "monospace" }}>
                      &ldquo;{h.matchedText.slice(0, 30)}&rdquo;
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div>
            <strong>L3 输出验证</strong>:{" "}
            {outputPassed ? "✅ 通过" : `⚠️ ${guardrail.output.hits} 项`}
            {typeof guardrail.output.similarity === "number" && guardrail.output.similarity > 0 && (
              <span>
                {" "}· 相关性 {(guardrail.output.similarity * 100).toFixed(0)}%
                {guardrail.output.similarity === 1 && (
                  <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>（短问题/无 RAG 时跳过此检查）</span>
                )}
              </span>
            )}
            {typeof guardrail.output.factCoverage === "number" && (
              <span>
                {" "}· 事实覆盖 {(guardrail.output.factCoverage * 100).toFixed(0)}%
                {guardrail.output.factCoverage === 1 && (
                  <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>（无 RAG 来源时跳过此检查）</span>
                )}
              </span>
            )}
          </div>
          {traceId && (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span>Trace:</span>
              <code style={{ fontFamily: "monospace", fontSize: 11 }}>{traceId}</code>
              <a
                href={`/dashboard/trace?conversationId=${encodeURIComponent(conversationId || "")}&traceId=${encodeURIComponent(traceId)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#8b5cf6" }}
              >
                🔍 在 Trace Viewer 中查看 →
              </a>
            </div>
          )}
        </div>
      )}
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

  // 5b. 行末紧贴内容的残留 # 全部删除（模型常输出 "中文###\n" 这种带尾随 # 的脏内容）
  //     仅当 # 前是非空白非 # 字符（避免误伤 ATX closed heading "### Title ###"）
  text = text.replace(/([^\s#])#{1,6}(?=$|\n)/gm, "$1");

  // 5c. 单 \n 紧贴 heading → 强制升级为空行 \n\n（确保标题不会被解析为段落延续 / 视觉上贴紧上一段）
  text = text.replace(/([^\n#])\n(#{1,6}[ \t])/g, "$1\n\n$2");

  // 5d. heading 行后单 \n 紧跟内容 → 升级为空行（确保标题和正文/列表之间始终留 blank line）
  text = text.replace(/(^|\n)(#{1,6}[ \t][^\n]+)\n(?=[^\n])/g, "$1$2\n\n");

  // 5e. 表格 header 和 separator 之间多余空行 → 移除
  //     "| 项目 | 内容 |\n\n| --- | --- |" 这种空行会让 CommonMark 不认表格
  //     处理后：header 与 separator 紧贴成合法表格
  text = text.replace(/(\|[^\n]+\|)\n\n+(?=\|[ \t]*[-:][^\n]*\|)/g, "$1\n");

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

  // 9d. heading 行紧贴有序/无序列表标记 → 拆出独立行
  //     e.g. "### 学习路径1. 作用域..." → "### 学习路径\n\n1. 作用域..."
  //     e.g. "### 推荐资料- MDN" → "### 推荐资料\n\n- MDN"
  //     条件：heading 内容以中文/中文标点结尾（避免误伤 "### Day 1." / "### Part-3" 这类技术编号）
  text = text.replace(
    /((?:^|\n)#{1,6}[ \t][^\n]{1,200}?[一-龥》】」』）)])(\d{1,3})\.(?!\d)(?=[ \t]?\S)/g,
    "$1\n\n$2.",
  );
  text = text.replace(
    /((?:^|\n)#{1,6}[ \t][^\n]{1,200}?[一-龥》】」』）)])-(?=[ \t]+\S)/g,
    "$1\n\n-",
  );

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

  // 12b. 一行内多个表格行被 `| <space> |` 合并（qwen 流式输出的另一种 bug）
  //      e.g. "| --- | --- | | 🎯 技术栈 | xxx | | 📝 练习量 | yyy |"
  //      触发条件：以 | 开头、pipe 数 ≥ 6（至少两行表格数据）
  //      切分点：`|<空白>+|` 视为行边界
  //      副作用：会把"空 cell"（`| col1 |  | col3 |`）也切开，但 LLM 实际输出几乎不产空 cell，可接受
  {
    const lines = text.split("\n");
    const out: string[] = [];
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith("|")) { out.push(line); continue; }
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount < 6) { out.push(line); continue; }
      const split = line
        .replace(/\|[ \t]+\|/g, "|\n|")
        .replace(/\|\|/g, "|\n|");
      out.push(split);
    }
    text = out.join("\n");
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

  // 14b. 中文字符 + 数字-句号-内容 → 拆分有序列表（无须前导标点，覆盖 qwen 把列表挤一行的 bug）
  //      e.g. "...实际应用2. 原型与继承：..." → "...实际应用\n\n2. 原型与继承：..."
  //      排除：`(?!\d)` 防止 `3.14` 这类小数被误拆；`(?=[ \t]?\S)` 确保 `.` 后有内容
  text = text.replace(/([一-龥])(\d{1,3})\.(?!\d)(?=[ \t]?\S)/g, "$1\n\n$2.");

  // 14c. 水平分割线 `---` 紧贴内容 → 拆出独立行
  //      e.g. "---👉确认..." → "---\n\n👉确认..."
  //      条件：`---` 后既不是空白也不是 `-`（避免破坏 setext 风格 heading underline）
  text = text.replace(/(^|\n)(-{3,})(?=[^\s\-\n])/g, "$1$2\n\n");

  // 14d. 中文字符 + dash + 空格 + 内容 → 拆分无序列表（覆盖 "推荐资料后面接 - MDN" 的 bug）
  //      e.g. "推荐资料- MDN指南" → "推荐资料\n\n- MDN指南"
  //      条件：dash 后必须有空格（避免破坏 "中-英" 之类的复合词）
  text = text.replace(/([一-龥])-(?=[ \t]+\S)/g, "$1\n\n-");

  // 14e. bullet 列表 prompt 输出的合并 bug：前面是非空白 + `-` + 可选空白 + `**` →
  //      拆出独立 bullet 行。覆盖 qwen3.6-plus 把多个 `- **field**：...` 挤一行的情况
  //      e.g. "案例-**📊难度**：入门" → "案例\n\n- **📊难度**：入门"
  //      e.g. "3 天- **💡 推荐理由**" → "3 天\n\n- **💡 推荐理由**"
  //      自然文本里 `-**` 紧贴组合极罕见，副作用低
  text = text.replace(/([^\n\s])-\s*(?=\*\*)/g, "$1\n\n- ");

  // 14f. 同上的弱化情形：qwen 偶尔丢掉 `**` 直接输出 `案例-📊难度：入门`，
  //      即"前面非空白 + `-` + emoji + 中文 label + `：`"。这种没 `**` 的 bullet 头
  //      没法靠 14e 捕获，单独处理：前面非空白 + `-` + (可选空白) + emoji 范围字符 +
  //      0-12 个中文/英文/空格 + `：/:`。
  //      满足 5 个常见 emoji 块（杂项符号、补充符号、扩展A、表情、交通） + ️ VS-16。
  //      不匹配 "已经-2024" "中-英" 这类（lookahead 严格要求 emoji 起头）。
  text = text.replace(
    /([^\n\s])-[ \t]*(?=[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}][^\n]{0,12}[：:])/gu,
    "$1\n\n- "
  );

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

export default function MessageBubble({ message, isStreaming = false, conversationId }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isGuardRailBlock = message.role === "system" && !!message.guardrailBlock;

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

  // 🚫 GuardRail 拦截消息：宽度占满的红色告警卡片
  if (isGuardRailBlock) {
    const block = message.guardrailBlock!;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ marginBottom: 16, padding: "0 8px" }}
      >
        <div
          style={{
            width: "100%",
            padding: "14px 18px",
            background: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)",
            border: "1px solid #fecaca",
            borderLeft: "4px solid #dc2626",
            borderRadius: 10,
            color: "#991b1b",
            boxShadow: "0 1px 2px rgba(220, 38, 38, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            🚫 GuardRail L{block.layer === "input" ? "1" : block.layer === "tool" ? "2" : "3"} 拦截
            <span
              style={{
                padding: "1px 8px",
                borderRadius: 4,
                background: block.maxRisk === "high" || block.maxRisk === "critical" ? "#dc2626" : "#d97706",
                color: "#fff",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {block.maxRisk}
            </span>
          </div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>{message.content}</div>
          {block.hits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, paddingTop: 8, borderTop: "1px dashed #fecaca" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#991b1b" }}>命中规则：</div>
              {block.hits.map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: "#7f1d1d", paddingLeft: 8 }}>
                  • <code style={{ fontFamily: "monospace", fontSize: 11 }}>{h.ruleId}</code> — {h.reason}
                  {h.matchedText && (
                    <span style={{ marginLeft: 6, padding: "1px 4px", background: "#fee2e2", borderRadius: 3, fontFamily: "monospace", fontSize: 11 }}>
                      &ldquo;{h.matchedText.slice(0, 30)}&rdquo;
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: "#9f1239", opacity: 0.8 }}>
            💡 这条消息未进入 Agent 处理，已被前置 GuardRail 直接拦截。所有命中规则已记录到 OTel trace。
          </div>
        </div>
      </motion.div>
    );
  }

  // 用户消息：右侧灰色小气泡
  // 关键点：
  //  - data-msg-id：让 page.tsx 的滚动 effect 能定位到这条消息
  //  - scrollMarginTop：滚到顶部时 Navbar 高度的 safe area
  //  - 入场动画**只用 opacity**，绝不动 transform/y/scale —— 这些会改变 getBoundingClientRect，
  //    会和 page.tsx 的 window.scrollTo(targetY) 计算打架，导致滚动看起来"没反应"
  //  - 视觉反馈交给 .user-bubble-just-sent 的 box-shadow 关键帧（不影响 layout）
  //  - justSent 用 useRef 锁定首帧判定：流式响应会让 messages 数组更新触发全部 bubble re-render，
  //    若直接 Date.now()-timestamp 重算，2.5s 后类名会被摘掉，动画就观察不到
  const justSentRef = useRef(
    isUser && Date.now() - new Date(message.timestamp).getTime() < 2500,
  );
  if (isUser) {
    const justSent = justSentRef.current;
    return (
      <motion.div
        data-msg-id={message.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, paddingRight: 8, scrollMarginTop: 80 }}
      >
        <div
          className={justSent ? "user-bubble-just-sent" : undefined}
          style={{ padding: "10px 14px", borderRadius: 12, background: "#f3f4f6", maxWidth: "70%" }}
        >
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
      // position:relative 让复制按钮可以 absolute 浮在右上角
      style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16, paddingLeft: 8 }}
    >
      <AIAvatar />

      {/* paddingRight 给右上角按钮留 36px 空间，文字不会被盖住 */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%", paddingRight: hasContent || hasSteps ? 36 : 0 }}>
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

        {/* 🛡️ GuardRail 三层防护徽章（流式结束后） */}
        {!isStreaming && message.guardrail && (
          <GuardRailBadge guardrail={message.guardrail} traceId={message.traceId} conversationId={conversationId} />
        )}
      </div>

      {/* 复制按钮：absolute 浮在消息容器右上角，和首行内容平齐，不占布局宽度 */}
      {(hasContent || hasSteps) && (
        <Tooltip title={copied ? "已复制" : "复制"} placement="left">
          <button
            onClick={handleCopy}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              padding: "4px 8px",
              borderRadius: 8,
              border: "none",
              background: copied ? "#f0fdf4" : "transparent",
              cursor: "pointer",
              color: copied ? "#10b981" : "#9ca3af",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "#f5f3ff";
                e.currentTarget.style.color = "#8b5cf6";
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#9ca3af";
              }
            }}
          >
            {copied ? <CheckOutlined style={{ fontSize: 14 }} /> : <CopyOutlined style={{ fontSize: 14 }} />}
          </button>
        </Tooltip>
      )}
    </motion.div>
  );
}
