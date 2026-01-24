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
      padding: "16px", 
      background: "#fff", 
      borderTop: "1px solid #f0f0f0",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Space.Compact style={{ width: "100%", display: "flex" }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            disabled={disabled}
            size="large"
            style={{ flex: 1 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            size="large"
          >
            发送
          </Button>
        </Space.Compact>
      </div>
    </div>
  );
}