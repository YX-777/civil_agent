export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: MCPToolParameter[];
  execute: (params: Record<string, any>) => Promise<MCPToolResult>;
}

export interface MCPToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface FeishuTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  parentTaskId?: string;
  subtasks?: FeishuTask[];
}

export interface FeishuTaskCreateRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: Date;
  tags?: string[];
  parentTaskId?: string;
}

export interface FeishuTaskUpdateRequest {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface FeishuTaskResponse {
  task: FeishuTask;
  message: string;
}

export interface BailianRAGRequest {
  query: string;
  topK?: number;
  filters?: Record<string, any>;
  userId: string;
}

export interface BailianRAGResponse {
  results: Array<{
    id: string;
    title: string;
    content: string;
    source: string;
    score: number;
    metadata: Record<string, any>;
  }>;
  totalResults: number;
  query: string;
  executionTime: number;
}

export interface MCPConfig {
  bailian?: {
    apiKey: string;
    baseUrl: string;
  };
  feishu?: {
    appId: string;
    appSecret: string;
    baseUrl: string;
  };
}

export interface MCPToolCall {
  toolName: string;
  parameters: Record<string, any>;
  timestamp: Date;
  result?: MCPToolResult;
}

export interface MCPExecutionLog {
  id: string;
  userId: string;
  toolCalls: MCPToolCall[];
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}