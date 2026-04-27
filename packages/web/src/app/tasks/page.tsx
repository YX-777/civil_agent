"use client";

import { useState, useEffect } from "react";
import { Layout, Card, Button, Checkbox, Progress, Row, Col, Spin, Empty, Badge, Typography, Space, message, Modal, Form, Input, Select, InputNumber, DatePicker, Segmented } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { Task } from "@/types";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Title, Text } = Typography;
const { Content } = Layout;
const DEFAULT_USER_ID = "default-user";
const MODULE_OPTIONS = ["言语理解", "数量关系", "判断推理", "资料分析", "常识判断", "申论"];
const DIFFICULTY_OPTIONS = [
  { label: "简单", value: "easy" },
  { label: "中等", value: "medium" },
  { label: "困难", value: "hard" },
];

interface CreateTaskFormValues {
  title: string;
  description?: string;
  module?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  dueDate?: { toDate?: () => Date; toISOString?: () => string } | null;
}

export default function TasksPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CreateTaskFormValues>();
  const [editForm] = Form.useForm<CreateTaskFormValues>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "agent">("all");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?userId=${DEFAULT_USER_ID}`);
      if (!response.ok) {
        throw new Error("任务列表加载失败");
      }
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      messageApi.error("任务列表加载失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    try {
      setCompletingTaskId(taskId);

      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          actualMinutes: 60,
          actualQuestionCount: 20,
          accuracy: 0.75,
          reflection: "页面联调测试：完成后应写入学习记录",
        }),
      });

      if (response.status === 409) {
        messageApi.info("这条任务已经完成，无需重复提交");
        await fetchTasks();
        return;
      }

      if (!response.ok) {
        throw new Error("任务完成失败");
      }

      messageApi.success("任务已完成，并写入学习记录");
      await fetchTasks();
    } catch (error) {
      console.error("Failed to complete task:", error);
      messageApi.error("任务完成失败，请稍后重试");
    } finally {
      setCompletingTaskId(null);
    }
  };

  const createTask = async (values: CreateTaskFormValues) => {
    try {
      setIsCreating(true);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          title: values.title.trim(),
          description: values.description?.trim() || "",
          module: values.module,
          difficulty: values.difficulty || "medium",
          estimatedMinutes: values.estimatedMinutes ?? 60,
          dueDate: values.dueDate?.toDate?.().toISOString() || values.dueDate?.toISOString?.() || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("任务创建失败");
      }

      messageApi.success("任务已创建");
      setIsCreateModalOpen(false);
      form.resetFields();
      await fetchTasks();
    } catch (error) {
      console.error("Failed to create task:", error);
      messageApi.error("任务创建失败，请稍后重试");
    } finally {
      setIsCreating(false);
    }
  };

  const updateTask = async (values: CreateTaskFormValues) => {
    if (!editingTask) return;

    try {
      setIsCreating(true);
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          title: values.title.trim(),
          description: values.description?.trim() || "",
          module: values.module,
          difficulty: values.difficulty || "medium",
          estimatedMinutes: values.estimatedMinutes ?? 60,
          dueDate: values.dueDate?.toDate?.().toISOString() || values.dueDate?.toISOString?.() || editingTask.dueDate,
        }),
      });

      if (!response.ok) {
        throw new Error("任务更新失败");
      }

      messageApi.success("任务已更新");
      setIsEditModalOpen(false);
      setEditingTask(null);
      editForm.resetFields();
      await fetchTasks();
    } catch (error) {
      console.error("Failed to update task:", error);
      messageApi.error("任务更新失败，请稍后重试");
    } finally {
      setIsCreating(false);
    }
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
  const filteredTasks = tasks.filter((task) => {
    const statusMatched = statusFilter === "all" ? true : task.status === statusFilter;
    const sourceMatched = sourceFilter === "all" ? true : task.source === sourceFilter;
    return statusMatched && sourceMatched;
  });

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    editForm.setFieldsValue({
      title: task.title,
      description: task.description ?? "",
      module: task.module ?? undefined,
      difficulty: task.difficulty ?? "medium",
      estimatedMinutes: task.estimatedMinutes ?? 60,
      dueDate: task.dueDate ? undefined : undefined,
    });
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        {contextHolder}
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
      {contextHolder}
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
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>按状态筛选</Text>
                <Segmented
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as "all" | Task["status"])}
                  options={[
                    { label: "全部", value: "all" },
                    { label: "待开始", value: "todo" },
                    { label: "进行中", value: "in_progress" },
                    { label: "已完成", value: "completed" },
                  ]}
                />
              </div>
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>按来源筛选</Text>
                <Segmented
                  value={sourceFilter}
                  onChange={(value) => setSourceFilter(value as "all" | "manual" | "agent")}
                  options={[
                    { label: "全部", value: "all" },
                    { label: "手动创建", value: "manual" },
                    { label: "Agent 创建", value: "agent" },
                  ]}
                />
              </div>
            </Space>
          </Card>

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
                            disabled={task.status === "completed" || completingTaskId === task.id}
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
                    <div style={{ marginTop: 12 }}>
                      <Button
                        size="small"
                        type="primary"
                        loading={completingTaskId === task.id}
                        onClick={() => toggleTaskStatus(task.id)}
                      >
                        标记为完成
                      </Button>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>全部任务</Title>
            {filteredTasks.length === 0 ? (
              <Empty description="没有符合筛选条件的任务" />
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {filteredTasks.map((task) => (
                  <Card key={task.id} size="small" style={{ background: "#f5f5f5", border: "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <Text strong>{task.title}</Text>
                          <Badge status={getStatusColor(task.status)} text={getStatusLabel(task.status)} />
                          <Badge
                            color={task.source === "agent" ? "#6366f1" : "#3b82f6"}
                            text={task.source === "agent" ? "Agent 创建" : "手动创建"}
                          />
                        </div>
                        {task.description && (
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">{task.description}</Text>
                          </div>
                        )}
                        <Space size={12} wrap>
                          {task.module ? <Text type="secondary">模块：{task.module}</Text> : null}
                          {task.difficulty ? <Text type="secondary">难度：{task.difficulty}</Text> : null}
                          <Text type="secondary">预计时长：{task.estimatedMinutes || 0} 分钟</Text>
                          <Text type="secondary">截止：{task.dueDate || "未设置"}</Text>
                        </Space>
                      </div>
                      <Space direction="vertical">
                        {task.status !== "completed" && (
                          <Button
                            type="primary"
                            loading={completingTaskId === task.id}
                            onClick={() => toggleTaskStatus(task.id)}
                          >
                            完成
                          </Button>
                        )}
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => openEditModal(task)}
                        >
                          编辑
                        </Button>
                      </Space>
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
            onClick={() => setIsCreateModalOpen(true)}
            style={{ height: 48, fontSize: 16, fontWeight: "bold" }}
          >
            创建新任务
          </Button>
        </div>
      </Content>
      <Modal
        title="创建新任务"
        open={isCreateModalOpen}
        confirmLoading={isCreating}
        onCancel={() => {
          if (!isCreating) {
            setIsCreateModalOpen(false);
          }
        }}
        onOk={() => form.submit()}
        okText="创建任务"
        cancelText="取消"
        destroyOnClose
      >
        <Form<CreateTaskFormValues>
          form={form}
          layout="vertical"
          onFinish={createTask}
          initialValues={{
            difficulty: "medium",
            estimatedMinutes: 60,
          }}
        >
          <Form.Item
            label="任务标题"
            name="title"
            rules={[{ required: true, message: "请输入任务标题" }]}
          >
            <Input placeholder="例如：数量关系专项练习 20 题" maxLength={60} />
          </Form.Item>

          <Form.Item label="任务描述" name="description">
            <Input.TextArea
              placeholder="补充任务目标、要求或复盘重点"
              rows={3}
              maxLength={200}
            />
          </Form.Item>

          <Form.Item label="模块" name="module">
            <Select
              allowClear
              placeholder="选择对应模块"
              options={MODULE_OPTIONS.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="难度" name="difficulty">
                <Select options={DIFFICULTY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预计时长（分钟）" name="estimatedMinutes">
                <InputNumber min={5} max={600} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="截止时间" name="dueDate">
            <DatePicker
              showTime
              style={{ width: "100%" }}
              placeholder="不填则默认当前时间"
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="编辑任务"
        open={isEditModalOpen}
        confirmLoading={isCreating}
        onCancel={() => {
          if (!isCreating) {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }
        }}
        onOk={() => editForm.submit()}
        okText="保存修改"
        cancelText="取消"
        destroyOnClose
      >
        <Form<CreateTaskFormValues>
          form={editForm}
          layout="vertical"
          onFinish={updateTask}
        >
          <Form.Item
            label="任务标题"
            name="title"
            rules={[{ required: true, message: "请输入任务标题" }]}
          >
            <Input placeholder="例如：数量关系专项练习 20 题" maxLength={60} />
          </Form.Item>
          <Form.Item label="任务描述" name="description">
            <Input.TextArea rows={3} maxLength={200} />
          </Form.Item>
          <Form.Item label="模块" name="module">
            <Select
              allowClear
              placeholder="选择对应模块"
              options={MODULE_OPTIONS.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="难度" name="difficulty">
                <Select options={DIFFICULTY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预计时长（分钟）" name="estimatedMinutes">
                <InputNumber min={5} max={600} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="截止时间" name="dueDate">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
      <BottomNav />
    </Layout>
  );
}
