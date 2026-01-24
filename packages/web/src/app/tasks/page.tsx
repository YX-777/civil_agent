"use client";

import { useState, useEffect } from "react";
import { Layout, Card, Button, Checkbox, Progress, Row, Col, Spin, Empty, Badge, Typography, Space } from "antd";
import { CheckSquareOutlined, ClockCircleOutlined, CheckCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Task } from "@/types";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Title, Text } = Typography;
const { Content } = Layout;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "completed" ? "todo" : "completed",
              progress: task.status === "completed" ? 0 : 100,
            }
          : task
      )
    );
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "default";
      case "in_progress":
        return "processing";
      case "completed":
        return "success";
      case "overdue":
        return "error";
    }
  };

  const getStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "待开始";
      case "in_progress":
        return "进行中";
      case "completed":
        return "已完成";
      case "overdue":
        return "已逾期";
    }
  };

  const todayTasks = tasks.filter((task) => {
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  });

  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const completedTasks = tasks.filter((task) => task.status === "completed");

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

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Navbar />
      <Content style={{ padding: "16px", paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={2} style={{ marginBottom: 24 }}>任务管理</Title>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <div style={{ fontSize: 32, fontWeight: "bold", color: "#3b82f6", marginBottom: 8 }}>
                  {todayTasks.length}
                </div>
                <Text type="secondary">今日任务</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <div style={{ fontSize: 32, fontWeight: "bold", color: "#6366f1", marginBottom: 8 }}>
                  {inProgressTasks.length}
                </div>
                <Text type="secondary">进行中</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <div style={{ fontSize: 32, fontWeight: "bold", color: "#10b981", marginBottom: 8 }}>
                  {completedTasks.length}
                </div>
                <Text type="secondary">已完成</Text>
              </Card>
            </Col>
          </Row>

          <Card style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>今日任务</Title>
            {todayTasks.length === 0 ? (
              <Empty description="今天没有任务" />
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {todayTasks.map((task) => (
                  <Card key={task.id} size="small" style={{ background: "#f5f5f5", border: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Checkbox
                            checked={task.status === "completed"}
                            onChange={() => toggleTaskStatus(task.id)}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              textDecoration: task.status === "completed" ? "line-through" : "none",
                              color: task.status === "completed" ? "#999" : "#000",
                            }}
                          >
                            {task.title}
                          </Text>
                        </div>
                        <div style={{ marginLeft: 32, display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge status={getStatusColor(task.status)} text={getStatusLabel(task.status)} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            截止：{task.dueDate}
                          </Text>
                        </div>
                        {task.status === "in_progress" && (
                          <div style={{ marginLeft: 32, marginTop: 12 }}>
                            <Progress
                              percent={task.progress}
                              size="small"
                              strokeColor="#3b82f6"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>进行中任务</Title>
            {inProgressTasks.length === 0 ? (
              <Empty description="没有进行中的任务" />
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {inProgressTasks.map((task) => (
                  <Card key={task.id} size="small" style={{ background: "#f5f5f5", border: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text strong style={{ fontSize: 14 }}>{task.title}</Text>
                      <Badge status="processing" text="进行中" />
                    </div>
                    <Progress
                      percent={task.progress}
                      strokeColor="#3b82f6"
                      style={{ marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{task.progress}%</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>截止：{task.dueDate}</Text>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            block
            style={{ height: 48, fontSize: 16, fontWeight: "bold" }}
          >
            创建新任务
          </Button>
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}