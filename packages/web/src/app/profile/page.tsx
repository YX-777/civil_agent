"use client";

import { useEffect, useState } from "react";
import { Layout, Card, Button, Form, Input, InputNumber, DatePicker, Row, Col, Statistic, Typography, Space, List, Spin, message } from "antd";
import { UserOutlined, ClockCircleOutlined, TrophyOutlined, BellOutlined, SettingOutlined, DownloadOutlined, QuestionCircleOutlined, RightOutlined, EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";
import dayjs from "dayjs";
import { Stats, UserProfile } from "@/types";

const { Title, Text } = Typography;
const { Content } = Layout;
const DEFAULT_USER_ID = "default-user";

export default function ProfilePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [profile, setProfile] = useState<UserProfile>({
    nickname: "考生",
    targetScore: 75,
    examDate: null,
    totalStudyDays: 0,
  });
  const [summary, setSummary] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });

  useEffect(() => {
    void fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/profile?userId=${DEFAULT_USER_ID}`);
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setProfile(data.profile);
      setEditForm(data.profile);
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      messageApi.error("个人资料加载失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          nickname: editForm.nickname,
          targetScore: editForm.targetScore,
          examDate: editForm.examDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setEditForm(data.profile);
      setSummary(data.summary);
      setIsEditing(false);
      messageApi.success("个人资料已更新");
    } catch (error) {
      console.error("Failed to update profile:", error);
      messageApi.error("个人资料更新失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({ ...profile });
    setIsEditing(false);
  };

  const getDaysUntilExam = () => {
    if (!profile.examDate) return 0;
    const examDate = new Date(profile.examDate);
    const today = new Date();
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const settings = [
    { icon: <BellOutlined />, title: "通知设置", description: "管理学习提醒和通知" },
    { icon: <SettingOutlined />, title: "主题设置", description: "切换深色/浅色主题" },
    { icon: <DownloadOutlined />, title: "数据导出", description: "导出学习数据" },
    { icon: <QuestionCircleOutlined />, title: "帮助与反馈", description: "获取帮助或提交反馈" },
  ];

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
          <Title level={2} style={{ marginBottom: 24 }}>个人中心</Title>

          <Card
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              marginBottom: 24,
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 32 }}
          >
            <Space size={24} align="center">
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
              }}>
                <UserOutlined />
              </div>
              <div>
                <Title level={3} style={{ color: "#fff", marginBottom: 4 }}>
                  {profile.nickname}
                </Title>
                <Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                  考公备考中
                </Text>
              </div>
            </Space>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="距离考试"
                  value={getDaysUntilExam()}
                  suffix="天"
                  valueStyle={{ color: "#3b82f6", fontSize: 32 }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card>
                <Statistic
                  title="目标分数"
                  value={profile.targetScore}
                  valueStyle={{ color: "#6366f1", fontSize: 32 }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <Title level={3} style={{ margin: 0 }}>个人档案</Title>
              {!isEditing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                >
                  编辑
                </Button>
              ) : (
                <Space>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={handleCancel}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </Space>
              )}
            </div>

            <Form layout="vertical">
              <Form.Item label="昵称">
                {isEditing ? (
                  <Input
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                    size="large"
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>{profile.nickname}</Text>
                )}
              </Form.Item>

              <Form.Item label="目标分数">
                {isEditing ? (
                  <InputNumber
                    value={editForm.targetScore}
                    onChange={(value) => setEditForm({ ...editForm, targetScore: value || 0 })}
                    size="large"
                    style={{ width: "100%" }}
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>{profile.targetScore}分</Text>
                )}
              </Form.Item>

              <Form.Item label="考试日期">
                {isEditing ? (
                  <DatePicker
                    value={editForm.examDate ? dayjs(editForm.examDate) : null}
                    onChange={(date) => setEditForm({ ...editForm, examDate: date?.format("YYYY-MM-DD") || null })}
                    size="large"
                    style={{ width: "100%" }}
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>
                    {profile.examDate
                      ? new Date(profile.examDate).toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "未设置"}
                  </Text>
                )}
              </Form.Item>

              <Form.Item label="已学习天数">
                <Text style={{ fontSize: 16 }}>{profile.totalStudyDays}天</Text>
              </Form.Item>
            </Form>
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 24 }}>学习数据总览</Title>
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#3b82f6", marginBottom: 4 }}>
                    {summary?.totalHours || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>总学习时长(小时)</Text>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#6366f1", marginBottom: 4 }}>
                    {profile.totalStudyDays}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>总学习天数</Text>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981", marginBottom: 4 }}>
                    {`${(((summary?.avgAccuracy || 0) * 100)).toFixed(1)}%`}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>平均正确率</Text>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#f59e0b", marginBottom: 4 }}>
                    {summary?.consecutiveDays || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>连续天数</Text>
                </Card>
              </Col>
            </Row>
          </Card>

          <Card>
            <Title level={3} style={{ marginBottom: 24 }}>设置</Title>
            <List
              dataSource={settings}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: "pointer", padding: "16px 0" }}
                  extra={<RightOutlined style={{ color: "#999" }} />}
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 24, color: "#3b82f6" }}>{item.icon}</div>}
                    title={<Text strong style={{ fontSize: 16 }}>{item.title}</Text>}
                    description={<Text type="secondary">{item.description}</Text>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}
