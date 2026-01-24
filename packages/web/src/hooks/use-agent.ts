import { useState, useCallback } from "react";
import { Message, QuickReply } from "@/types";
import { apiClient } from "@/lib/utils";

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

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

    try {
      const response = await apiClient.post("/api/agent/chat", {
        message: text,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.data.quickReplies) {
        setQuickReplies(response.data.quickReplies);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
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