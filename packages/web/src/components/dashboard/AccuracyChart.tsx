"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AccuracyChartProps {
  data: Array<{ date: string; accuracy: number }>;
}

export default function AccuracyChart({ data }: AccuracyChartProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
      <h3 className="text-lg font-semibold mb-4">正确率趋势</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="date" 
              className="text-gray-600 dark:text-gray-400 text-xs"
            />
            <YAxis 
              domain={[0, 100]}
              className="text-gray-600 dark:text-gray-400 text-xs"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "rgb(31 41 55)",
                border: "none",
                borderRadius: "8px",
                color: "white"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="accuracy" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}