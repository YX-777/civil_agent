"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Layout, Empty, Spin, message } from "antd";
import { MessageOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useAgent } from "@/hooks/use-agent";
import { useConversations } from "@/hooks/use-conversations";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import QuickReplies from "@/components/chat/QuickReplies";
import ChatSidebar from "@/components/chat/ChatSidebar";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Content } = Layout;

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const userId = "default-user";

  const {
    conversations,
    currentConversationId,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversation,
    loadConversations,
    hasBootstrapped,
    isLoading: isLoadingConversations,
  } = useConversations(userId);

  const handleAgentTurnDone = useCallback(async (conversationId: string) => {
    try {
      // 每轮对话完成后主动回源，确保标题和更新时间即时反映到侧边栏。
      await loadConversations(conversationId);
    } catch (error) {
      console.error("Failed to refresh conversations after turn done:", error);
    }
  }, [loadConversations]);

  const {
    messages,
    isLoading,
    quickReplies,
    sendMessage,
    handleQuickReply,
    setMessages: setAgentMessages,
  } = useAgent(currentConversationId || undefined, userId, handleAgentTurnDone);

  const hasInitializedConversationRef = useRef(false);

  // 初始化：等待会话列表加载完成后再初始化
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        // 等待会话列表完成 bootstrap（含 localStorage + 远端会话列表）
        if (!hasBootstrapped || isLoadingConversations) {
          console.log("Waiting for conversations to load...");
          return;
        }

        // Prevent duplicate initialization side effects on re-render.
        if (hasInitializedConversationRef.current) {
          return;
        }
        hasInitializedConversationRef.current = true;

        // 如果已经有选中会话，不做处理
        if (currentConversationId) {
          console.log(`Already has current conversation: ${currentConversationId}`);
          return;
        }

        // 如果有会话列表，选中最近的一个（第一个）
        if (conversations.length > 0) {
          await switchConversation(conversations[0].id);
          console.log(`Auto-selected most recent conversation: ${conversations[0].title}`);
        } else {
          // Ensure first chat turn has a valid conversationId before user input.
          const created = await createConversation("新对话");
          console.log(`No existing conversations, auto-created conversation: ${created.id}`);
        }
      } catch (error) {
        console.error("Failed to initialize conversation:", error);
      }
    };

    initializeConversation();
  }, [hasBootstrapped, isLoadingConversations, currentConversationId, conversations, switchConversation, createConversation]); // 依赖加载状态

  useEffect(() => {
    const loadConversationMessages = async () => {
      if (currentConversationId) {
        try {
          const response = await fetch(`/api/conversations/${currentConversationId}?userId=${userId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
              const formattedMessages = data.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
              }));
              setAgentMessages(formattedMessages);
              console.log(`Loaded ${formattedMessages.length} messages for conversation ${currentConversationId}`);
            } else {
              // 新会话没有消息时，清空消息列表
              setAgentMessages([]);
              console.log(`No messages found for conversation ${currentConversationId}, clearing messages`);
            }
          } else {
            console.error(`Failed to load conversation: ${response.status}`);
            message.error("加载会话消息失败");
          }
        } catch (error) {
          console.error("Failed to load conversation messages:", error);
          message.error("加载会话消息时出错");
        }
      }
    };

    loadConversationMessages();
  }, [currentConversationId, userId, setAgentMessages]);

  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      updateConversation(currentConversationId, { messages });
    }
  }, [messages, currentConversationId, updateConversation]);

  const handleCreateConversation = async () => {
    try {
      // 先清空当前消息
      setAgentMessages([]);

      // 创建新会话（会自动切换到新会话）
      const newConv = await createConversation("新对话");
      console.log(`Created new conversation: ${newConv.id}`);

      // 新会话没有消息，保持空状态
    } catch (error) {
      console.error("Failed to create conversation:", error);
      message.error("创建会话失败");
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      await switchConversation(conversationId);
      // useEffect 会自动加载消息
    } catch (error) {
      console.error("Failed to switch conversation:", error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      if (currentConversationId === conversationId) {
        setAgentMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleUpdateConversationTitle = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title: newTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update conversation title");
      }

      const data = await response.json();
      console.log(`Updated conversation title: ${conversationId} -> ${newTitle}`);

      // 更新本地状态
      updateConversation(conversationId, { title: newTitle });

      message.success("标题更新成功");
    } catch (error) {
      console.error("Failed to update conversation title:", error);
      message.error("更新标题失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onCreateConversation={handleCreateConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpdateConversationTitle={handleUpdateConversationTitle}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <Layout
        style={{
          marginLeft: sidebarCollapsed ? 80 : 280,
          transition: "margin-left 0.2s",
        }}
      >
        <Navbar
          extra={
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 18,
                padding: 8,
              }}
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          }
        />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {messages.length === 0 ? (
              <Empty
                image={<MessageOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                description={
                  <span style={{ fontSize: 16, color: "#666" }}>
                    开始与 AI 助手对话吧
                  </span>
                }
                style={{ marginTop: "20vh" }}
              />
            ) : (
              <div>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            )}

            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
                <div style={{ 
                  background: "#f5f5f5", 
                  borderRadius: 12,
                  padding: "12px 16px",
                  borderBottomLeftRadius: 0,
                }}>
                  <Spin size="small" />
                </div>
              </div>
            )}

            {quickReplies && quickReplies.length > 0 && (
              <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
            )}
          </div>
        </Content>
        <BottomNav />
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </Layout>
    </Layout>
  );
}
