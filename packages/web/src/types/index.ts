export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
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
  studyDays?: number;
  remainingDays?: number | null;
  accuracyTrend?: Array<{
    date: string;
    accuracy: number;
  }>;
  modules?: Array<{
    name: string;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
  }>;
  suggestion?: {
    level: "info" | "warning" | "success";
    title: string;
    description: string;
  };
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "completed" | "overdue";
  progress: number;
  dueDate: string;
  description?: string | null;
  module?: string | null;
  difficulty?: string | null;
  actualMinutes?: number;
  estimatedMinutes?: number;
  completedAt?: string | null;
  createdAt?: string;
  source?: "manual" | "agent";
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
  userId?: string;
  createdAt?: string;
}

export interface UserProfile {
  nickname: string;
  targetScore: number;
  examDate: string | null;
  totalStudyDays: number;
}

export interface XhsDetailErrorBreakdown {
  access_denied: number;
  transient: number;
  parse_empty: number;
  login_required: number;
  invalid_param: number;
  lookup_miss?: number;
  unknown: number;
}

export interface XhsSyncRunSummary {
  id: string;
  status: string;
  requestedLimit: number;
  fetchedCount: number;
  insertedCount: number;
  dedupedPostIdCount: number;
  dedupedHashCount: number;
  invalidCount: number;
  failedCount: number;
  detailErrorCount: number;
  detailErrorBreakdown: XhsDetailErrorBreakdown;
  createdAt: string;
  endedAt?: string | null;
}

export interface XhsPostReportItem {
  postId: string;
  title: string;
  authorName?: string | null;
  keyword?: string | null;
  status: string;
  errorCategory?: string | null;
  likeCount: number;
  commentCount: number;
  publishTime?: string | null;
  updatedAt: string;
  sourceUrl?: string | null;
  contentPreview: string;
  errorMessage?: string | null;
}

export interface XhsSyncDashboardData {
  summary: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    totalPosts: number;
    newPosts: number;
    detailUnavailablePosts: number;
  };
  latestRun: XhsSyncRunSummary | null;
  recentRuns: XhsSyncRunSummary[];
  recentPosts: XhsPostReportItem[];
  runTrend: Array<{
    label: string;
    fetchedCount: number;
    insertedCount: number;
    detailErrorCount: number;
    transient: number;
    parseEmpty: number;
    accessDenied: number;
    unknown: number;
  }>;
  keywordStats: Array<{
    keyword: string;
    totalPosts: number;
    availablePosts: number;
    detailUnavailablePosts: number;
  }>;
}
