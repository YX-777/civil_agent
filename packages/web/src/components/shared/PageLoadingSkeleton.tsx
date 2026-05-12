"use client";

import { Layout, Skeleton, Card } from "antd";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

const { Content } = Layout;

/**
 * 通用路由切换骨架屏 —— 用于各页面 loading.tsx
 * 关键点：先挂上 Navbar 让顶栏立即显示，避免整页空白
 * 内容区放几张占位 Card 让用户感知"页面正在加载"
 */
export default function PageLoadingSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Navbar />
      <Content style={{ background: "#fff" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "24px",
          }}
        >
          <Skeleton.Input active size="large" style={{ width: 240, marginBottom: 24 }} />
          {Array.from({ length: cards }).map((_, i) => (
            <Card key={i} style={{ marginBottom: 16, borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          ))}
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}
