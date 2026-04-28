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

  useEffect(() => {
    const initializeConversation = async () => {
      try {
        if (!hasBootstrapped || isLoadingConversations) {
          console.log("Waiting for conversations to load...");
          return;
        }

        if (hasInitializedConversationRef.current) {
          return;
        }
        hasInitializedConversationRef.current = true;

        if (currentConversationId) {
          console.log(`Already has current conversation: ${currentConversationId}`);
          return;
        }

        if (conversations.length > 0) {
          await switchConversation(conversations[0].id);
          console.log(`Auto-selected most recent conversation: ${conversations[0].title}`);
        } else {
          const created = await createConversation("新对话");
          console.log(`No existing conversations, auto-created conversation: ${created.id}`);
        }
      } catch (error) {
        console.error("Failed to initialize conversation:", error);
      }
    };

    initializeConversation();
  }, [hasBootstrapped, isLoadingConversations, currentConversationId, conversations, switchConversation, createConversation]);

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
      setAgentMessages([]);
      const newConv = await createConversation("新对话");
      console.log(`Created new conversation: ${newConv.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      message.error("创建会话失败");
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      await switchConversation(conversationId);
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

      updateConversation(conversationId, { title: newTitle });

      message.success("标题更新成功");
    } catch (error) {
      console.error("Failed to update conversation title:", error);
      message.error("更新标题失败");
    }
  };

  return (
    <Layout className="gradient-bg" style={{ minHeight: "100vh" }}>
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
          background: "transparent",
        }}
      >
        <Navbar
          extra={
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hover-lift"
              style={{
                border: "none",
                background: "rgba(13, 148, 136, 0.1)",
                cursor: "pointer",
                fontSize: 18,
                padding: 8,
                borderRadius: 10,
                color: "#0D9488",
                transition: "all 0.2s ease",
              }}
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          }
        />
        <Content style={{ padding: "24px", paddingBottom: 100 }}>
          <div 
            className="glass-card"
            style={{ 
              maxWidth: 800, 
              margin: "0 auto", 
              padding: "24px",
              minHeight: "calc(100vh - 200px)",
            }}
          >
            {messages.length === 0 ? (
              <Empty
                image={<MessageOutlined style={{ fontSize: 64, color: "#0D9488" }} />}
                description={
                  <span style={{ fontSize: 16, color: "#134E4A", fontWeight: 500 }}>
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
                <div 
                  className="glass-card"
                  style={{ 
                    padding: "12px 16px",
                    borderBottomLeftRadius: 4,
                  }}
                >
                  <Spin size="small" />
                </div>
              </div>
            )}

            {quickReplies && quickReplies.length > 0 && (
              <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
            )}
          </div>
        </Content>
        <div 
          className="glass-card"
          style={{ 
            position: "fixed", 
            bottom: 16, 
            left: sidebarCollapsed ? 96 : 296,
            right: 16,
            zIndex: 100,
            borderRadius: 16,
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(13, 148, 136, 0.15)",
          }}
        >
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
        <BottomNav />
      </Layout>
    </Layout>
  );
}