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
  // 用户昵称（来自元记忆 UserProfile.nickname，跨会话生效）
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentConversationIdRef = useRef<string | undefined>(conversationId);
  const isInitializedRef = useRef(false);
  const prevConversationIdRef = useRef<string | undefined>(conversationId);

  // 加载用户元记忆中的昵称（一次性）
  useEffect(() => {
    let abort = false;
    fetch(`/api/profile?userId=${encodeURIComponent(userId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (abort) return;
        const nick = data?.profile?.nickname;
        // "学习者" 是默认值，等同于未设置
        if (nick && nick !== "学习者") setNickname(nick);
        setProfileLoaded(true);
      })
      .catch(() => { if (!abort) setProfileLoaded(true); });
    return () => { abort = true; };
  }, [userId]);

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

  // 初始化欢迎消息
  //
  // 改造说明：之前只在 conversationId 为空时显示欢迎语，导致新建空会话后欢迎语缺失。
  // 现在改为：messages 为空（新建会话 / 切换到空会话）时都显示欢迎语。
  // 真正的历史会话加载（拿到 messages 数组）会覆盖这条欢迎语。
  //
  // 关于记忆跨会话：四阶分层记忆按 userId 存储（不绑定 conversationId），
  // 所以用户名字/技能等信息会被后续所有会话的 LLM prompt 自动用上 — 无需写到欢迎语里。
  useEffect(() => {
    // 等到 profile 加载完成（含 nickname）再生成欢迎语，避免欢迎语先空再被覆盖
    if (!profileLoaded) return;
    if (messages.length === 0 && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const greeting = nickname
        ? `你好，**${nickname}**！欢迎回来 👋 我是 **TechMate**，你的 AI 技术学习助手。`
        : "你好！😊 我是 **TechMate**，你的 AI 技术学习助手。";
      const memoryLine = nickname
        ? "- 🧠 跨会话记住你的技能水平和偏好"
        : "- 🧠 跨会话记住你的技能水平和偏好（告诉我你叫什么，我会记住的）";
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `${greeting}\n\n我可以帮你：\n- 💡 解答前端 / React / Next.js / TypeScript 技术问题\n- 📚 基于本地知识库 + 联网搜索给出有依据的回答\n- 🎯 制定个性化学习计划并追踪进度\n${memoryLine}\n\n说点你想学的吧 👇`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [profileLoaded, nickname, messages.length, conversationId]);

  // 发送消息（支持快捷回复的上下文处理）
  const sendMessage = useCallback(async (text: string, displayText?: string) => {
    if (!currentConversationIdRef.current) {
      console.warn("Cannot send message without conversationId");
      return;
    }

    // 清除状态
    setError(null);
    setQuickReplies([]);

    // 用户消息显示 displayText（快捷回复场景），否则显示 text
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayText || text,  // 显示内容优先使用 displayText
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
          message: text,  // 发送给后端的是完整上下文
          userId,
          conversationId: currentConversationIdRef.current,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "请求失败" }));

        // ========== GuardRail 拦截：转成消息流里的告警卡片，不弹 Alert ==========
        if (errorData?.code === "GUARDRAIL_BLOCKED" && errorData?.guardrail) {
          // 移除占位的空 assistant 消息，插入一条 system 拦截消息
          setMessages(prev => {
            const withoutPlaceholder = prev.filter(m => m.id !== assistantId);
            return [
              ...withoutPlaceholder,
              {
                id: `guardrail-${Date.now()}`,
                role: "system" as const,
                content: errorData.error || "输入被 GuardRail 拦截",
                timestamp: new Date(),
                guardrailBlock: {
                  layer: errorData.guardrail.layer || "input",
                  maxRisk: errorData.guardrail.maxRisk || "high",
                  hits: errorData.guardrail.hits || [],
                },
              },
            ];
          });
          return; // 静默退出，不进 catch
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应");
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let fullThought = "";  // 新增：思考过程
      let buffer = "";

      // 解析传统 SSE 格式（支持 thought 和 chunk 分离）
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

            if (data.type === "thought") {
              // 思考过程（已弃用，但保留兼容）
              fullThought += data.content;
              setMessages(prev => prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, thoughts: fullThought }
                  : msg
              ));
            } else if (data.type === "step") {
              // 执行轨迹：按 stepId 合并 running → done/skip
              setMessages(prev => prev.map(msg => {
                if (msg.id !== assistantId) return msg;
                const existing = msg.steps || [];
                const idx = existing.findIndex(s => s.id === data.stepId);
                const newStep = {
                  id: data.stepId,
                  label: data.label,
                  icon: data.icon,
                  status: data.status,
                  detail: data.detail,
                };
                const nextSteps = idx >= 0
                  ? existing.map((s, i) => i === idx ? newStep : s)
                  : [...existing, newStep];
                return { ...msg, steps: nextSteps };
              }));
            } else if (data.type === "chunk") {
              // 正式回答
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
              // 更新 thoughts + sources + guardrail（如果服务端返回了）
              setMessages(prev => prev.map(msg =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      ...(data.thoughts ? { thoughts: data.thoughts } : {}),
                      ...(Array.isArray(data.sources) ? { sources: data.sources } : {}),
                      ...(data.guardrail ? { guardrail: data.guardrail } : {}),
                      ...(data.traceId ? { traceId: data.traceId } : {}),
                    }
                  : msg
              ));
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

  // 处理快捷回复（添加上下文提示）
  const handleQuickReply = useCallback((reply: QuickReply) => {
    // 用户消息显示原始内容（简洁）
    const displayText = reply.text;

    // 发送给后端的消息附加上下文（让模型理解意图）
    const contextualMessage = `用户选择了快捷回复选项：${reply.text}`;

    sendMessage(contextualMessage, displayText);  // 第一个参数是发送内容，第二个是显示内容
  }, [sendMessage]);

  // 外部设置消息（会话切换）
  // 关键：只有真的拿到了历史消息时才标记已初始化；空数组意味着新会话，
  // 应让欢迎语 useEffect 触发，而不是把它锁死。
  const setMessagesExternal = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    if (newMessages.length > 0) {
      isInitializedRef.current = true;
    } else {
      isInitializedRef.current = false;
    }
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