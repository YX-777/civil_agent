import { useState, useEffect, useCallback } from "react";
import { Conversation, Message } from "@/types";

const CURRENT_CONVERSATION_KEY = "currentConversationId";

export function useConversations(userId: string = "default-user") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (preferredConversationId?: string | null) => {
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
        
        // 注册到内存存储
        const { conversations: convStore } = await import("@/lib/conversation-store");
        conversationsWithDates.forEach((conv: any) => {
          convStore.set(conv.id, {
            id: conv.id,
            title: conv.title,
            messages: conv.messages,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            userId: conv.userId,
          });
        });
      } else {
        setConversations(conversationsWithDates);
      }

      // 启动阶段优先恢复本地已选会话；若本地无效则回退到最新会话。
      if (preferredConversationId !== undefined) {
        const exists = conversationsWithDates.some((conv: Conversation) => conv.id === preferredConversationId);
        if (preferredConversationId && exists) {
          setCurrentConversationId(preferredConversationId);
          localStorage.setItem(CURRENT_CONVERSATION_KEY, preferredConversationId);
        } else if (conversationsWithDates.length > 0) {
          const latestConversationId = conversationsWithDates[0].id;
          setCurrentConversationId(latestConversationId);
          localStorage.setItem(CURRENT_CONVERSATION_KEY, latestConversationId);
        } else {
          setCurrentConversationId(null);
          localStorage.removeItem(CURRENT_CONVERSATION_KEY);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError("Failed to load conversations");
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedConversationId = localStorage.getItem(CURRENT_CONVERSATION_KEY);
      await loadConversations(storedConversationId);
      if (!cancelled) {
        setHasBootstrapped(true);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [userId, loadConversations]);

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
          title: title || "新对话",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();
      const conversation = data.conversation;

      const newConversation: Conversation = {
        id: conversation.id,
        title: conversation.title,
        messages: initialMessages || [],
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        userId,
      };

      // 将新会话添加到列表开头
      setConversations((prev) => {
        const updated = [newConversation, ...prev];
        return updated;
      });

      // 立即切换到新会话
      setCurrentConversationId(newConversation.id);
      localStorage.setItem(CURRENT_CONVERSATION_KEY, newConversation.id);

      // 注册到内存存储，让 Agent API 能找到这个会话
      const { conversations: convStore } = await import("@/lib/conversation-store");
      convStore.set(newConversation.id, {
        id: newConversation.id,
        title: newConversation.title,
        messages: newConversation.messages,
        createdAt: newConversation.createdAt,
        updatedAt: newConversation.updatedAt,
        userId: newConversation.userId,
      });

      console.log(`Created and switched to new conversation: ${newConversation.id}`);

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

      // 更新会话列表中的消息
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId ? conversation : c)
      );

      // 更新内存存储
      const { conversations: convStore } = await import("@/lib/conversation-store");
      convStore.set(conversationId, {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        userId: conversation.userId,
      });

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
        return updated;
      });

      // 从内存存储中删除
      const { conversations: convStore } = await import("@/lib/conversation-store");
      convStore.delete(conversationId);

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

  const updateConversation = useCallback(async (conversationId: string, updates: Partial<Conversation>) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId
          ? { ...c, ...updates, updatedAt: new Date() }
          : c
      );
      
      // 更新内存存储
      const conversation = updated.find(c => c.id === conversationId);
      if (conversation) {
        import("@/lib/conversation-store").then(({ conversations: convStore }) => {
          convStore.set(conversationId, {
            id: conversation.id,
            title: conversation.title,
            messages: conversation.messages,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            userId: conversation.userId,
          });
        });
      }
      
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
      // 只使用 createdAt（创建时间）来判断分组
      // 这样会话就不会因为更新时间变化而在分组之间跳转
      const createDate = new Date(conv.createdAt);
      createDate.setHours(0, 0, 0, 0);

      if (createDate.getTime() === today.getTime()) {
        grouped.today.push(conv);
      } else if (createDate.getTime() === yesterday.getTime()) {
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
    hasBootstrapped,
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
