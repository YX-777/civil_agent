import type { Message } from './agent';

export interface RAGResult {
  id: string;
  title: string;
  content: string;
  source: string;
  score: number;
  metadata: Record<string, any>;
  relevanceScore: number;
  timestamp: Date;
}

export interface RAGQuery {
  query: string;
  userId: string;
  filters?: Record<string, any>;
  topK?: number;
  minScore?: number;
}

export interface RAGResponse {
  results: RAGResult[];
  totalResults: number;
  query: string;
  executionTime: number;
  hasMore: boolean;
}

export interface LearningRecord {
  id: string;
  userId: string;
  moduleId: string;
  moduleName: string;
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  masteryLevel: number;
  notes?: string;
}

export interface ExperienceDocument {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  likes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  source: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface VectorSearchQuery {
  query: string;
  userId: string;
  topK: number;
  filters?: Record<string, any>;
  threshold?: number;
}

export interface VectorSearchResponse {
  results: KnowledgeChunk[];
  query: string;
  executionTime: number;
  totalResults: number;
}

export interface RAGSearchParams {
  query: string;
  category?: string;
  topK?: number;
  filters?: Record<string, any>;
}

export interface RetrievalResult {
  content: string;
  metadata: {
    source: string;
    category: string;
    timestamp?: Date;
    score: number;
    tags?: string[];
  };
}