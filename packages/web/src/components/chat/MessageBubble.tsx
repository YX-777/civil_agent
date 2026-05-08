"use client";

import { useState } from "react";
import { Avatar, Tooltip, message as antdMessage } from "antd";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { XMarkdown } from "@ant-design/x-markdown";
import { motion } from "framer-motion";
import { Message } from "@/types";

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

// 思考动画
function ThinkingIndicator() {
  return (
    <div style={{ padding: "4px 0" }}>
      <span style={{ color: "#9ca3af", fontSize: 14 }}>正在思考</span>
      <span className="thinking-dots" style={{ marginLeft: 4 }}>
        <span style={{ animationDelay: "0s" }}>.</span>
        <span style={{ animationDelay: "0.2s" }}>.</span>
        <span style={{ animationDelay: "0.4s" }}>.</span>
      </span>
    </div>
  );
}

// AI头像 - 和Logo一样的紫色渐变T字母
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

  // 用户消息：右侧，小气泡
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
          paddingRight: 8,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "#f3f4f6",
            maxWidth: "70%",
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.6, color: "#374151" }}>
            {message.content}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#9ca3af" }}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </motion.div>
    );
  }

  // 助手消息：左侧，小头像，无背景框
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 24,
        paddingLeft: 8,
      }}
    >
      {/* 小头像 */}
      <AIAvatar />

      {/* 内容区域 - 无背景框 */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
        {isStreaming && !message.content ? (
          <ThinkingIndicator />
        ) : (
          <>
            <div
              className="message-content-wrapper"
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "#374151",
                maxWidth: "100%",
              }}
            >
              <XMarkdown>{message.content}</XMarkdown>
              {isStreaming && (
                <span className="streaming-cursor" style={{ marginLeft: 2, color: "#6366f1" }}>▎</span>
              )}
            </div>

            {/* 固定显示的操作栏 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                height: 24, // 固定高度防止闪烁
              }}
            >
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
          </>
        )}
      </div>
    </motion.div>
  );
}