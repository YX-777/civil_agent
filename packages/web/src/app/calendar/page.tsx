"use client";

import { useState, useEffect } from "react";
import { Layout, Card, Button, Row, Col, Modal, Spin, Badge, Typography, Space, Statistic } from "antd";
import { LeftOutlined, RightOutlined, CloseOutlined, FireOutlined, ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { CalendarDay } from "@/types";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const { Title, Text } = Typography;
const { Content } = Layout;

export default function CalendarPage() {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    try {
      const response = await fetch(`/api/calendar?month=${currentMonth.getMonth()}`);
      const data = await response.json();
      setCalendarDays(data.days);
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek };
  };

  const { daysInMonth, startDayOfWeek } = getDaysInMonth(currentMonth);

  const getConsecutiveDays = () => {
    let consecutive = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      const dayData = calendarDays.find((day) => day.date === dateStr);

      if (dayData && dayData.completed && dayData.learningHours > 0) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  };

  const getTotalLearningHours = () => {
    return calendarDays.reduce((total, day) => total + day.learningHours, 0);
  };

  const getMonthName = () => {
    return currentMonth.toLocaleString("zh-CN", { month: "long", year: "numeric" });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day);
  };

  const closeDetail = () => {
    setSelectedDate(null);
  };

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
          <Title level={2} style={{ marginBottom: 24 }}>学习日历</Title>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="连续学习"
                  value={getConsecutiveDays()}
                  suffix="天"
                  valueStyle={{ color: "#3b82f6", fontSize: 32 }}
                  prefix={<FireOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="本月学习"
                  value={getTotalLearningHours()}
                  suffix="小时"
                  valueStyle={{ color: "#6366f1", fontSize: 32 }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="打卡天数"
                  value={calendarDays.filter((day) => day.completed).length}
                  suffix="天"
                  valueStyle={{ color: "#10b981", fontSize: 32 }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Button icon={<LeftOutlined />} onClick={goToPreviousMonth}>
                上个月
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                {getMonthName()}
              </Title>
              <Button icon={<RightOutlined />} onClick={goToNextMonth}>
                下个月
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 16 }}>
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div
                  key={day}
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#666",
                    padding: "8px 0",
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {Array.from({ length: startDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} style={{ aspectRatio: 1 }} />
              ))}

              {calendarDays.map((day, index) => {
                const dayNumber = index + 1;
                const isToday = new Date().toISOString().split("T")[0] === day.date;

                return (
                  <Button
                    key={day.date}
                    onClick={() => handleDayClick(day)}
                    type={day.completed ? "primary" : "default"}
                    style={{
                      aspectRatio: 1,
                      height: "auto",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      border: isToday ? "2px solid #3b82f6" : "1px solid #d9d9d9",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{dayNumber}</span>
                    {day.completed && day.learningHours > 0 && (
                      <span style={{ fontSize: 10 }}>{day.learningHours}h</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </Card>

          <Modal
            open={!!selectedDate}
            onCancel={closeDetail}
            title={
              selectedDate
                ? new Date(selectedDate.date).toLocaleDateString("zh-CN", {
                    month: "long",
                    day: "numeric",
                  })
                : ""
            }
            footer={null}
            width={400}
          >
            {selectedDate && (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card size="small" style={{ background: "#f5f5f5", border: "none" }}>
                  <Text type="secondary">学习时长</Text>
                  <div style={{ fontSize: 24, fontWeight: "bold", marginTop: 8 }}>
                    {selectedDate.learningHours}小时
                  </div>
                </Card>

                <Card size="small" style={{ background: "#f5f5f5", border: "none" }}>
                  <Text type="secondary">打卡状态</Text>
                  <div style={{ fontSize: 18, fontWeight: "bold", marginTop: 8 }}>
                    {selectedDate.completed ? "✅ 已打卡" : "❌ 未打卡"}
                  </div>
                </Card>

                {selectedDate.completed && (
                  <div style={{ 
                    background: "#f6ffed", 
                    border: "1px solid #b7eb8f",
                    borderRadius: 8,
                    padding: 16,
                    textAlign: "center"
                  }}>
                    <Text style={{ color: "#389e0d", fontSize: 16, fontWeight: 500 }}>
                      太棒了！继续保持！
                    </Text>
                  </div>
                )}

                {!selectedDate.completed && (
                  <div style={{ 
                    background: "#fffbe6", 
                    border: "1px solid #ffe58f",
                    borderRadius: 8,
                    padding: 16,
                    textAlign: "center"
                  }}>
                    <Text style={{ color: "#d46b08", fontSize: 16, fontWeight: 500 }}>
                      还没有打卡，记得学习哦！
                    </Text>
                  </div>
                )}
              </Space>
            )}
          </Modal>
        </div>
      </Content>
      <BottomNav />
    </Layout>
  );
}