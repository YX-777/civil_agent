"use client";

import { Card, Avatar, Typography } from "antd";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";
import { XMarkdown } from "@ant-design/x-markdown";
import { Message } from "@/types";

const { Text } = Typography;

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * 消息气泡组件
 *
 * 参考 ChatGPT 等主流 AI Chat 产品的设计：
 * - 助手消息使用 Markdown 渲染
 * - 流式输出时显示打字机光标效果
 * - 用户消息使用普通文本
 */
export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: 12,
      }}>
        <Avatar
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          className="hover-lift"
          style={{
            backgroundColor: isUser ? "#0D9488" : "#14B8A6",
            boxShadow: isUser
              ? "0 4px 12px rgba(13, 148, 136, 0.25)"
              : "0 4px 12px rgba(20, 184, 166, 0.25)",
          }}
        />
        <Card
          className={isUser ? "" : "glass-card hover-lift"}
          style={{
            maxWidth: "80%",
            borderRadius: 16,
            background: isUser
              ? "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)"
              : "rgba(255, 255, 255, 0.85)",
            border: isUser ? "none" : "1px solid rgba(13, 148, 136, 0.1)",
            boxShadow: isUser
              ? "0 8px 24px rgba(13, 148, 136, 0.2)"
              : "0 4px 16px rgba(13, 148, 136, 0.08)",
          }}
          bodyStyle={{ padding: "14px 18px" }}
        >
          {isUser ? (
            // 用户消息：普通文本
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              {message.content}
            </Text>
          ) : (
            // 助手消息：Markdown 渲染 + 打字机效果
            <div style={{
              color: "#134E4A",
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              {/* 内容为空且正在流式输出时，显示思考动画 */}
              {isStreaming && !message.content ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="thinking-dot" style={{ animationDelay: "0s" }}>●</span>
                  <span className="thinking-dot" style={{ animationDelay: "0.2s" }}>●</span>
                  <span className="thinking-dot" style={{ animationDelay: "0.4s" }}>●</span>
                  <span style={{ marginLeft: 4, color: "#5EEAD4" }}>思考中</span>
                </div>
              ) : (
                <>
                  <XMarkdown>{message.content}</XMarkdown>
                  {/* 流式输出时显示打字机光标 */}
                  {isStreaming && message.content && (
                    <span
                      className="cursor-blink"
                      style={{
                        marginLeft: 2,
                        color: "#14B8A6",
                        fontWeight: 300,
                      }}
                    >
                      ▎
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <Text
              style={{
                fontSize: 12,
                color: isUser ? "rgba(255, 255, 255, 0.8)" : "#0F766E",
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}