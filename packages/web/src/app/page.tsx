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
  // 新策略：用户发完消息后，把"最新一条用户消息"滚到视口顶部（block:start），
  // 这样用户消息完整可见 + 下方留出整屏空间给 assistant 流式渲染（buffer 充足）。
  // 旧策略（messagesEndRef block:end）问题：固定底部输入栏 ~100px 会遮住用户消息底边。
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledUserMsgIdRef = useRef<string | null>(null);

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
    await sendMessage(text);
  }, [sendMessage]);

  // 监听 messages：新 user 消息出现时，把它滚到视口顶部（Navbar 下方 72px 处）
  //
  // 关键设计：
  //  1. **从尾巴往前找最近的 user 消息**，不能只看 messages[last]
  //     —— use-agent.ts 里 setMessages(userMsg) 和 setMessages(assistantPlaceholder) 紧挨着，
  //        React 18 自动 batch 后 effect 只触发一次，last 已经是 assistant 占位 → 之前直接 early return
  //  2. 不用 scrollIntoView —— 它读 getBoundingClientRect 会被 framer-motion 的 transform 干扰。
  //     直接 window.scrollTo({ top, behavior:"smooth" }) 走文档级滚动。
  //  3. lastScrolledUserMsgIdRef 防重复：流式 chunk 会让 messages 数组变 → effect 重跑 →
  //     需要 ref dedupe，每条 user msg 只滚一次。
  //  4. rAF 双层 + 220ms 兜底：等 React commit DOM + 首帧 paint + 慢机器兜底。
  useEffect(() => {
    // 从尾巴往前找最近的 user 消息（不是数组最后一条，因为后面可能跟着 assistant 占位）
    let userMsg: typeof messages[number] | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { userMsg = messages[i]; break; }
    }
    if (!userMsg) return;
    if (lastScrolledUserMsgIdRef.current === userMsg.id) return;
    lastScrolledUserMsgIdRef.current = userMsg.id;

    const targetId = userMsg.id;
    const NAVBAR_OFFSET = 72;

    const tryScroll = () => {
      const el = document.querySelector(`[data-msg-id="${targetId}"]`) as HTMLElement | null;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const targetY = Math.max(0, rect.top + window.scrollY - NAVBAR_OFFSET);
      window.scrollTo({ top: targetY, behavior: "smooth" });
      return true;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!tryScroll()) setTimeout(tryScroll, 80);
      });
    });
    setTimeout(tryScroll, 220);
  }, [messages]);

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
          const mapped = data.messages.map((m: any) => {
            // 恢复持久化的 sources / steps / traceId / guardrail（保存在 Message.metadata JSON 字段）
            let sources, steps, traceId, guardrail;
            if (m.metadata) {
              try {
                const meta = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata;
                sources = meta?.sources;
                steps = meta?.steps;
                traceId = meta?.traceId;
                guardrail = meta?.guardrail;
              } catch (e) { /* 容忍 metadata 格式异常 */ }
            }
            return {
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
              ...(sources ? { sources } : {}),
              ...(steps ? { steps } : {}),
              ...(traceId ? { traceId } : {}),
              ...(guardrail ? { guardrail } : {}),
            };
          });
          // 关键：把历史里最近的 user 消息 id 写进 ref，标记为"已滚过"
          // → 后续 messages effect 触发时 dedupe 命中，跳过滚动
          // 这样切换/加载会话不会自动跳到最新一条，保留正常的"按顺序从上往下"阅读体验
          for (let i = mapped.length - 1; i >= 0; i--) {
            if (mapped[i].role === "user") {
              lastScrolledUserMsgIdRef.current = mapped[i].id;
              break;
            }
          }
          setAgentMessages(mapped);
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
              padding: "24px 24px 16px",
              minHeight: "calc(100vh - 64px)",
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
                    conversationId={currentConversationId || undefined}
                  />
                ))}
                {/* 快捷回复紧跟最后一条消息，避免与答案之间留大块空白 */}
                {quickReplies?.length > 0 && (
                  <div style={{ paddingLeft: 52 }}>
                    <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
                  </div>
                )}
                {/*
                  底部 sentinel 双高度：
                   - isLoading=true：撑 calc(100vh - 200px)，给"把新的 user 消息滚到顶部"留滚动距离
                   - isLoading=false：稳定 200px —— 这是兼顾"不丑"和"避开固定输入栏"的安全值：
                       * 固定输入栏实测 ~120-140px 高，200px 能让最后一条消息的复制按钮 /
                         参考来源 / 快捷回复 / GuardRail 徽章全部露出来
                       * 比之前 16px 大但又远小于一屏，视觉上不会有大块空白
                  0.25s ease 过渡：流式结束后 sentinel 收缩平滑，不抖动。
                */}
                <div
                  ref={messagesEndRef}
                  style={{
                    minHeight: isLoading ? "calc(100vh - 200px)" : 200,
                    transition: "min-height 0.25s ease",
                  }}
                  aria-hidden
                />
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