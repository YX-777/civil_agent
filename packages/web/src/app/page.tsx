"use client";

import { useState, useEffect } from "react";
import { Layout, Empty, Spin } from "antd";
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
  } = useConversations(userId);

  const {
    messages,
    isLoading,
    quickReplies,
    sendMessage,
    handleQuickReply,
    setMessages: setAgentMessages,
  } = useAgent(currentConversationId || undefined, userId);

  useEffect(() => {
    if (currentConversationId) {
      const loadConversationMessages = async () => {
        const conv = conversations.find((c) => c.id === currentConversationId);
        if (conv && conv.messages.length > 0) {
          setAgentMessages(conv.messages);
        }
      };
      loadConversationMessages();
    }
  }, [currentConversationId, conversations, setAgentMessages]);

  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      updateConversation(currentConversationId, { messages });
    }
  }, [messages, currentConversationId, updateConversation]);

  const handleCreateConversation = async () => {
    try {
      const newConv = await createConversation("新对话");
      setAgentMessages([]);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      const conv = await switchConversation(conversationId);
      if (conv && conv.messages.length > 0) {
        setAgentMessages(conv.messages);
      } else {
        setAgentMessages([]);
      }
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

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onCreateConversation={handleCreateConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
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
