/**
 * 晚间复盘任务
 */

import { logger } from "@civil-agent/core";
import { PushNotificationService } from "../notification/push-notification";

export interface EveningReviewData {
  userId: string;
  nickname: string;
  todayStats: {
    learningHours: number;
    questionsCompleted: number;
    accuracy: number;
    completedTasks: number;
  };
  achievements: string[];
  tomorrowPlan: string;
}

export async function eveningReviewJob(
  data: EveningReviewData
): Promise<void> {
  logger.info(`Processing evening review for user ${data.userId}`);

  const pushService = new PushNotificationService();

  const report = generateReport(data);
  const achievements = generateAchievements(data);
  const tomorrowPreview = generateTomorrowPreview(data);

  const content = `${report}\n\n${achievements}\n\n${tomorrowPreview}`;

  const quickReplies = [
    {
      id: "record-reflection",
      text: "记录今天的学习心得",
      action: "record_note",
    },
    {
      id: "view-weekly",
      text: "查看本周数据",
      action: "view_weekly",
    },
    {
      id: "rest",
      text: "准备休息",
      action: "end_conversation",
    },
  ];

  await pushService.send({
    userId: data.userId,
    title: "晚安！今天的学习总结",
    content,
    quickReplies,
  });

  logger.info(`Evening review sent to user ${data.userId}`);
}

function generateReport(data: EveningReviewData): string {
  const stats = data.todayStats;

  return `📊 今日学习数据

学习时长: ${stats.learningHours} 小时
完成题目: ${stats.questionsCompleted} 题
平均正确率: ${(stats.accuracy * 100).toFixed(1)}%
完成任务: ${stats.completedTasks} 个`;
}

function generateAchievements(data: EveningReviewData): string {
  if (data.achievements.length === 0) {
    return "🏆 今日成就\n暂无成就，继续加油！";
  }

  const achievementsText = data.achievements
    .map((achievement) => `• ${achievement}`)
    .join("\n");

  return `🏆 今日成就\n${achievementsText}`;
}

function generateTomorrowPreview(data: EveningReviewData): string {
  return `📅 明日预告

${data.tomorrowPlan}

好好休息，明天继续加油！💪`;
}

export async function getTodayStats(
  userId: string
): Promise<EveningReviewData> {
  const mockData: EveningReviewData = {
    userId,
    nickname: "小明",
    todayStats: {
      learningHours: 3.5,
      questionsCompleted: 85,
      accuracy: 0.82,
      completedTasks: 2,
    },
    achievements: [
      "完成50道资料分析题目",
      "正确率超过80%",
      "连续学习7天",
    ],
    tomorrowPlan: "明天计划完成60道数量关系题目，重点复习混合运算。",
  };

  return mockData;
}