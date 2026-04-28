"use client";

import { Card, Avatar, Typography } from "antd";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";
import { Message } from "@/types";

const { Text } = Typography;

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: isUser ? "flex-end" : "flex-start", 
      marginBottom: 16,
    }}>
      <div style={{ 
        display: "flex", 
        flexDirection: isUser ? "row-reverse" : "row", 
        alignItems: "flex-start",
        gap: 12,
      }}>
        <Avatar 
          icon={isUser ? <UserOutlined /> : <RobotOutlined />} 
          className="hover-lift"
          style={{ 
            backgroundColor: isUser ? "#0D9488" : "#14B8A6",
            boxShadow: isUser 
              ? "0 4px 12px rgba(13, 148, 136, 0.25)" 
              : "0 4px 12px rgba(20, 184, 166, 0.25)",
          }}
        />
        <Card
          className={isUser ? "" : "glass-card hover-lift"}
          style={{
            maxWidth: "80%",
            borderRadius: 16,
            background: isUser 
              ? "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)"
              : "rgba(255, 255, 255, 0.85)",
            border: isUser ? "none" : "1px solid rgba(13, 148, 136, 0.1)",
            boxShadow: isUser 
              ? "0 8px 24px rgba(13, 148, 136, 0.2)" 
              : "0 4px 16px rgba(13, 148, 136, 0.08)",
          }}
          bodyStyle={{ padding: "14px 18px" }}
        >
          <Text 
            style={{ 
              color: isUser ? "#fff" : "#134E4A",
              fontSize: 14,
              lineHeight: 1.6,
              fontWeight: isUser ? 500 : 400,
            }}
          >
            {message.content}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text 
              style={{ 
                fontSize: 12,
                color: isUser ? "rgba(255, 255, 255, 0.8)" : "#0F766E",
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}