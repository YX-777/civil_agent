"use client";

import { useFocus } from "@/hooks/use-focus";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

const modules = ["资料分析", "数量关系", "判断推理", "言语理解", "常识判断"];
const durations = [
  { hours: 1, label: "1小时" },
  { hours: 2, label: "2小时" },
  { hours: 3, label: "3小时" },
];

export default function FocusPage() {
  const { phase, session, timeRemaining, startSession, completeSession, resetSession, getEncouragement } =
    useFocus();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = session ? (1 - timeRemaining / (session.duration * 60)) * 100 : 0;

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="pb-20 md:pb-0 pt-4 md:pt-20">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
              <h1 className="text-3xl font-bold text-center mb-8">专注模式</h1>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">选择学习时长</h2>
                <div className="grid grid-cols-3 gap-4">
                  {durations.map((duration) => (
                    <button
                      key={duration.hours}
                      onClick={() => {}}
                      className="p-6 bg-gray-100 dark:bg-gray-800 rounded-xl text-center hover:bg-primary hover:text-white transition-colors"
                    >
                      <div className="text-3xl font-bold mb-2">{duration.hours}</div>
                      <div className="text-sm">小时</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">选择学习模块</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {modules.map((module) => (
                    <button
                      key={module}
                      onClick={() => {}}
                      className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-center hover:bg-primary hover:text-white transition-colors"
                    >
                      {module}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => startSession(2, "资料分析")}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors"
              >
                开始专注
              </button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="pb-20 md:pb-0 pt-4 md:pt-20">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl font-mono font-bold text-primary mb-4">
                {formatTime(timeRemaining)}
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-8">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-2xl mb-4">{getEncouragement()}</div>

              <div className="text-gray-600 dark:text-gray-400 mb-8">
                正在学习：{session?.module}
              </div>

              <button
                onClick={completeSession}
                className="px-8 py-3 bg-success text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
              >
                完成专注
              </button>
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
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-4">恭喜！完成今日专注</h1>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                <div className="text-gray-600 dark:text-gray-400">学习时长</div>
                <div className="text-2xl font-bold">{session?.duration}小时</div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                <div className="text-gray-600 dark:text-gray-400">学习模块</div>
                <div className="text-xl font-semibold">{session?.module}</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={resetSession}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
              >
                再次专注
              </button>
              <button
                onClick={() => {}}
                className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}