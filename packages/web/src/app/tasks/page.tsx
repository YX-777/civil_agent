"use client";

import { useState, useEffect } from "react";
import { Task } from "@/types";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

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
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
      case "in_progress":
        return "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
      case "completed":
        return "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400";
      case "overdue":
        return "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400";
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="pb-20 md:pb-0 pt-4 md:pt-20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">任务管理</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-primary mb-2">
                {todayTasks.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">今日任务</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-secondary mb-2">
                {inProgressTasks.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">进行中</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-success mb-2">
                {completedTasks.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">已完成</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold">今日任务</h2>
            </div>
            <div className="p-6">
              {todayTasks.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  今天没有任务
                </div>
              ) : (
                <div className="space-y-4">
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            checked={task.status === "completed"}
                            onChange={() => toggleTaskStatus(task.id)}
                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span
                            className={`font-medium ${
                              task.status === "completed"
                                ? "line-through text-gray-500"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 ml-8">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                              task.status
                            )}`}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            截止：{task.dueDate}
                          </span>
                        </div>
                        {task.status === "in_progress" && (
                          <div className="mt-3 ml-8">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {task.progress}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold">进行中任务</h2>
            </div>
            <div className="p-6">
              {inProgressTasks.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  没有进行中的任务
                </div>
              ) : (
                <div className="space-y-4">
                  {inProgressTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {task.title}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          进行中
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {task.progress}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          截止：{task.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors">
            + 创建新任务
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}