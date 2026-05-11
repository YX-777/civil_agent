"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Layout, message, Alert } from "antd";
import { MessageOutlined } from "@ant-design/icons";
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

  // ========== 滚动逻辑 ==========
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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

  const handleSendMessage = useCallback(async (text: string) => {
    scrollToBottom();
    await sendMessage(text);
  }, [sendMessage, scrollToBottom]);

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
          setAgentMessages(data.messages.map((m: any) => {
            // 恢复持久化的 sources / steps（保存在 Message.metadata JSON 字段）
            let sources, steps;
            if (m.metadata) {
              try {
                const meta = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata;
                sources = meta?.sources;
                steps = meta?.steps;
              } catch (e) { /* 容忍 metadata 格式异常 */ }
            }
            return {
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              ...(sources ? { sources } : {}),
              ...(steps ? { steps } : {}),
            };
          }));
        }
        // 注意：当 data.messages 为空时不调 setAgentMessages([])，
        // 让 useAgent 内部的欢迎语 useEffect 自己生成欢迎语，
        // 否则会把刚显示的欢迎语清空。
      })
      .catch(() => message.error("加载会话失败"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

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
        isLoading={isLoadingConversations}
        isAgentLoading={isLoading}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <Layout style={{ marginLeft: sidebarCollapsed ? 0 : 260, transition: "margin-left 0.2s", background: "#fff" }}>
        {/* 恢复 Navbar */}
        <Navbar />

        {/* 对话区域 - 纯白背景，响应式宽度 */}
        <Content style={{ background: "#fff" }}>
          <div
            ref={scrollContainerRef}
            className="chat-container"
            style={{
              width: "100%",
              maxWidth: 800,
              minWidth: 320,
              margin: "0 auto",
              padding: "24px 24px 120px",
              minHeight: "calc(100vh - 64px)",
              overflowY: "auto",
            }}
          >
            {messages.length === 0 ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "50vh",
              }}>
                <MessageOutlined style={{ fontSize: 48, color: "#d1d5db", marginBottom: 16 }} />
                <span style={{ fontSize: 16, color: "#9ca3af" }}>开始对话</span>
              </div>
            ) : (
              <div>
                {messages.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isStreaming={isLoading && m.role === "assistant" && i === messages.length - 1 && !m.content}
                  />
                ))}
                {/* 快捷回复紧跟最后一条消息，避免与答案之间留大块空白 */}
                {quickReplies?.length > 0 && (
                  <div style={{ paddingLeft: 52 }}>
                    <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
                  </div>
                )}
                {/* 滚动锚点 + 底部最小留白（不再 100px 大空白） */}
                <div ref={messagesEndRef} style={{ height: 8 }} />
              </div>
            )}

            {error && <Alert message="发送失败" description={error} type="error" closable onClose={clearError} style={{ marginTop: 16 }} />}
          </div>
        </Content>

        {/* 发送框 - 底部全宽，响应式 */}
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
          <div style={{
            width: "100%",
            maxWidth: 800,
            minWidth: 320,
            margin: "0 auto",
            padding: "16px 24px",
          }}>
            <ChatInput onSend={handleSendMessage} onStop={stop} disabled={isLoading} isStreaming={isLoading} />
          </div>
        </div>

        <BottomNav />
      </Layout>
    </Layout>
  );
}