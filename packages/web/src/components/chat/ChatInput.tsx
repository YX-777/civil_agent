"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Tooltip } from "antd";
import { SendOutlined, StopOutlined } from "@ant-design/icons";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export default function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        disabled={disabled && !isStreaming}
        rows={1}
        style={{
          flex: 1,
          minHeight: 40,
          maxHeight: 150,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontSize: 15,
          lineHeight: 1.5,
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          color: "#374151",
        }}
      />

      {isStreaming ? (
        <Tooltip title="停止">
          <Button icon={<StopOutlined />} onClick={onStop} style={{ height: 40, borderRadius: 10, background: "#f5f5f5", border: "1px solid #e5e7eb", color: "#6b7280" }}>
            停止
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="发送">
          <Button
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            style={{
              height: 40,
              borderRadius: 10,
              background: "#a78bfa",
              border: "none",
              color: "#fff",
            }}
          >
            发送
          </Button>
        </Tooltip>
      )}
    </div>
  );
}