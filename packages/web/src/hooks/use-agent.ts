import { useState, useCallback, useRef, useEffect } from "react";
import { Message, QuickReply } from "@/types";

export function useAgent(
  conversationId?: string,
  userId: string = "default-user",
  onTurnDone?: (conversationId: string) => void | Promise<void>
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentContentRef = useRef<string>("");
  const isInitializedRef = useRef(false);
  const currentConversationIdRef = useRef<string | undefined>(conversationId);
  const prevConversationIdRef = useRef<string | undefined>(conversationId);

  useEffect(() => {
    // 当会话ID改变时，重置初始化状态
    if (conversationId !== prevConversationIdRef.current) {
      isInitializedRef.current = false;
      prevConversationIdRef.current = conversationId;
    }
    currentConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    // 只有在没有会话ID且没有消息时才显示欢迎消息
    if (!conversationId && !isInitializedRef.current && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "你好呀！😊 我是你的考公备考助手。\n\n我可以帮你：\n✅ 制定学习计划\n✅ 查询学习进度\n✅ 分析错题和薄弱模块\n✅ 提供备考建议和情感支持\n\n今天想聊点什么呢？",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      isInitializedRef.current = true;
    }
  }, [conversationId, messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    // Phase A 约束：发送消息前必须绑定明确的会话 ID。
    if (!currentConversationIdRef.current) {
      console.warn("Cannot send message without conversationId");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setQuickReplies([]);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    currentContentRef.current = "";

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          userId,
          conversationId: currentConversationIdRef.current,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let buffer = "";
      let newConversationId: string | undefined;
      let doneHandled = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() && line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "chunk") {
                currentContentRef.current += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: currentContentRef.current }
                      : msg
                  )
                );
              } else if (data.type === "done") {
                if (!doneHandled) {
                  doneHandled = true;
                  if (data.quickReplies && data.quickReplies.length > 0) {
                    setQuickReplies(data.quickReplies);
                  }
                  if (data.conversationId) {
                    newConversationId = data.conversationId;
                    currentConversationIdRef.current = data.conversationId;
                    // 服务端提交事务成功后，立即刷新会话列表和标题，避免用户手动刷新页面。
                    void onTurnDone?.(data.conversationId);
                  }
                }
              } else if (data.type === "error") {
                console.error("Stream error:", data.error);
                const errorMessage = currentContentRef.current + "\n\n抱歉，处理您的消息时出现了错误。";
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: errorMessage }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e, "Line:", line);
            }
          }
        }

        if (buffer.trim() && buffer.startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.type === "done" && !doneHandled) {
              doneHandled = true;
              if (data.quickReplies && data.quickReplies.length > 0) {
                setQuickReplies(data.quickReplies);
              }
              if (data.conversationId) {
                newConversationId = data.conversationId;
                currentConversationIdRef.current = data.conversationId;
                void onTurnDone?.(data.conversationId);
              }
            }
          } catch (e) {
            console.error("Failed to parse final SSE data:", e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      
      if ((error as any).name !== "AbortError") {
        const errorMessage = currentContentRef.current + "\n\n抱歉，服务暂时不可用。请稍后再试。";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: errorMessage }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [userId, onTurnDone]);

  const handleQuickReply = useCallback((reply: QuickReply) => {
    sendMessage(reply.text);
  }, [sendMessage]);

  const setMessagesExternal = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    isInitializedRef.current = true;
  }, []);

  return {
    messages,
    isLoading,
    quickReplies,
    sendMessage,
    handleQuickReply,
    setMessages: setMessagesExternal,
  };
}
