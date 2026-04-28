"use client";

import { Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageOutlined, ClockCircleOutlined, DashboardOutlined, CheckSquareOutlined, CalendarOutlined, UserOutlined } from "@ant-design/icons";

const { Header } = Layout;

const menuItems = [
  {
    key: "/",
    icon: <MessageOutlined />,
    label: <Link href="/">对话</Link>,
  },
  {
    key: "/focus",
    icon: <ClockCircleOutlined />,
    label: <Link href="/focus">专注模式</Link>,
  },
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">数据看板</Link>,
  },
  {
    key: "/tasks",
    icon: <CheckSquareOutlined />,
    label: <Link href="/tasks">任务管理</Link>,
  },
  {
    key: "/calendar",
    icon: <CalendarOutlined />,
    label: <Link href="/calendar">学习日历</Link>,
  },
  {
    key: "/profile",
    icon: <UserOutlined />,
    label: <Link href="/profile">个人中心</Link>,
  },
];

interface NavbarProps {
  extra?: React.ReactNode;
}

export default function Navbar({ extra }: NavbarProps) {
  const pathname = usePathname();

  return (
    <Header 
      className="glass-nav"
      style={{ 
        display: "flex", 
        alignItems: "center", 
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 4px 20px rgba(13, 148, 136, 0.08)",
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        flex: 1,
        marginRight: 24,
      }}>
        <Link 
          href="/" 
          className="hover-lift"
          style={{ 
            fontSize: "22px", 
            fontWeight: 700, 
            color: "#0D9488",
            textDecoration: "none",
            letterSpacing: "-0.5px",
            transition: "color 0.2s ease",
          }}
        >
          考公 Agent
        </Link>
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[pathname]}
        items={menuItems}
        style={{ 
          flex: 1, 
          minWidth: 0, 
          border: "none",
          background: "transparent",
        }}
      />
      {extra && (
        <div style={{ marginLeft: 16 }}>
          {extra}
        </div>
      )}
    </Header>
  );
}