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
        gap: 8,
      }}>
        <Avatar 
          icon={isUser ? <UserOutlined /> : <RobotOutlined />} 
          style={{ 
            backgroundColor: isUser ? "#3b82f6" : "#10b981",
          }}
        />
        <Card
          style={{
            maxWidth: "80%",
            borderRadius: 12,
            backgroundColor: isUser ? "#3b82f6" : "#f5f5f5",
            border: "none",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          }}
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Text 
            style={{ 
              color: isUser ? "#fff" : "#000",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {message.content}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text 
              type={isUser ? "secondary" : "secondary"}
              style={{ 
                fontSize: 12, 
                opacity: isUser ? 0.8 : 0.6,
                color: isUser ? "#fff" : "#666",
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