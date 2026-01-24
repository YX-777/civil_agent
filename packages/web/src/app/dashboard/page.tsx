"use client";

import { useState } from "react";
import { useStats } from "@/hooks/use-stats";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";
import StatCard from "@/components/dashboard/StatCard";
import AccuracyChart from "@/components/dashboard/AccuracyChart";
import ModuleBar from "@/components/dashboard/ModuleBar";

const modules = [
  { name: "资料分析", accuracy: 85, color: "#3b82f6" },
  { name: "数量关系", accuracy: 72, color: "#8b5cf6" },
  { name: "判断推理", accuracy: 78, color: "#10b981" },
  { name: "言语理解", accuracy: 82, color: "#f59e0b" },
  { name: "常识判断", accuracy: 68, color: "#ef4444" },
];

const accuracyData = [
  { date: "周一", accuracy: 75 },
  { date: "周二", accuracy: 78 },
  { date: "周三", accuracy: 72 },
  { date: "周四", accuracy: 80 },
  { date: "周五", accuracy: 82 },
  { date: "周六", accuracy: 85 },
  { date: "周日", accuracy: 78 },
];

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  const { stats, isLoading, error } = useStats(timeRange);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="pb-20 md:pb-0 pt-4 md:pt-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="pb-20 md:pb-0 pt-4 md:pt-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <div className="text-red-600 dark:text-red-400 font-semibold mb-2">
                加载失败
              </div>
              <div className="text-red-500 dark:text-red-500">{error}</div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="pb-20 md:pb-0 pt-4 md:pt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4">数据看板</h1>
            <div className="flex gap-2">
              {(["week", "month", "all"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === range
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {range === "week" ? "最近一周" : range === "month" ? "最近一月" : "全部"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="学习时长"
              value={`${stats?.totalHours || 0}小时`}
              subtitle={timeRange === "week" ? "本周累计" : timeRange === "month" ? "本月累计" : "全部累计"}
              icon="⏱️"
            />
            <StatCard
              title="平均正确率"
              value={`${((stats?.avgAccuracy || 0) * 100).toFixed(1)}%`}
              subtitle="所有题目"
              icon="📈"
            />
            <StatCard
              title="连续天数"
              value={`${stats?.consecutiveDays || 0}天`}
              subtitle="保持学习节奏"
              icon="🔥"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AccuracyChart data={accuracyData} />
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-semibold mb-4">模块分析</h3>
              {modules.map((module) => (
                <ModuleBar
                  key={module.name}
                  name={module.name}
                  accuracy={module.accuracy}
                  color={module.color}
                />
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md mb-6">
            <h3 className="text-lg font-semibold mb-4">备考进度</h3>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  总体进度
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {stats?.progressPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-300"
                  style={{ width: `${stats?.progressPercentage || 0}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">45</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">已学习天数</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-secondary mb-1">90</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">剩余天数</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  AI 建议
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  你的常识判断模块正确率较低（68%），建议增加该模块的练习时间。同时，资料分析模块表现优秀，可以适当减少练习频率。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}