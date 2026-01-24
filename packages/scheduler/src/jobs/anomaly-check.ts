/**
 * 异常检测任务
 */

import { logger } from "@civil-agent/core";
import { PushNotificationService } from "../notification/push-notification";

export interface AnomalyCheckData {
  userId: string;
  nickname: string;
  anomalies: Anomaly[];
}

export interface Anomaly {
  type: "no_learning" | "accuracy_drop" | "progress_lag" | "overdue_task";
  severity: "mild" | "moderate" | "severe";
  description: string;
  suggestion: string;
}

export async function anomalyCheckJob(
  data: AnomalyCheckData
): Promise<void> {
  logger.info(`Processing anomaly check for user ${data.userId}`);

  if (data.anomalies.length === 0) {
    logger.info(`No anomalies detected for user ${data.userId}`);
    return;
  }

  const pushService = new PushNotificationService();
  const message = generateAnomalyMessage(data);

  const quickReplies = [
    {
      id: "chat",
      text: "聊聊看",
      action: "start_chat",
    },
    {
      id: "ignore",
      text: "我没事",
      action: "ignore",
    },
  ];

  await pushService.send({
    userId: data.userId,
    title: "学习提醒",
    content: message,
    quickReplies,
  });

  logger.info(`Anomaly alert sent to user ${data.userId}`);
}

function generateAnomalyMessage(data: AnomalyCheckData): string {
  const severeAnomalies = data.anomalies.filter((a) => a.severity === "severe");
  const moderateAnomalies = data.anomalies.filter(
    (a) => a.severity === "moderate"
  );
  const mildAnomalies = data.anomalies.filter((a) => a.severity === "mild");

  let message = `你好，${data.nickname}。`;

  if (severeAnomalies.length > 0) {
    message += "\n\n⚠️ 发现以下严重问题：\n";
    severeAnomalies.forEach((anomaly) => {
      message += `• ${anomaly.description}\n`;
    });
  }

  if (moderateAnomalies.length > 0) {
    message += "\n\n📝 注意以下问题：\n";
    moderateAnomalies.forEach((anomaly) => {
      message += `• ${anomaly.description}\n`;
    });
  }

  if (mildAnomalies.length > 0) {
    message += "\n\n💡 温馨提示：\n";
    mildAnomalies.forEach((anomaly) => {
      message += `• ${anomaly.description}\n`;
    });
  }

  message += "\n\n我可以帮你：\n";
  message += "• 分析当前学习状况\n";
  message += "• 调整学习计划\n";
  message += "• 提供备考建议";

  return message;
}

export async function detectAnomalies(
  userId: string
): Promise<AnomalyCheckData> {
  const anomalies: Anomaly[] = [];

  const mockData = {
    userId,
    nickname: "小明",
    lastLearningDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    recentAccuracy: 0.72,
    previousAccuracy: 0.85,
    progressPercentage: 0.65,
    plannedProgress: 0.85,
    overdueTasks: 2,
  };

  if (mockData.lastLearningDate < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
    anomalies.push({
      type: "no_learning",
      severity: "severe",
      description: "已经3天没有学习了",
      suggestion: "建议重新开始学习，保持学习节奏",
    });
  }

  if (mockData.previousAccuracy - mockData.recentAccuracy > 0.1) {
    anomalies.push({
      type: "accuracy_drop",
      severity: "moderate",
      description: "最近一周正确率下降超过10%",
      suggestion: "建议复习基础知识点，巩固薄弱环节",
    });
  }

  if (mockData.plannedProgress - mockData.progressPercentage > 0.2) {
    anomalies.push({
      type: "progress_lag",
      severity: "moderate",
      description: "学习进度落后计划超过20%",
      suggestion: "建议调整学习计划，合理分配时间",
    });
  }

  if (mockData.overdueTasks > 0) {
    anomalies.push({
      type: "overdue_task",
      severity: "mild",
      description: `有${mockData.overdueTasks}个任务逾期未完成`,
      suggestion: "建议优先完成逾期任务",
    });
  }

  return {
    userId,
    nickname: mockData.nickname,
    anomalies,
  };
}

export async function getAllUsersAnomalies(): Promise<AnomalyCheckData[]> {
  const userIds = ["user-1", "user-2", "user-3"];

  const results = await Promise.all(
    userIds.map((userId) => detectAnomalies(userId))
  );

  return results.filter((result) => result.anomalies.length > 0);
}