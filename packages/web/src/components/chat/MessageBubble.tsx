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
 * Markdown 规范化（流式输出场景兜底）
 *
 * 解决问题：
 * 1. LLM 偶尔输出 `###标题`（# 后没空格），react-markdown 不识别会原样显示
 * 2. 流式期间不完整的代码块（```未闭合）→ 闭合
 * 3. 列表项前缺空行 → 补
 */
function normalizeMarkdown(content: string): string {
  if (!content) return content;
  let text = content;

  // 1. 归一化不可见/特殊空白：全角空格 / NBSP / 零宽空格 / 回车 → 普通空格或换行
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/[  -​　]/g, " ");

  // 2. 代码块开头：```python<code> → ```python\n<code>
  //    LLM 偶尔会把语言标签和代码挤同一行，react-markdown 不识别成代码块
  text = text.replace(/```([A-Za-z][A-Za-z0-9_+\-]*)([^\n])/g, "```$1\n$2");

  // 3. 代码块结尾：<code>``` 不在行首 → <code>\n```
  //    匹配 ``` 前面非换行非反引号字符，强制插入换行
  text = text.replace(/([^\n`])```/g, "$1\n```");

  // 4. 修复 # 后无空格（行首/换行后 1-6 个 #，紧跟非空白非 # 字符）
  text = text.replace(/(^|\n)(#{1,6})(?=[^\s#])/g, "$1$2 ");

  // 5. 修复行内出现 "...文字###标题..." 这种没换行的情况：把 ### 前补换行
  text = text.replace(/([^\n])(#{1,6})\s+(?=\S)/g, (m, prev, hashes) => {
    if (prev === " " || prev === "\t") return m;
    return `${prev}\n\n${hashes} `;
  });

  // 4. 流式期间可能出现未闭合的代码块（```后未跟语言或未闭合），兜底闭合
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) {
    text += "\n```";
  }

  // 5. 修复列表项前缺少空行（- 和 1. 前如果直接跟文字）
  text = text.replace(/([^\n])\n([-*]|\d+\.)\s/g, "$1\n\n$2 ");

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

        {/* 正式回答 — 使用 react-markdown + remark-gfm + 代码高亮 */}
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
              <span className="streaming-cursor" style={{ marginLeft: 2, color: "#6366f1" }}>▎</span>
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
