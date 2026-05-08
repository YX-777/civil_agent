/**
 * 数据看板页面 - ISR 实现
 *
 * 渲染策略：
 * - Server Component: 服务端获取初始数据，ISR 缓存
 * - Client Component: 时间范围切换等交互逻辑
 *
 * revalidate: 3600 (1小时)
 * 原因：学习数据汇总统计不需要实时更新，每小时刷新一次足够
 */

import { Suspense } from "react";
import { Spin } from "antd";
import DashboardClient from "./DashboardClient";
import { getStatsService, initializeDatabase } from "@tech-mate/database";

// ISR: 每小时重新生成
export const revalidate = 3600;

const DEFAULT_USER_ID = "default-user";

interface DashboardStats {
  totalHours: number;
  avgAccuracy: number;
  consecutiveDays: number;
  progressPercentage: number;
  studyDays: number;
  remainingDays: number | null;
  accuracyTrend: { date: string; accuracy: number }[];
  modules: { name: string; accuracy: number }[];
  suggestion: {
    level: "success" | "info" | "warning";
    title: string;
    description: string;
  };
}

/**
 * 服务端获取数据 - 直接调用数据库服务
 * 避免 build 时 fetch API route 失败
 */
async function getDashboardData(range: "week" | "month" | "all"): Promise<DashboardStats> {
  try {
    // 初始化数据库连接
    await initializeDatabase({ skipVectorDB: true });

    const statsService = getStatsService();

    // 并行获取所有数据
    const [stats, accuracyTrend, modules, suggestion] = await Promise.all([
      statsService.getStatsSummary(DEFAULT_USER_ID, range),
      statsService.getAccuracyTrend(DEFAULT_USER_ID, range),
      statsService.getModuleAccuracy(DEFAULT_USER_ID),
      statsService.getDashboardSuggestion(DEFAULT_USER_ID, range),
    ]);

    return {
      ...stats,
      accuracyTrend,
      modules,
      suggestion,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // 返回默认数据，避免页面崩溃
    return {
      totalHours: 0,
      avgAccuracy: 0,
      consecutiveDays: 0,
      progressPercentage: 0,
      studyDays: 0,
      remainingDays: null,
      accuracyTrend: [],
      modules: [],
      suggestion: {
        level: "info",
        title: "暂无数据",
        description: "开始学习后即可查看数据看板",
      },
    };
  }
}

/**
 * Dashboard 页面 - Server Component
 */
export default async function DashboardPage() {
  // 服务端获取初始数据（ISR 缓存）
  const initialData = await getDashboardData("month");

  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <Spin size="large" />
        </div>
      }
    >
      <DashboardClient initialData={initialData} initialRange="month" />
    </Suspense>
  );
}