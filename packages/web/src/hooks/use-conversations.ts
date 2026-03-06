import { useState, useEffect, useCallback } from "react";
import { Conversation, Message } from "@/types";

const STORAGE_KEY = "conversations";
const CURRENT_CONVERSATION_KEY = "currentConversationId";

export function useConversations(userId: string = "default-user") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
    loadCurrentConversation();
  }, [userId]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/conversations?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const data = await response.json();
      const conversationsWithDates = data.conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages || [],
      }));

      if (conversationsWithDates.length > 0) {
        setConversations(conversationsWithDates);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationsWithDates));
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const storedConversations = JSON.parse(stored);
          setConversations(storedConversations);
        } else {
          setConversations(conversationsWithDates);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError("Failed to load conversations");
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConversations(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentConversation = () => {
    const stored = localStorage.getItem(CURRENT_CONVERSATION_KEY);
    if (stored) {
      setCurrentConversationId(stored);
    }
  };

  const createConversation = useCallback(async (title?: string, initialMessages?: Message[]) => {
    try {
      setError(null);

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title,
          initialMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();
      
      const newConversation: Conversation = {
        id: data.id,
        title: data.title,
        messages: initialMessages || [],
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        userId,
      };

      setConversations((prev) => {
        const updated = [newConversation, ...prev];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setCurrentConversationId(newConversation.id);
      localStorage.setItem(CURRENT_CONVERSATION_KEY, newConversation.id);

      return newConversation;
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setError("Failed to create conversation");
      throw err;
    }
  }, [userId]);

  const getConversation = useCallback(async (conversationId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/conversations/${conversationId}?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error("Failed to get conversation");
      }

      const data = await response.json();
      
      const conversation: Conversation = {
        ...data.conversation,
        createdAt: new Date(data.conversation.createdAt),
        updatedAt: new Date(data.conversation.updatedAt),
        messages: data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      };

      setConversations((prev) => 
        prev.map((c) => c.id === conversationId ? conversation : c)
      );

      return conversation;
    } catch (err) {
      console.error("Failed to get conversation:", err);
      setError("Failed to get conversation");
      throw err;
    }
  }, [userId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== conversationId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        localStorage.removeItem(CURRENT_CONVERSATION_KEY);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      setError("Failed to delete conversation");
      throw err;
    }
  }, [userId, currentConversationId]);

  const switchConversation = useCallback(async (conversationId: string) => {
    try {
      setError(null);
      setCurrentConversationId(conversationId);
      localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
      
      const conversation = await getConversation(conversationId);
      return conversation;
    } catch (err) {
      console.error("Failed to switch conversation:", err);
      setError("Failed to switch conversation");
      throw err;
    }
  }, [getConversation]);

  const updateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId
          ? { ...c, ...updates, updatedAt: new Date() }
          : c
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getGroupedConversations = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      earlier: [] as Conversation[],
    };

    conversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt);
      convDate.setHours(0, 0, 0, 0);

      if (convDate.getTime() === today.getTime()) {
        grouped.today.push(conv);
      } else if (convDate.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(conv);
      } else {
        grouped.earlier.push(conv);
      }
    });

    return grouped;
  }, [conversations]);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  return {
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    error,
    createConversation,
    getConversation,
    deleteConversation,
    switchConversation,
    updateConversation,
    getGroupedConversations,
    loadConversations,
  };
}
