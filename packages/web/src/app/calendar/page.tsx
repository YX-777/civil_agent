"use client";

import { useState, useEffect } from "react";
import { CalendarDay } from "@/types";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

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
          <h1 className="text-3xl font-bold mb-6">学习日历</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-primary mb-2">
                {getConsecutiveDays()}天
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">连续学习</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-secondary mb-2">
                {getTotalLearningHours()}小时
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">本月学习</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
              <div className="text-3xl font-bold text-success mb-2">
                {calendarDays.filter((day) => day.completed).length}天
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">打卡天数</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold">{getMonthName()}</h2>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-400"
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

            <div className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {calendarDays.map((day, index) => {
                  const dayNumber = index + 1;
                  const isToday = new Date().toISOString().split("T")[0] === day.date;

                  return (
                    <button
                      key={day.date}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                        day.completed
                          ? "bg-primary text-white hover:bg-blue-600"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      } ${isToday ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    >
                      <span className="text-sm font-medium">{dayNumber}</span>
                      {day.completed && day.learningHours > 0 && (
                        <span className="text-xs mt-1">{day.learningHours}h</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedDate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">
                    {new Date(selectedDate.date).toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={closeDetail}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      学习时长
                    </div>
                    <div className="text-2xl font-bold">
                      {selectedDate.learningHours}小时
                    </div>
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      打卡状态
                    </div>
                    <div className="text-lg font-semibold">
                      {selectedDate.completed ? "✅ 已打卡" : "❌ 未打卡"}
                    </div>
                  </div>

                  {selectedDate.completed && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="text-green-800 dark:text-green-200 font-medium">
                        太棒了！继续保持！
                      </div>
                    </div>
                  )}

                  {!selectedDate.completed && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="text-yellow-800 dark:text-yellow-200 font-medium">
                        还没有打卡，记得学习哦！
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}