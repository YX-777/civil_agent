export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface QuickReply {
  id: string;
  text: string;
  action: string;
}

export interface Stats {
  totalHours: number;
  avgAccuracy: number;
  consecutiveDays: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "completed" | "overdue";
  progress: number;
  dueDate: string;
}

export interface CalendarDay {
  date: string;
  learningHours: number;
  completed: boolean;
}

export interface FocusSession {
  id: string;
  duration: number;
  module: string;
  completed: boolean;
  startTime: Date;
  endTime?: Date;
}

export interface UserProfile {
  nickname: string;
  targetScore: number;
  examDate: string;
  totalStudyDays: number;
}