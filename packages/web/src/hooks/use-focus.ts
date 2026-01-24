import { useState, useCallback, useEffect } from "react";
import { FocusSession } from "@/types";

type FocusPhase = "setup" | "active" | "complete";

export function useFocus() {
  const [phase, setPhase] = useState<FocusPhase>("setup");
  const [session, setSession] = useState<FocusSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const startSession = useCallback(
    (duration: number, module: string) => {
      const newSession: FocusSession = {
        id: Date.now().toString(),
        duration,
        module,
        completed: false,
        startTime: new Date(),
      };

      setSession(newSession);
      setPhase("active");
      setTimeRemaining(duration * 60);
    },
    []
  );

  const completeSession = useCallback(async () => {
    if (!session) return;

    const completedSession = {
      ...session,
      completed: true,
      endTime: new Date(),
    };

    try {
      await fetch("/api/focus/complete", {
        method: "POST",
        body: JSON.stringify(completedSession),
      });
    } catch (error) {
      console.error("Failed to complete session:", error);
    }

    setSession(completedSession);
    setPhase("complete");
  }, [session]);

  const resetSession = useCallback(() => {
    setSession(null);
    setPhase("setup");
    setTimeRemaining(0);
  }, []);

  useEffect(() => {
    if (phase !== "active" || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeRemaining, completeSession]);

  const getEncouragement = useCallback(() => {
    if (!session) return "";

    const progress = 1 - timeRemaining / (session.duration * 60);

    if (progress < 0.25) return "💪 加油！刚开始！";
    if (progress < 0.5) return "🔥 保持状态！";
    if (progress < 0.75) return "⭐⭐⭐ 太棒了！";
    if (progress < 1) return "🏆 坚持一下，即将完成！";
    return "🎉 恭喜！完成今日专注";
  }, [session, timeRemaining]);

  return {
    phase,
    session,
    timeRemaining,
    startSession,
    completeSession,
    resetSession,
    getEncouragement,
  };
}