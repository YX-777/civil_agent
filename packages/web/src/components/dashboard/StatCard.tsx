"use client";

import { Card, Statistic, Typography } from "antd";

const { Text } = Typography;

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 14 }}>{title}</Text>
        {icon && <div style={{ fontSize: 24 }}>{icon}</div>}
      </div>
      <Statistic
        value={value}
        valueStyle={{ 
          fontSize: 32, 
          fontWeight: "bold",
          color: "#000",
        }}
      />
      {subtitle && (
        <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 4 }}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
}