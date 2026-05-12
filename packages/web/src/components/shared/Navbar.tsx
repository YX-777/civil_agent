"use client";

import { Layout } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageOutlined, BranchesOutlined, DashboardOutlined, CheckSquareOutlined, UserOutlined } from "@ant-design/icons";

const { Header } = Layout;

// Trace Viewer 入口：把面试演示用的 OTel 调用链查看器放到主导航
// pathname.startsWith 检测让 /dashboard/trace 子路由也命中高亮
const navItems = [
  { key: "/", icon: <MessageOutlined />, label: "对话", href: "/" },
  { key: "/dashboard/trace", icon: <BranchesOutlined />, label: "Trace", href: "/dashboard/trace" },
  { key: "/dashboard", icon: <DashboardOutlined />, label: "看板", href: "/dashboard", exact: true },
  { key: "/tasks", icon: <CheckSquareOutlined />, label: "任务", href: "/tasks" },
  { key: "/profile", icon: <UserOutlined />, label: "个人", href: "/profile" },
];

interface NavbarProps {
  extra?: React.ReactNode;
}

export default function Navbar({ extra }: NavbarProps) {
  const pathname = usePathname();

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        height: 56,
        gap: 24,
      }}
    >
      {/* extra 区域 */}
      {extra}

      {/* 导航链接 - 平铺
         /dashboard 用 exact 匹配（否则会被 /dashboard/trace 干扰），
         其他路由用 startsWith 让子路由也高亮 */}
      <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.key
            : pathname === item.key || pathname.startsWith(item.key + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: active ? "#374151" : "#9ca3af",
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              <span style={{ color: active ? "#a78bfa" : "#9ca3af" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </Header>
  );
}