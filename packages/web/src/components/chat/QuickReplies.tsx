"use client";

import { Button, Space } from "antd";
import { QuickReply } from "@/types";

interface QuickRepliesProps {
  options: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export default function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <Space wrap size={8}>
        {options.map((option) => (
          <Button
            key={option.id}
            onClick={() => onSelect(option)}
            size="small"
            style={{
              borderRadius: 6,
              background: "#f5f5f5",
              border: "1px solid #e5e7eb",
              color: "#374151",
            }}
          >
            {option.text}
          </Button>
        ))}
      </Space>
    </div>
  );
}