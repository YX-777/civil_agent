"use client";

import { useState } from "react";
import { Input, Button, Space } from "antd";
import { SendOutlined } from "@ant-design/icons";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ 
      display: "flex",
      gap: 12,
      alignItems: "center",
    }}>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="输入消息..."
        disabled={disabled}
        size="large"
        style={{ 
          flex: 1,
          borderRadius: 12,
          background: "rgba(255, 255, 255, 0.9)",
          border: "1px solid rgba(13, 148, 136, 0.15)",
        }}
        allowClear
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        size="large"
        className="hover-lift"
        style={{
          borderRadius: 12,
          background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)",
          border: "none",
          boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)",
          minWidth: 80,
        }}
      >
        发送
      </Button>
    </div>
  );
}