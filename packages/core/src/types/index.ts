export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BaseApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: Date;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    studyReminders: boolean;
  };
  studySettings: {
    dailyGoal: number;
    preferredTimeSlots: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface StudyProgress {
  userId: string;
  moduleId: string;
  moduleName: string;
  completedLessons: number;
  totalLessons: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date;
  nextReviewDate: Date;
  masteryLevel: number;
  timeSpent: number; // in minutes
}

export interface ExamStats {
  userId: string;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  lastExamDate: Date;
  nextExamDate?: Date;
  weakAreas: string[];
  strongAreas: string[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  lastChecked: Date;
  services: {
    rag: 'healthy' | 'degraded' | 'down';
    mcp: 'healthy' | 'degraded' | 'down';
    database: 'healthy' | 'degraded' | 'down';
  };
}

export * from './agent';
export * from './rag';
export * from './mcp';