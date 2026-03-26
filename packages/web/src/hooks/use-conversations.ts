import { useState, useEffect, useCallback } from "react";
import { Conversation, Message } from "@/types";

const CURRENT_CONVERSATION_KEY = "currentConversationId";

export function useConversations(userId: string = "default-user") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  // loading 初始值保持 true，确保首轮 bootstrap 完成前页面不会误判成“无会话”，
  // 这是之前避免刷新后重复创建空白会话的关键之一。
  const [isLoading, setIsLoading] = useState(true);
  // hasBootstrapped 专门表示“首轮会话恢复逻辑已经跑完”，
  // 它和 isLoading 不是一回事：前者管初始化竞态，后者管请求中的 UI 状态。
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
        
        // 注册到内存存储，让当前页面中的消息视图和后续会话切换能直接复用已拉到的数据。
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
      // 这里不能在每次 load 时都盲目创建新会话，否则刷新页面时会不断堆积空白会话。
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
      // 首次进入页面时，先尝试恢复上次 localStorage 记住的会话，
      // 只有它无效时才回退到最近一条会话。
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

      // 创建完成后立即切过去，并同步写入 localStorage，避免后续刷新又回到旧会话。
      setCurrentConversationId(newConversation.id);
      localStorage.setItem(CURRENT_CONVERSATION_KEY, newConversation.id);

      // 注册到内存存储，让当前页无需重新请求就能马上使用这条会话。
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

      // 这里不仅是“拉一条会话详情”，也会把列表里对应会话的消息和时间一起刷新掉。
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
        // 当前选中会话被删掉时，先清空 currentConversationId，
        // 让上层决定是切到其他会话还是提示用户新建。
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
      // 先切 currentConversationId，再拉详情，用户点击历史会话时界面反馈会更即时。
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
      
      // 标题或消息在前端先行更新时，也同步刷新内存存储，保持当前页数据一致。
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
