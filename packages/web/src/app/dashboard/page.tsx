"use client";

import { useState } from "react";
import { Layout, Card, Button, Progress, Row, Col, Alert, Radio, Spin, Result } from "antd";
import { ClockCircleOutlined, LineChartOutlined, FireOutlined, BulbOutlined } from "@ant-design/icons";
import { useStats } from "@/hooks/use-stats";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";
import StatCard from "@/components/dashboard/StatCard";
import AccuracyChart from "@/components/dashboard/AccuracyChart";
import ModuleBar from "@/components/dashboard/ModuleBar";

const { Content } = Layout;

const modules = [
  { name: "资料分析", accuracy: 85, color: "#3b82f6" },
  { name: "数量关系", accuracy: 72, color: "#8b5cf6" },
  { name: "判断推理", accuracy: 78, color: "#10b981" },
  { name: "言语理解", accuracy: 82, color: "#f59e0b" },
  { name: "常识判断", accuracy: 68, color: "#ef4444" },
];

const accuracyData = [
  { date: "周一", accuracy: 75 },
  { date: "周二", accuracy: 78 },
  { date: "周三", accuracy: 72 },
  { date: "周四", accuracy: 80 },
  { date: "周五", accuracy: 82 },
  { date: "周六", accuracy: 85 },
  { date: "周日", accuracy: 78 },
];

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  const { stats, isLoading, error } = useStats(timeRange);

  if (isLoading) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Navbar />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
              <Spin size="large" />
            </div>
          </div>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Navbar />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Result
              status="error"
              title="加载失败"
              subTitle={error}
            />
          </div>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Navbar />
      <Content style={{ padding: "16px", paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>数据看板</h1>
            <Radio.Group
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="week">最近一周</Radio.Button>
              <Radio.Button value="month">最近一月</Radio.Button>
              <Radio.Button value="all">全部</Radio.Button>
            </Radio.Group>
          </div>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={8}>
              <StatCard
                title="学习时长"
                value={`${stats?.totalHours || 0}小时`}
                subtitle={timeRange === "week" ? "本周累计" : timeRange === "month" ? "本月累计" : "全部累计"}
                icon={<ClockCircleOutlined style={{ fontSize: 24 }} />}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <StatCard
                title="平均正确率"
                value={`${((stats?.avgAccuracy || 0) * 100).toFixed(1)}%`}
                subtitle="所有题目"
                icon={<LineChartOutlined style={{ fontSize: 24 }} />}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <StatCard
                title="连续天数"
                value={`${stats?.consecutiveDays || 0}天`}
                subtitle="保持学习节奏"
                icon={<FireOutlined style={{ fontSize: 24 }} />}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <AccuracyChart data={accuracyData} />
            </Col>
            <Col xs={24} lg={12}>
              <Card style={{ borderRadius: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>模块分析</h3>
                {modules.map((module) => (
                  <ModuleBar
                    key={module.name}
                    name={module.name}
                    accuracy={module.accuracy}
                    color={module.color}
                  />
                ))}
              </Card>
            </Col>
          </Row>

          <Card style={{ borderRadius: 12, marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>备考进度</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>总体进度</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{stats?.progressPercentage || 0}%</span>
              </div>
              <Progress
                percent={stats?.progressPercentage || 0}
                strokeColor="#3b82f6"
                strokeWidth={16}
              />
            </div>
            <Row gutter={16} style={{ marginTop: 24 }}>
              <Col span={12}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#3b82f6", marginBottom: 4 }}>45</div>
                  <div style={{ fontSize: 14, color: "#666" }}>已学习天数</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#6366f1", marginBottom: 4 }}>90</div>
                  <div style={{ fontSize: 14, color: "#666" }}>剩余天数</div>
                </Card>
              </Col>
            </Row>
          </Card>

          <Alert
            message="AI 建议"
            description="你的常识判断模块正确率较低（68%），建议增加该模块的练习时间。同时，资料分析模块表现优秀，可以适当减少练习频率。"
            type="warning"
            showIcon
            icon={<BulbOutlined />}
            style={{ borderRadius: 8 }}
          />
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}