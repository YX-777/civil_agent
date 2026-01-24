"use client";

import { Card, Typography } from "antd";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const { Title } = Typography;

interface AccuracyChartProps {
  data: Array<{ date: string; accuracy: number }>;
}

export default function AccuracyChart({ data }: AccuracyChartProps) {
  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 24 }}
    >
      <Title level={4} style={{ marginBottom: 16 }}>
        正确率趋势
      </Title>
      <div style={{ height: 256 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: 12, fill: "#666" }}
            />
            <YAxis 
              domain={[0, 100]}
              style={{ fontSize: 12, fill: "#666" }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Line 
              type="monotone" 
              dataKey="accuracy" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}