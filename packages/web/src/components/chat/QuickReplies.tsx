"use client";

import { Button, Space } from "antd";
import { QuickReply } from "@/types";

interface QuickRepliesProps {
  options: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export default function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div style={{ padding: "16px 0" }}>
      <Space wrap size={12}>
        {options.map((option) => (
          <Button
            key={option.id}
            onClick={() => onSelect(option)}
            size="small"
            className="hover-lift"
            style={{
              borderRadius: 12,
              height: 36,
              padding: "0 20px",
              background: "rgba(13, 148, 136, 0.1)",
              border: "1px solid rgba(13, 148, 136, 0.2)",
              color: "#0D9488",
              fontWeight: 500,
              transition: "all 0.2s ease",
            }}
          >
            {option.text}
          </Button>
        ))}
      </Space>
    </div>
  );
}