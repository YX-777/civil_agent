"use client";

import { Button, Space } from "antd";
import { QuickReply } from "@/types";

interface QuickRepliesProps {
  options: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export default function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <Space wrap size={8}>
        {options.map((option) => (
          <Button
            key={option.id}
            onClick={() => onSelect(option)}
            size="small"
            style={{
              borderRadius: 16,
              height: 32,
              padding: "0 16px",
            }}
          >
            {option.text}
          </Button>
        ))}
      </Space>
    </div>
  );
}