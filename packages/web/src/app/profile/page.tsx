"use client";

import { useState } from "react";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="pb-20 md:pb-0 pt-4 md:pt-20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">个人中心</h1>

          <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-8 text-white mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl">
                👤
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{profile.nickname}</h2>
                <p className="text-white text-opacity-80">考公备考中</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-4xl font-bold text-primary mb-2">
                {getDaysUntilExam()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">距离考试</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-4xl font-bold text-secondary mb-2">
                {profile.targetScore}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">目标分数</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">个人档案</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    编辑
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      保存
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  昵称
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.nickname}
                    onChange={(e) =>
                      setEditForm({ ...editForm, nickname: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-gray-100">
                    {profile.nickname}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  目标分数
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.targetScore}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        targetScore: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-gray-100">
                    {profile.targetScore}分
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  考试日期
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.examDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, examDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-gray-100">
                    {new Date(profile.examDate).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  已学习天数
                </label>
                <div className="text-gray-900 dark:text-gray-100">
                  {profile.totalStudyDays}天
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold">学习数据总览</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">120</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">总学习时长(小时)</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-secondary mb-1">45</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">总学习天数</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-success mb-1">78%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">平均正确率</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-warning mb-1">7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">连续天数</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold">设置</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🔔</div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      通知设置
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎨</div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      主题设置
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📊</div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      数据导出
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">❓</div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      帮助与反馈
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}