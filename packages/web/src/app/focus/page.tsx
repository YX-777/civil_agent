"use client";

import { Layout, Card, Button, Progress, Typography, Row, Col, Space } from "antd";
import { ClockCircleOutlined, TrophyOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useFocus } from "@/hooks/use-focus";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Title, Text } = Typography;
const { Content } = Layout;

const modules = ["资料分析", "数量关系", "判断推理", "言语理解", "常识判断"];
const durations = [
  { hours: 1, label: "1小时" },
  { hours: 2, label: "2小时" },
  { hours: 3, label: "3小时" },
];

export default function FocusPage() {
  const { phase, session, timeRemaining, startSession, completeSession, resetSession, getEncouragement } =
    useFocus();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = session ? (1 - timeRemaining / (session.duration * 60)) * 100 : 0;

  if (phase === "setup") {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Navbar />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <Card style={{ borderRadius: 12 }}>
              <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
                专注模式
              </Title>

              <div style={{ marginBottom: 32 }}>
                <Title level={4} style={{ marginBottom: 16 }}>
                  选择学习时长
                </Title>
                <Row gutter={[16, 16]}>
                  {durations.map((duration) => (
                    <Col span={8} key={duration.hours}>
                      <Button
                        size="large"
                        block
                        style={{ height: 100, display: "flex", flexDirection: "column", justifyContent: "center" }}
                      >
                        <div style={{ fontSize: 32, fontWeight: "bold", marginBottom: 8 }}>
                          {duration.hours}
                        </div>
                        <div style={{ fontSize: 14 }}>小时</div>
                      </Button>
                    </Col>
                  ))}
                </Row>
              </div>

              <div style={{ marginBottom: 32 }}>
                <Title level={4} style={{ marginBottom: 16 }}>
                  选择学习模块
                </Title>
                <Row gutter={[12, 12]}>
                  {modules.map((module) => (
                    <Col xs={12} sm={8} md={8} key={module}>
                      <Button
                        size="large"
                        block
                        style={{ height: 60 }}
                      >
                        {module}
                      </Button>
                    </Col>
                  ))}
                </Row>
              </div>

              <Button
                type="primary"
                size="large"
                block
                onClick={() => startSession(2, "资料分析")}
                style={{ height: 48, fontSize: 16, fontWeight: "bold" }}
              >
                开始专注
              </Button>
            </Card>
          </div>
        </Content>
        <BottomNav />
      </Layout>
    );
  }

  if (phase === "active") {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Navbar />
        <Content style={{ padding: "16px", paddingBottom: 80 }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <Card style={{ borderRadius: 12, textAlign: "center" }}>
              <div style={{ 
                fontSize: 64, 
                fontWeight: "bold", 
                color: "#3b82f6", 
                fontFamily: "monospace",
                marginBottom: 24 
              }}>
                {formatTime(timeRemaining)}
              </div>

              <Progress
                percent={progress}
                strokeColor="#3b82f6"
                strokeWidth={16}
                style={{ marginBottom: 24 }}
              />

              <Title level={3} style={{ marginBottom: 24 }}>
                {getEncouragement()}
              </Title>

              <Text type="secondary" style={{ fontSize: 16, display: "block", marginBottom: 24 }}>
                正在学习：{session?.module}
              </Text>

              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={completeSession}
                style={{ height: 48, fontSize: 16, fontWeight: "bold" }}
              >
                完成专注
              </Button>
            </Card>
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
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Card style={{ borderRadius: 12, textAlign: "center" }}>
            <TrophyOutlined style={{ fontSize: 64, color: "#f59e0b", marginBottom: 24 }} />
            <Title level={2} style={{ marginBottom: 24 }}>
              恭喜！完成今日专注
            </Title>

            <Space direction="vertical" size={16} style={{ width: "100%", marginBottom: 32 }}>
              <Card size="small" style={{ background: "#f5f5f5", border: "none" }}>
                <Text type="secondary">学习时长</Text>
                <div style={{ fontSize: 24, fontWeight: "bold", marginTop: 8 }}>
                  {session?.duration}小时
                </div>
              </Card>

              <Card size="small" style={{ background: "#f5f5f5", border: "none" }}>
                <Text type="secondary">学习模块</Text>
                <div style={{ fontSize: 20, fontWeight: "bold", marginTop: 8 }}>
                  {session?.module}
                </div>
              </Card>
            </Space>

            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Button
                type="primary"
                size="large"
                block
                onClick={resetSession}
                style={{ height: 48, fontSize: 16, fontWeight: "bold" }}
              >
                再次专注
              </Button>
              <Button
                size="large"
                block
                style={{ height: 48, fontSize: 16, fontWeight: "bold" }}
              >
                返回首页
              </Button>
            </Space>
          </Card>
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}