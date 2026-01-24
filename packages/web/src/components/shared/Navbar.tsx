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

export default function Navbar() {
  const pathname = usePathname();

  return (
    <Header style={{ 
      display: "flex", 
      alignItems: "center", 
      padding: "0 24px",
      background: "#fff",
      borderBottom: "1px solid #f0f0f0",
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        flex: 1,
        marginRight: 24,
      }}>
        <Link 
          href="/" 
          style={{ 
            fontSize: "20px", 
            fontWeight: "bold", 
            color: "#3b82f6",
            textDecoration: "none",
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
        }}
      />
    </Header>
  );
}