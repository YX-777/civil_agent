"use client";

import { Layout } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageOutlined, ClockCircleOutlined, DashboardOutlined, CheckSquareOutlined, CalendarOutlined, UserOutlined } from "@ant-design/icons";

const { Header } = Layout;

const navItems = [
  { key: "/", icon: <MessageOutlined />, label: "对话", href: "/" },
  { key: "/focus", icon: <ClockCircleOutlined />, label: "专注", href: "/focus" },
  { key: "/dashboard", icon: <DashboardOutlined />, label: "看板", href: "/dashboard" },
  { key: "/tasks", icon: <CheckSquareOutlined />, label: "任务", href: "/tasks" },
  { key: "/calendar", icon: <CalendarOutlined />, label: "日历", href: "/calendar" },
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

      {/* 导航链接 - 平铺 */}
      <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: pathname === item.key ? "#374151" : "#9ca3af",
              fontSize: 14,
              fontWeight: pathname === item.key ? 500 : 400,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            <span style={{ color: pathname === item.key ? "#a78bfa" : "#9ca3af" }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </Header>
  );
}