import { useState, useCallback, useRef } from "react";
import { Message, QuickReply } from "@/types";

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentContentRef = useRef<string>("");

  console.log(messages, '==== messages==');

  const sendMessage = useCallback(async (text: string) => {
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
          userId: "default-user",
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
                if (data.quickReplies && data.quickReplies.length > 0) {
                  setQuickReplies(data.quickReplies);
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
      }

      if (buffer.trim() && buffer.startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.type === "done" && data.quickReplies && data.quickReplies.length > 0) {
            setQuickReplies(data.quickReplies);
          }
        } catch (e) {
          console.error("Failed to parse final SSE data:", e);
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
  }, []);

  const handleQuickReply = useCallback((reply: QuickReply) => {
    sendMessage(reply.text);
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    quickReplies,
    sendMessage,
    handleQuickReply,
  };
}