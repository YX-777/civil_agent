"use client";

import { Progress, Typography, Space } from "antd";

const { Text } = Typography;

interface ModuleBarProps {
  name: string;
  accuracy: number;
  color: string;
}

export default function ModuleBar({ name, accuracy, color }: ModuleBarProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }}>
        <Text strong style={{ fontSize: 14 }}>
          {name}
        </Text>
        <Text strong style={{ fontSize: 14 }}>
          {accuracy}%
        </Text>
      </Space>
      <Progress
        percent={accuracy}
        strokeColor={color}
        showInfo={false}
        strokeWidth={12}
        style={{ marginBottom: 0 }}
      />
    </div>
  );
}