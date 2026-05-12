"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Layout } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageOutlined, BranchesOutlined, DashboardOutlined, CheckSquareOutlined, UserOutlined, LoadingOutlined } from "@ant-design/icons";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 点击后立即知道"用户想去哪里"，给那个 nav item 显示 spinner，
  // pathname 切到目标后清空。这样切换有"立刻响应"的感觉。
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const lastPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      setTargetHref(null);
    }
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href === pathname) return;
    e.preventDefault();
    setTargetHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const showProgressBar = isPending || targetHref !== null;

  return (
    <>
      {/* 顶部进度条：导航过渡时显示，提供视觉反馈 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 1000,
          background: "transparent",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)",
            transformOrigin: "left",
            transform: showProgressBar ? "scaleX(0.85)" : "scaleX(0)",
            transition: showProgressBar
              ? "transform 6s cubic-bezier(0.1, 0.5, 0.2, 1)"
              : "transform 0.2s ease-out",
            opacity: showProgressBar ? 1 : 0,
          }}
        />
      </div>

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
            const isLoading = targetHref === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                onClick={(e) => handleNavClick(e, item.href)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: active ? "#374151" : "#9ca3af",
                  fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  textDecoration: "none",
                  transition: "color 0.2s, opacity 0.2s",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <span style={{ color: active ? "#a78bfa" : "#9ca3af", display: "inline-flex" }}>
                  {isLoading ? <LoadingOutlined /> : item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Header>
    </>
  );
}
