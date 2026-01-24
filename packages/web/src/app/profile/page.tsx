"use client";

import { useState } from "react";
import { Layout, Card, Button, Form, Input, InputNumber, DatePicker, Row, Col, Statistic, Typography, Space, Divider, List } from "antd";
import { UserOutlined, ClockCircleOutlined, TrophyOutlined, LineChartOutlined, FireOutlined, BellOutlined, SettingOutlined, DownloadOutlined, QuestionCircleOutlined, RightOutlined, EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Content } = Layout;

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    nickname: "小明",
    targetScore: 75,
    examDate: "2025-04-25",
    totalStudyDays: 45,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setProfile(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({ ...profile });
    setIsEditing(false);
  };

  const getDaysUntilExam = () => {
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

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
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
                    value={dayjs(editForm.examDate)}
                    onChange={(date) => setEditForm({ ...editForm, examDate: date?.format("YYYY-MM-DD") || "" })}
                    size="large"
                    style={{ width: "100%" }}
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>
                    {new Date(profile.examDate).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
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
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#3b82f6", marginBottom: 4 }}>120</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>总学习时长(小时)</Text>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#6366f1", marginBottom: 4 }}>45</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>总学习天数</Text>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#10b981", marginBottom: 4 }}>78%</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>平均正确率</Text>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: "#f59e0b", marginBottom: 4 }}>7</div>
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