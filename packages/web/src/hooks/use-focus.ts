import { useState, useCallback, useEffect } from "react";
import { FocusSession } from "@/types";

type FocusPhase = "setup" | "active" | "complete";
const DEFAULT_USER_ID = "default-user";

export function useFocus() {
  const [phase, setPhase] = useState<FocusPhase>("setup");
  const [session, setSession] = useState<FocusSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSession = useCallback(
    async (duration: number, module: string) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/focus/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: DEFAULT_USER_ID,
            duration,
            module,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to start focus session");
        }

        const data = await response.json();
        const newSession: FocusSession = {
          id: data.session.id,
          duration: data.session.duration,
          module: data.session.module,
          completed: data.session.completed,
          startTime: new Date(data.session.startTime),
          endTime: data.session.endTime ? new Date(data.session.endTime) : undefined,
          userId: data.session.userId,
          createdAt: data.session.createdAt,
        };

        setSession(newSession);
        setPhase("active");
        setTimeRemaining(duration * 60);
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const completeSession = useCallback(async () => {
    if (!session) return;
    setIsSubmitting(true);

    try {
      const actualMinutes = Math.max(1, Math.round((session.duration * 60 - timeRemaining) / 60));
      const response = await fetch("/api/focus/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          sessionId: session.id,
          actualMinutes,
          reflection: "专注模式完成",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete focus session");
      }

      const data = await response.json();
      const completedSession = {
        id: data.session.id,
        duration: data.session.duration,
        module: data.session.module,
        completed: data.session.completed,
        startTime: new Date(data.session.startTime),
        endTime: data.session.endTime ? new Date(data.session.endTime) : new Date(),
        userId: data.session.userId,
        createdAt: data.session.createdAt,
      };

      setSession(completedSession);
      setPhase("complete");
    } catch (error) {
      console.error("Failed to complete session:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [session, timeRemaining]);

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
    isSubmitting,
  };
}
