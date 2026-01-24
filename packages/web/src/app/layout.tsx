import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "考公 Agent - 智能学习助手",
  description: "基于 AI 的考公学习助手，提供对话、专注模式、数据看板等功能",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}