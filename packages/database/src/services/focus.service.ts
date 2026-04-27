import type { FocusSession, LearningRecord } from "@prisma/client";
import { FocusSessionRepository } from "../repositories/focus-session.repository";
import { UserRepository } from "../repositories/user.repository";
import { LearningRecordService } from "./learning-record.service";

export interface StartFocusInput {
  userId: string;
  duration: number;
  module: string;
}

export interface CompleteFocusInput {
  userId: string;
  sessionId: string;
  actualMinutes?: number;
  reflection?: string | null;
}

export class FocusService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly focusSessionRepository: FocusSessionRepository,
    private readonly learningRecordService: LearningRecordService
  ) {}

  async startSession(input: StartFocusInput): Promise<FocusSession> {
    const { userId, duration, module } = input;
    await this.userRepository.findOrCreateUser(userId);

    const activeSession = await this.focusSessionRepository.getActiveSession(userId);
    if (activeSession) {
      throw new Error("Focus session already active");
    }

    return this.focusSessionRepository.createSession(userId, {
      duration,
      module,
    });
  }

  async completeSession(input: CompleteFocusInput): Promise<{ session: FocusSession; learningRecord: LearningRecord }> {
    const { userId, sessionId, actualMinutes, reflection } = input;
    await this.userRepository.findOrCreateUser(userId);

    const session = await this.focusSessionRepository.getSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Focus session not found");
    }

    if (session.completed) {
      throw new Error("Focus session already completed");
    }

    const completedSession = await this.focusSessionRepository.completeSession(sessionId, new Date());
    const learningRecord = await this.learningRecordService.recordFocusCompletion({
      userId,
      sessionId,
      module: session.module,
      actualMinutes: typeof actualMinutes === "number" ? actualMinutes : session.duration * 60,
      reflection,
    });

    return {
      session: completedSession,
      learningRecord,
    };
  }
}
