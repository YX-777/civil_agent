"use client";

import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { antdTheme } from "@/config/theme";
import "../styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          theme={antdTheme}
          locale={zhCN}
        >
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </body>
    </html>
  );
}