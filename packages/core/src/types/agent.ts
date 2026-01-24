import type { UserIntent } from '../constants/config';

export interface GraphStateType {
  userId: string;
  messages: Message[];
  userIntent: UserIntent;
  waitingForUserInput: boolean;
  quickReplyOptions: QuickReplyOption[];
  ragResults: any[];
  feishuTaskIds: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QuickReplyOption {
  id: string;
  text: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface AgentConfig {
  userId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  ragEnabled: boolean;
  mcpEnabled: boolean;
}

export interface AgentExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  executionTime: number;
}

export interface IntentDetectionResult {
  intent: UserIntent;
  confidence: number;
  entities: Record<string, any>;
  context: string;
}