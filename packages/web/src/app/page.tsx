"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Layout, Empty, message, Alert, Tooltip } from "antd";
import { MessageOutlined, DownOutlined } from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
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

  // ========== 智能滚动逻辑 ==========
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setUserScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const scrollToBottomImmediate = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "instant" });
    setUserScrolledUp(false);
  }, []);

  const scrollToBottomSmooth = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
    try { await loadConversations(conversationId); } catch (e) { console.error(e); }
  }, [loadConversations]);

  const {
    messages,
    isLoading,
    error,
    quickReplies,
    sendMessage,
    handleQuickReply,
    setMessages: setAgentMessages,
    stop,
    clearError,
  } = useAgent(currentConversationId || undefined, userId, handleAgentTurnDone);

  const hasInitializedConversationRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (!hasBootstrapped || isLoadingConversations || hasInitializedConversationRef.current) return;
      hasInitializedConversationRef.current = true;
      if (currentConversationId) return;
      if (conversations.length > 0) await switchConversation(conversations[0].id);
      else await createConversation("新对话");
    };
    init();
  }, [hasBootstrapped, isLoadingConversations, currentConversationId, conversations, switchConversation, createConversation]);

  useEffect(() => {
    if (!currentConversationId) return;
    fetch(`/api/conversations/${currentConversationId}?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages?.length) {
          setAgentMessages(data.messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content, timestamp: new Date(m.timestamp) })));
        } else setAgentMessages([]);
      })
      .catch(() => message.error("加载会话失败"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  useEffect(() => {
    if (isLoading && !userScrolledUp) scrollToBottomSmooth();
  }, [isLoading, messages, userScrolledUp, scrollToBottomSmooth]);

  useEffect(() => {
    if (!userScrolledUp) scrollToBottomSmooth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleSendMessage = useCallback(async (text: string) => {
    scrollToBottomImmediate();
    await sendMessage(text);
  }, [sendMessage, scrollToBottomImmediate]);

  const handleCreateConversation = async () => {
    try { setAgentMessages([]); await createConversation("新对话"); }
    catch { message.error("创建失败"); }
  };

  const handleSelectConversation = async (id: string) => {
    try { await switchConversation(id); } catch { message.error("切换失败"); }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      if (currentConversationId === id) setAgentMessages([]);
    } catch { message.error("删除失败"); }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, title }) });
      updateConversation(id, { title });
      message.success("更新成功");
    } catch { message.error("更新失败"); }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <ChatSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onCreateConversation={handleCreateConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpdateConversationTitle={handleUpdateTitle}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <Layout style={{ marginLeft: sidebarCollapsed ? 0 : 260, transition: "margin-left 0.2s", background: "#fff" }}>
        {/* 恢复 Navbar */}
        <Navbar />

        {/* 对话区域 - 纯白背景 */}
        <Content style={{ background: "#fff" }}>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="chat-container"
            style={{
              maxWidth: 800,
              margin: "0 auto",
              padding: "24px 24px 120px",
              minHeight: "calc(100vh - 64px)",
              overflowY: "auto",
            }}
          >
            {messages.length === 0 ? (
              <Empty
                image={<MessageOutlined style={{ fontSize: 48, color: "#d1d5db" }} />}
                description={<span style={{ fontSize: 16, color: "#9ca3af" }}>开始对话</span>}
                style={{ marginTop: "30vh" }}
              />
            ) : (
              <div>
                {messages.map((m, i) => (
                  <MessageBubble key={m.id} message={m} isStreaming={isLoading && m.role === "assistant" && i === messages.length - 1 && !m.content} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {error && <Alert message="发送失败" description={error} type="error" closable onClose={clearError} style={{ marginTop: 16 }} />}
            {quickReplies?.length > 0 && <QuickReplies options={quickReplies} onSelect={handleQuickReply} />}
          </div>
        </Content>

        {/* 发送框 - 底部全宽 */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: sidebarCollapsed ? 0 : 260,
            right: 0,
            zIndex: 100,
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 24px" }}>
            <ChatInput onSend={handleSendMessage} onStop={stop} disabled={isLoading} isStreaming={isLoading} />
          </div>
        </div>

        {/* 滚动到底部按钮 */}
        <AnimatePresence>
          {userScrolledUp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={scrollToBottomImmediate}
              style={{ position: "fixed", bottom: 100, right: 40, zIndex: 50, cursor: "pointer" }}
            >
              <Tooltip title="回到底部">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
                  <DownOutlined />
                </div>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        <BottomNav />
      </Layout>
    </Layout>
  );
}