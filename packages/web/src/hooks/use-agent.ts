"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Message, QuickReply } from "@/types";

/**
 * Agent Hook - 手动实现 SSE 流式处理
 *
 * 改回手动实现以避免 AI SDK 的复杂性问题：
 * - 手动管理消息状态
 * - 手动解析 SSE 流
 * - 更可控的错误处理
 */
export function useAgent(
  conversationId?: string,
  userId: string = "default-user",
  onTurnDone?: (conversationId: string) => void | Promise<void>
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentConversationIdRef = useRef<string | undefined>(conversationId);
  const isInitializedRef = useRef(false);
  const prevConversationIdRef = useRef<string | undefined>(conversationId);

  // 监听 conversationId 变化
  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      isInitializedRef.current = false;
      prevConversationIdRef.current = conversationId;
      currentConversationIdRef.current = conversationId;
      setMessages([]);
      setQuickReplies([]);
      setError(null);
    }
  }, [conversationId]);

  // 初始化欢迎消息（仅在没有会话ID时）
  useEffect(() => {
    if (!conversationId && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "你好！😊 我是 TechMate，你的技术学习助手。\n\n我可以帮你：\n✅ 制定技术学习计划\n✅ 查询学习进度\n✅ 解答前端/React/Next.js技术问题\n✅ 分析算法题解和代码优化\n✅ 提供面试备考建议和技术困惑疏导\n\n今天想学点什么？",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [conversationId]);

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!currentConversationIdRef.current) {
      console.warn("Cannot send message without conversationId");
      return;
    }

    // 清除状态
    setError(null);
    setQuickReplies([]);

    // 立即添加用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // 创建助手消息占位符
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }]);

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId,
          conversationId: currentConversationIdRef.current,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "请求失败" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应");
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      // 解析传统 SSE 格式
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 按 \n\n 分割 SSE 事件
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "chunk") {
              fullContent += data.content;

              // 更新助手消息
              setMessages(prev => prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: fullContent }
                  : msg
              ));
            } else if (data.type === "done") {
              if (data.quickReplies) {
                setQuickReplies(data.quickReplies);
              }
              if (data.conversationId) {
                void onTurnDone?.(data.conversationId);
              }
            } else if (data.type === "error") {
              throw new Error(data.message || "处理失败");
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.trim() && buffer.startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.type === "done" && data.quickReplies) {
            setQuickReplies(data.quickReplies);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 流结束，确保最终内容更新
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId && msg.content !== fullContent
          ? { ...msg, content: fullContent }
          : msg
      ));

    } catch (err: any) {
      if (err.name === "AbortError") {
        // 用户取消，不做处理
        return;
      }

      console.error("Send message error:", err);
      setError(err.message || "发送失败，请重试");

      // 移除空的助手消息
      setMessages(prev => prev.filter(msg => msg.id !== assistantId));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [userId, onTurnDone]);

  // 处理快捷回复
  const handleQuickReply = useCallback((reply: QuickReply) => {
    sendMessage(reply.text);
  }, [sendMessage]);

  // 外部设置消息（会话切换）
  const setMessagesExternal = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    isInitializedRef.current = true;
  }, []);

  // 停止请求
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    quickReplies,
    sendMessage,
    handleQuickReply,
    setMessages: setMessagesExternal,
    stop,
    clearError: () => setError(null),
  };
}