# Database 包 - 三层存储架构实现

## 📋 目录
- [包概述](#包概述)
- [技术栈](#技术栈)
- [架构设计](#架构设计)
- [核心功能](#核心功能)
- [使用指南](#使用指南)
- [API文档](#api文档)
- [开发指南](#开发指南)

---

## 包概述

`@civil-agent/database` 是考公Agent项目的数据库核心包，实现了三层分离存储架构：

1. **第一层**：SQLite关系型数据库（用户数据、会话、任务、统计）
2. **第二层**：Chroma向量数据库（消息向量、用户偏好、知识掌握）
3. **第三层**：阿里云百炼知识库（备考经验、知识点、题目解析）

### 主要职责

- ✅ 提供统一的数据库访问接口（Repository Pattern）
- ✅ 实现数据持久化存储
- ✅ 管理向量数据库集成
- ✅ 协调三层存储的数据同步
- ✅ 提供类型安全的数据访问

---

## 技术栈

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@prisma/client` | ^5.7.0 | ORM客户端 |
| `prisma` | ^5.7.0 | 数据库迁移和生成 |
| `@civil-agent/core` | workspace:* | 共享类型和工具 |
| `chromadb` | ^1.8.0 | 向量数据库客户端 |
| `axios` | ^1.6.5 | HTTP客户端（调用百炼API） |

### 开发依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@types/node` | ^20.11.0 | Node.js类型定义 |
| `typescript` | ^5.3.3 | TypeScript编译器 |
| `ts-node` | ^10.9.2 | TypeScript执行器 |

---

## 架构设计

### 三层存储架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                    │
│              Next.js + LangGraph Agent                      │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┼────────┬────────┐
        │        │        │        │
        ▼        ▼        ▼        ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  SQLite     │ │  Vector DB  │ │  百炼知识库  │
│  (关系型)   │ │  (向量)     │ │  (外部RAG)   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 模块结构

```
packages/database/
├── src/
│   ├── repositories/          # Repository层
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   ├── conversation.repository.ts
│   │   ├── message.repository.ts
│   │   ├── task.repository.ts
│   │   ├── focus-session.repository.ts
│   │   ├── learning-record.repository.ts
│   │   └── module-progress.repository.ts
│   ├── services/             # 业务服务层
│   │   ├── vector-db.service.ts
│   │   ├── embedding.service.ts
│   │   └── sync.service.ts
│   ├── utils/                # 工具函数
│   │   ├── id-generator.ts
│   │   └── date-utils.ts
│   └── index.ts
├── prisma/
│   └── schema.prisma         # Prisma数据模型
├── data/                    # SQLite数据库文件
│   └── civil-agent.db
└── package.json
```

---

## 核心功能

### 1. Repository层

提供统一的数据访问接口，封装所有数据库操作。

#### BaseRepository

基础Repository类，提供通用的CRUD操作。

```typescript
class BaseRepository<T> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  async findById(id: string): Promise<T | null>;
  async findMany(filter?: any): Promise<T[]>;
  async create(data: any): Promise<T>;
  async update(id: string, data: any): Promise<T>;
  async delete(id: string): Promise<T>;
  async upsert(filter: any, data: any): Promise<T>;
}
```

#### UserRepository

用户数据访问，包括用户创建、资料管理。

```typescript
class UserRepository extends BaseRepository<User> {
  async findByUserId(userId: string): Promise<User | null>;
  async createUser(userId: string): Promise<User>;
  async getUserProfile(userId: string): Promise<UserProfile | null>;
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
  async updateStudyDays(userId: string, days: number): Promise<void>;
}
```

#### ConversationRepository

对话会话数据访问，包括会话创建、查询、更新。

```typescript
class ConversationRepository extends BaseRepository<Conversation> {
  async findByUserId(userId: string, limit?: number): Promise<Conversation[]>;
  async createConversation(userId: string, title: string): Promise<Conversation>;
  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation>;
  async deleteConversation(id: string): Promise<void>;
  async getConversationWithMessages(id: string, userId: string): Promise<Conversation | null>;
}
```

#### MessageRepository

消息数据访问，包括消息创建、查询。

```typescript
class MessageRepository extends BaseRepository<Message> {
  async findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  async createMessage(data: CreateMessageDto): Promise<Message>;
  async createMessages(messages: CreateMessageDto[]): Promise<Message[]>;
  async getRecentMessages(userId: string, limit: number): Promise<Message[]>;
}
```

#### TaskRepository

任务数据访问，包括任务CRUD、状态管理。

```typescript
class TaskRepository extends BaseRepository<Task> {
  async findByUserId(userId: string, filter?: TaskFilter): Promise<Task[]>;
  async createTask(userId: string, data: CreateTaskDto): Promise<Task>;
  async updateTask(id: string, data: Partial<Task>): Promise<Task>;
  async deleteTask(id: string): Promise<void>;
  async getOverdueTasks(userId: string): Promise<Task[]>;
  async getCompletedTasks(userId: string, startDate: Date, endDate: Date): Promise<Task[]>;
}
```

#### FocusSessionRepository

专注会话数据访问。

```typescript
class FocusSessionRepository extends BaseRepository<FocusSession> {
  async findByUserId(userId: string, limit?: number): Promise<FocusSession[]>;
  async createSession(userId: string, data: CreateFocusSessionDto): Promise<FocusSession>;
  async updateSession(id: string, data: Partial<FocusSession>): Promise<FocusSession>;
  async completeSession(id: string, endTime: Date): Promise<FocusSession>;
  async getActiveSession(userId: string): Promise<FocusSession | null>;
}
```

#### LearningRecordRepository

学习记录数据访问。

```typescript
class LearningRecordRepository extends BaseRepository<LearningRecord> {
  async findByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<LearningRecord[]>;
  async createRecord(userId: string, data: CreateLearningRecordDto): Promise<LearningRecord>;
  async updateRecord(id: string, data: Partial<LearningRecord>): Promise<LearningRecord>;
  async getConsecutiveDays(userId: string): Promise<number>;
  async getTotalHours(userId: string, startDate?: Date, endDate?: Date): Promise<number>;
}
```

#### ModuleProgressRepository

模块进度数据访问。

```typescript
class ModuleProgressRepository extends BaseRepository<ModuleProgress> {
  async findByUserId(userId: string): Promise<ModuleProgress[]>;
  async findByModule(userId: string, moduleName: string): Promise<ModuleProgress | null>;
  async createProgress(userId: string, data: CreateModuleProgressDto): Promise<ModuleProgress>;
  async updateProgress(id: string, data: Partial<ModuleProgress>): Promise<ModuleProgress>;
  async updateAccuracy(userId: string, moduleName: string, correct: number, total: number): Promise<ModuleProgress>;
}
```

### 2. 向量数据库服务

#### VectorDBService

Chroma向量数据库的封装服务。

```typescript
class VectorDBService {
  private chromaClient: ChromaClient;

  async initialize(): Promise<void>;
  async createCollection(name: string, metadata?: any): Promise<void>;
  async addEmbedding(collection: string, id: string, vector: number[], metadata?: any): Promise<void>;
  async search(collection: string, queryVector: number[], topK?: number, filter?: any): Promise<VectorSearchResult[]>;
  async get(collection: string, id: string): Promise<VectorSearchResult | null>;
  async delete(collection: string, id: string): Promise<void>;
}
```

**向量集合**：
- `user_messages`: 用户消息向量
- `user_preferences`: 用户偏好向量
- `user_knowledge_mastery`: 知识掌握度向量
- `task_vectors`: 任务向量

#### EmbeddingService

Embedding生成服务，使用阿里云千问API。

```typescript
class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;

  async generateEmbedding(text: string): Promise<number[]>;
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}
```

### 3. 数据同步服务

#### SyncService

协调三层存储的数据同步。

```typescript
class SyncService {
  constructor(
    private messageRepo: MessageRepository,
    private vectorService: VectorDBService,
    private embeddingService: EmbeddingService
  ) {}

  async syncMessageToVector(message: Message): Promise<void>;
  async syncMessagesToVector(messages: Message[]): Promise<void>;
  async syncTaskToVector(task: Task): Promise<void>;
  async syncUserPreferences(userId: string, preferences: any): Promise<void>;
  async syncKnowledgeMastery(userId: string, progress: ModuleProgress): Promise<void>;
}
```

---

## 使用指南

### 安装依赖

```bash
cd packages/database
pnpm install
```

### 初始化数据库

```bash
# 生成Prisma客户端
pnpm generate

# 推送数据库schema
pnpm push

# 创建数据库文件和默认用户
node dist/init.js
```

### 使用Repository

```typescript
import { UserRepository } from '@civil-agent/database/repositories/user.repository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const userRepo = new UserRepository(prisma);

// 创建用户
const user = await userRepo.createUser('user-123');

// 获取用户资料
const profile = await userRepo.getUserProfile('user-123');

// 更新资料
await userRepo.updateUserProfile('user-123', {
  nickname: '小明',
  targetScore: 80
});
```

### 使用向量数据库

```typescript
import { VectorDBService } from '@civil-agent/database/services/vector-db.service';
import { EmbeddingService } from '@civil-agent/database/services/embedding.service';

const vectorService = new VectorDBService();
const embeddingService = new EmbeddingService();

// 初始化
await vectorService.initialize();

// 生成embedding
const vector = await embeddingService.generateEmbedding('用户消息内容');

// 添加到向量库
await vectorService.addEmbedding('user_messages', 'msg-123', vector, {
  user_id: 'user-123',
  conversation_id: 'conv-456'
});

// 语义搜索
const results = await vectorService.search('user_messages', queryVector, 5, {
  user_id: 'user-123'
});
```

### 数据同步

```typescript
import { SyncService } from '@civil-agent/database/services/sync.service';

const syncService = new SyncService(
  messageRepo,
  vectorService,
  embeddingService
);

// 同步消息到向量库
await syncService.syncMessageToVector(message);

// 批量同步
await syncService.syncMessagesToVector(messages);
```

---

## API文档

### 初始化API

```typescript
export interface DatabaseConfig {
  databaseUrl?: string;
  vectorDbPath?: string;
  embeddingApiKey?: string;
}

export async function initializeDatabase(config?: DatabaseConfig): Promise<void>;
```

### Repository接口

```typescript
export interface IUserRepository {
  findByUserId(userId: string): Promise<User | null>;
  createUser(userId: string): Promise<User>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
}

export interface IConversationRepository {
  findByUserId(userId: string, limit?: number): Promise<Conversation[]>;
  createConversation(userId: string, title: string): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getConversationWithMessages(id: string, userId: string): Promise<Conversation | null>;
}

export interface IMessageRepository {
  findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  createMessage(data: CreateMessageDto): Promise<Message>;
  createMessages(messages: CreateMessageDto[]): Promise<Message[]>;
  getRecentMessages(userId: string, limit: number): Promise<Message[]>;
}

export interface ITaskRepository {
  findByUserId(userId: string, filter?: TaskFilter): Promise<Task[]>;
  createTask(userId: string, data: CreateTaskDto): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getOverdueTasks(userId: string): Promise<Task[]>;
  getCompletedTasks(userId: string, startDate: Date, endDate: Date): Promise<Task[]>;
}

export interface IFocusSessionRepository {
  findByUserId(userId: string, limit?: number): Promise<FocusSession[]>;
  createSession(userId: string, data: CreateFocusSessionDto): Promise<FocusSession>;
  updateSession(id: string, data: Partial<FocusSession>): Promise<FocusSession>;
  completeSession(id: string, endTime: Date): Promise<FocusSession>;
  getActiveSession(userId: string): Promise<FocusSession | null>;
}

export interface ILearningRecordRepository {
  findByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<LearningRecord[]>;
  createRecord(userId: string, data: CreateLearningRecordDto): Promise<LearningRecord>;
  updateRecord(id: string, data: Partial<LearningRecord>): Promise<LearningRecord>;
  getConsecutiveDays(userId: string): Promise<number>;
  getTotalHours(userId: string, startDate?: Date, endDate?: Date): Promise<number>;
}

export interface IModuleProgressRepository {
  findByUserId(userId: string): Promise<ModuleProgress[]>;
  findByModule(userId: string, moduleName: string): Promise<ModuleProgress | null>;
  createProgress(userId: string, data: CreateModuleProgressDto): Promise<ModuleProgress>;
  updateProgress(id: string, data: Partial<ModuleProgress>): Promise<ModuleProgress>;
  updateAccuracy(userId: string, moduleName: string, correct: number, total: number): Promise<ModuleProgress>;
}
```

### 向量数据库API

```typescript
export interface IVectorDBService {
  initialize(): Promise<void>;
  createCollection(name: string, metadata?: any): Promise<void>;
  addEmbedding(collection: string, id: string, vector: number[], metadata?: any): Promise<void>;
  search(collection: string, queryVector: number[], topK?: number, filter?: any): Promise<VectorSearchResult[]>;
  get(collection: string, id: string): Promise<VectorSearchResult | null>;
  delete(collection: string, id: string): Promise<void>;
}

export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface ISyncService {
  syncMessageToVector(message: Message): Promise<void>;
  syncMessagesToVector(messages: Message[]): Promise<void>;
  syncTaskToVector(task: Task): Promise<void>;
  syncUserPreferences(userId: string, preferences: any): Promise<void>;
  syncKnowledgeMastery(userId: string, progress: ModuleProgress): Promise<void>;
}
```

---

## 开发指南

### 添加新的Repository

1. 在 `src/repositories/` 创建新的repository文件
2. 继承 `BaseRepository<T>`
3. 实现特定的业务方法
4. 在 `src/index.ts` 导出

示例：

```typescript
// src/repositories/example.repository.ts
import { BaseRepository } from './base.repository';
import { Example } from '@prisma/client';

export class ExampleRepository extends BaseRepository<Example> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'example');
  }

  async customMethod(param: string): Promise<Example[]> {
    return this.prisma.example.findMany({
      where: { field: param }
    });
  }
}

// src/index.ts
export { ExampleRepository } from './repositories/example.repository';
```

### 添加新的向量集合

1. 在 `VectorDBService` 中添加集合初始化
2. 在 `initialize()` 方法中创建集合
3. 更新文档说明

### 测试

```bash
# 运行测试
pnpm test

# 类型检查
pnpm type-check

# 代码检查
pnpm lint
```

---

## 环境变量

```bash
# .env
DATABASE_URL=file:./data/civil-agent.db
VECTOR_DB_PATH=./data/chroma
EMBEDDING_API_KEY=your_dashscope_api_key
EMBEDDING_API_URL=https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding-v2
```

---

## 数据迁移

### SQLite → PostgreSQL

当需要迁移时：

1. 修改 `prisma/schema.prisma` 的datasource provider
2. 运行 `prisma db push`
3. 更新环境变量 `DATABASE_URL`

### Chroma → Qdrant

当需要迁移时：

1. 修改 `VectorDBService` 的客户端实现
2. 更新向量集合创建逻辑
3. 迁移现有向量数据

---

## 性能优化

### 1. 批量操作

```typescript
// 批量插入消息
await messageRepo.createMessages(messages);

// 批量同步向量
await syncService.syncMessagesToVector(messages);
```

### 2. 索引优化

Prisma schema中已定义所有必要的索引，确保查询性能。

### 3. 连接池

Prisma自动管理连接池，无需手动配置。

### 4. 缓存策略

- 向量检索结果缓存（TTL: 5分钟）
- 用户资料缓存（TTL: 10分钟）
- 常用查询缓存（TTL: 1分钟）

---

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 环境变量
   - 确保数据库文件有写权限
   - 检查磁盘空间

2. **向量数据库初始化失败**
   - 检查 `VECTOR_DB_PATH` 环境变量
   - 确保目录存在且有写权限
   - 检查Chroma客户端版本

3. **Embedding生成失败**
   - 检查API Key是否正确
   - 检查网络连接
   - 检查API配额

---

## 总结

Database包提供了完整的三层存储架构实现：

1. ✅ **Repository Pattern**：统一的数据访问接口
2. ✅ **向量数据库集成**：Chroma向量存储和检索
3. ✅ **数据同步机制**：自动同步SQLite和向量数据库
4. ✅ **类型安全**：完整的TypeScript类型定义
5. ✅ **易于扩展**：支持数据库迁移和向量数据库切换
6. ✅ **性能优化**：批量操作、索引、缓存

**下一步**：实现具体代码。