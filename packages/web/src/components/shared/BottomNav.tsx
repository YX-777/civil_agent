"use client";

import { Tabs } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageOutlined, ClockCircleOutlined, DashboardOutlined, CheckSquareOutlined, UserOutlined } from "@ant-design/icons";

const navItems = [
  { 
    key: "/", 
    label: "对话", 
    icon: <MessageOutlined />,
    href: "/" 
  },
  { 
    key: "/focus", 
    label: "专注", 
    icon: <ClockCircleOutlined />,
    href: "/focus" 
  },
  { 
    key: "/dashboard", 
    label: "看板", 
    icon: <DashboardOutlined />,
    href: "/dashboard" 
  },
  { 
    key: "/tasks", 
    label: "任务", 
    icon: <CheckSquareOutlined />,
    href: "/tasks" 
  },
  { 
    key: "/profile", 
    label: "我的", 
    icon: <UserOutlined />,
    href: "/profile" 
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div 
      className="glass-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "none",
      }}
    >
      <style jsx>{`
        @media (max-width: 768px) {
          div {
            display: block !important;
          }
        }
      `}</style>
      <Tabs
        activeKey={pathname}
        items={navItems.map((item) => ({
          key: item.key,
          label: (
            <Link href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                gap: 4,
                color: pathname === item.key ? "#0D9488" : "#134E4A",
              }}>
                <span style={{ 
                  fontSize: 20,
                  color: pathname === item.key ? "#0D9488" : "#14B8A6",
                }}>
                  {item.icon}
                </span>
                <span style={{ 
                  fontSize: 12,
                  fontWeight: pathname === item.key ? 600 : 400,
                  color: pathname === item.key ? "#0D9488" : "#134E4A",
                }}>
                  {item.label}
                </span>
              </div>
            </Link>
          ),
        }))}
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          borderTop: "1px solid rgba(13, 148, 136, 0.1)",
          boxShadow: "0 -4px 20px rgba(13, 148, 136, 0.08)",
        }}
        tabBarStyle={{
          marginBottom: 0,
          height: 60,
          display: "flex",
          alignItems: "center",
        }}
      />
    </div>
  );
}