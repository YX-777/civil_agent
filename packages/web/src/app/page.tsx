"use client";

import { Layout, Empty, Spin } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { useAgent } from "@/hooks/use-agent";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import QuickReplies from "@/components/chat/QuickReplies";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Content } = Layout;

export default function ChatPage() {
  const { messages, isLoading, quickReplies, sendMessage, handleQuickReply } =
    useAgent();

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Navbar />
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
  );
}