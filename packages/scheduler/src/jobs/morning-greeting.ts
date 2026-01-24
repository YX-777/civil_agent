/**
 * 早安问候任务
 */

import { logger } from "@civil-agent/core";
import { PushNotificationService } from "../notification/push-notification";

export interface MorningGreetingData {
  userId: string;
  nickname: string;
  learningProgress: {
    totalHours: number;
    completedTasks: number;
    currentStreak: number;
  };
}

export async function morningGreetingJob(
  data: MorningGreetingData
): Promise<void> {
  logger.info(`Processing morning greeting for user ${data.userId}`);

  const pushService = new PushNotificationService();

  const greeting = generateGreeting(data);
  const learningSuggestion = generateLearningSuggestion(data);
  const encouragement = generateEncouragement(data);

  const content = `${greeting}\n\n${learningSuggestion}\n\n${encouragement}`;

  const quickReplies = [
    {
      id: "start-learning",
      text: "开始今天的学习",
      action: "create_task",
    },
    {
      id: "adjust-plan",
      text: "调整学习计划",
      action: "adjust_plan",
    },
    {
      id: "view-progress",
      text: "查看学习进度",
      action: "query_progress",
    },
  ];

  await pushService.send({
    userId: data.userId,
    title: "早安！新的一天开始了",
    content,
    quickReplies,
  });

  logger.info(`Morning greeting sent to user ${data.userId}`);
}

function generateGreeting(data: MorningGreetingData): string {
  const hour = new Date().getHours();
  let greeting = "早上好";

  if (hour < 9) {
    greeting = "早安";
  } else if (hour < 12) {
    greeting = "上午好";
  }

  return `${greeting}，${data.nickname}！`;
}

function generateLearningSuggestion(data: MorningGreetingData): string {
  const suggestions = [
    "今天建议重点攻克资料分析中的混合增长率问题，这是考试中的高频考点。",
    "建议今天多做几套数量关系的练习题，提高解题速度和准确率。",
    "今天可以复习一下判断推理的逻辑关系，巩固基础知识点。",
    "建议今天进行一次模拟测试，检验最近的学习成果。",
    "今天可以重点练习言语理解，提升阅读速度和理解能力。",
  ];

  const randomIndex = Math.floor(Math.random() * suggestions.length);
  return suggestions[randomIndex];
}

function generateEncouragement(data: MorningGreetingData): string {
  const encouragements = [
    "坚持就是胜利，继续加油！💪",
    "每一步努力都在为梦想铺路，加油！🌟",
    "相信自己，你一定可以做到的！🎯",
    "今天的努力，就是明天的收获！📚",
    "保持专注，你离目标越来越近了！🚀",
  ];

  const randomIndex = Math.floor(Math.random() * encouragements.length);
  return encouragements[randomIndex];
}

export async function getAllActiveUsers(): Promise<MorningGreetingData[]> {
  const mockUsers: MorningGreetingData[] = [
    {
      userId: "user-1",
      nickname: "小明",
      learningProgress: {
        totalHours: 120,
        completedTasks: 45,
        currentStreak: 7,
      },
    },
    {
      userId: "user-2",
      nickname: "小红",
      learningProgress: {
        totalHours: 95,
        completedTasks: 38,
        currentStreak: 5,
      },
    },
  ];

  return mockUsers;
}