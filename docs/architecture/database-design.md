# 数据库设计方案 - 考公 Agent MVP（三层存储架构）

## 📋 目录
- [架构概览](#架构概览)
- [技术选型](#技术选型)
- [第一层：SQLite关系型数据库](#第一层sqlite关系型数据库)
- [第二层：向量数据库](#第二层向量数据库)
- [第三层：百炼知识库](#第三层百炼知识库)
- [数据流转策略](#数据流转策略)
- [查询策略](#查询策略)
- [数据同步机制](#数据同步机制)
- [实现计划](#实现计划)

---

## 架构概览

### 三层分离存储架构

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

### 各层职责

| 层级 | 存储类型 | 主要职责 | 数据特点 |
|------|---------|---------|---------|
| **第一层** | SQLite | 用户数据、会话、任务、统计 | 结构化、事务性 |
| **第二层** | Chroma向量库 | 消息向量、用户偏好、知识掌握 | 语义检索、相似度计算 |
| **第三层** | 阿里云百炼 | 备考经验、知识点、题目解析 | 外部知识库、RAG检索 |

---

## 技术选型

### 第一层：SQLite + Prisma ORM

**选择理由**：
- ✅ 零配置，开箱即用
- ✅ 适合单用户/小团队场景
- ✅ 易于部署和维护
- ✅ 可以平滑迁移到PostgreSQL
- ✅ Prisma提供类型安全

**未来扩展路径**：
```
SQLite (MVP) → PostgreSQL (生产环境) → 分布式数据库 (大规模)
```

### 第二层：Chroma向量数据库

**选择理由**：
- ✅ 本地部署，零配置
- ✅ Python/JS SDK完善
- ✅ 适合小规模数据（MVP）
- ✅ 开源免费
- ✅ 支持元数据过滤

**未来扩展路径**：
```
Chroma (MVP) → Qdrant (生产环境) → Pinecone (大规模)
```

### 第三层：阿里云百炼知识库

**选择理由**：
- ✅ 已有API Key
- ✅ MCP工具已集成
- ✅ 托管服务，无需维护
- ✅ 支持知识库管理

---

## 第一层：SQLite关系型数据库

### 存储职责

- ✅ 用户基础信息和个人资料
- ✅ 对话会话和消息历史
- ✅ 学习任务管理
- ✅ 专注会话记录
- ✅ 学习统计数据
- ✅ 模块进度追踪
- ✅ Agent状态管理
- ✅ 向量引用表（关联向量数据库）

### 表结构设计

#### 1. users 表 - 用户基础信息

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 用户唯一标识（UUID） | PRIMARY KEY |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**用途**：用户身份标识，作为所有关联表的外键

**索引**：
- PRIMARY KEY: `id`

---

#### 2. user_profiles 表 - 用户个人资料

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| user_id | TEXT | 用户ID（外键） | PRIMARY KEY, FK → users(id) |
| nickname | TEXT | 昵称 | NOT NULL, DEFAULT '考生' |
| target_score | INTEGER | 目标分数（0-100） | DEFAULT 75 |
| exam_date | DATE | 考试日期 | NULLABLE |
| total_study_days | INTEGER | 总学习天数 | DEFAULT 0 |
| avatar_url | TEXT | 头像URL | NULLABLE |
| bio | TEXT | 个人简介 | NULLABLE |
| learning_style | TEXT | 学习风格（visual/auditory/reading） | NULLABLE |
| daily_goal_hours | REAL | 每日学习目标（小时） | DEFAULT 4.0 |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `learning_style`: 用于向量检索时个性化推荐
- `daily_goal_hours`: 用于计算每日完成度

**索引**：
- PRIMARY KEY: `user_id`
- INDEX: `exam_date`

---

#### 3. conversations 表 - 对话会话

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 会话ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| title | TEXT | 会话标题 | NOT NULL |
| summary | TEXT | 会话摘要（AI生成） | NULLABLE |
| vector_collection_id | TEXT | 关联的向量集合ID | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `summary`: 会话摘要，用于快速浏览历史对话
- `vector_collection_id`: 关联到向量数据库的集合ID

**索引**：
- PRIMARY KEY: `id`
- INDEX: `user_id`
- INDEX: `updated_at DESC`

---

#### 4. messages 表 - 消息记录

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 消息ID（UUID） | PRIMARY KEY |
| conversation_id | TEXT | 会话ID（外键） | NOT NULL, FK → conversations(id) |
| role | TEXT | 角色（user/assistant） | NOT NULL, CHECK IN ('user','assistant') |
| content | TEXT | 消息内容 | NOT NULL |
| timestamp | DATETIME | 时间戳 | DEFAULT CURRENT_TIMESTAMP |
| embedding_id | TEXT | 向量ID（外键） | NULLABLE, FK → embeddings(id) |
| metadata | TEXT | 元数据（JSON） | NULLABLE |
| token_count | INTEGER | Token数量 | DEFAULT 0 |
| model_version | TEXT | 使用的模型版本 | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `embedding_id`: 关联到向量数据库中的embedding
- `token_count`: 用于统计和计费
- `model_version`: 记录使用的模型版本

**索引**：
- PRIMARY KEY: `id`
- INDEX: `conversation_id`
- INDEX: `timestamp`

---

#### 5. tasks 表 - 学习任务

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 任务ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| title | TEXT | 任务标题 | NOT NULL |
| description | TEXT | 任务描述 | NULLABLE |
| status | TEXT | 状态 | DEFAULT 'todo', CHECK IN ('todo','in_progress','completed','overdue') |
| progress | INTEGER | 进度（0-100） | DEFAULT 0, CHECK >= 0 AND <= 100 |
| due_date | DATE | 截止日期 | NULLABLE |
| priority | INTEGER | 优先级 | DEFAULT 1, CHECK IN (1,2,3) |
| module | TEXT | 所属模块 | NULLABLE |
| difficulty | TEXT | 难度（easy/medium/hard） | NULLABLE |
| estimated_minutes | INTEGER | 预估时长（分钟） | NULLABLE |
| actual_minutes | INTEGER | 实际时长（分钟） | NULLABLE |
| tags | TEXT | 标签（JSON数组） | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |
| completed_at | DATETIME | 完成时间 | NULLABLE |

**新增字段说明**：
- `difficulty`: 用于智能推荐任务
- `estimated_minutes` vs `actual_minutes`: 用于时间管理分析
- `tags`: 用于任务分类和搜索

**索引**：
- PRIMARY KEY: `id`
- INDEX: `user_id`
- INDEX: `status`
- INDEX: `due_date`
- INDEX: `priority`

---

#### 6. focus_sessions 表 - 专注会话

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 会话ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| duration | INTEGER | 时长（分钟） | NOT NULL |
| module | TEXT | 学习模块 | NOT NULL |
| completed | BOOLEAN | 是否完成 | DEFAULT FALSE |
| start_time | DATETIME | 开始时间 | NOT NULL |
| end_time | DATETIME | 结束时间 | NULLABLE |
| notes | TEXT | 备注 | NULLABLE |
| interruption_count | INTEGER | 打断次数 | DEFAULT 0 |
| mood_before | TEXT | 开始前心情 | NULLABLE |
| mood_after | TEXT | 结束后心情 | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `interruption_count`: 用于分析专注度
- `mood_before/after`: 用于情感分析和个性化

**索引**：
- PRIMARY KEY: `id`
- INDEX: `user_id`
- INDEX: `start_time DESC`
- INDEX: `completed`

---

#### 7. learning_records 表 - 学习记录

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 记录ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| date | DATE | 日期 | NOT NULL |
| learning_hours | REAL | 学习时长（小时） | DEFAULT 0 |
| completed | BOOLEAN | 是否完成当日目标 | DEFAULT FALSE |
| tasks_completed | INTEGER | 完成任务数 | DEFAULT 0 |
| questions_answered | INTEGER | 答题数量 | DEFAULT 0 |
| accuracy | REAL | 准确率 | NULLABLE |
| notes | TEXT | 备注 | NULLABLE |
| mood | TEXT | 当日心情 | NULLABLE |
| energy_level | INTEGER | 精力水平（1-10） | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `mood`: 用于情感分析
- `energy_level`: 用于分析学习效率

**索引**：
- PRIMARY KEY: `id`
- UNIQUE: `(user_id, date)`
- INDEX: `user_id`
- INDEX: `date DESC`

---

#### 8. module_progress 表 - 模块进度

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 进度ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| module_name | TEXT | 模块名称 | NOT NULL |
| total_questions | INTEGER | 总答题数 | DEFAULT 0 |
| correct_answers | INTEGER | 正确答案数 | DEFAULT 0 |
| accuracy | REAL | 准确率 | DEFAULT 0 |
| progress_percentage | INTEGER | 进度百分比 | DEFAULT 0 |
| last_practiced_at | DATETIME | 最后练习时间 | NULLABLE |
| weak_points | TEXT | 薄弱知识点（JSON数组） | NULLABLE |
| strong_points | TEXT | 强项知识点（JSON数组） | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `weak_points`: 用于个性化学习推荐
- `strong_points`: 用于增强信心

**索引**：
- PRIMARY KEY: `id`
- UNIQUE: `(user_id, module_name)`
- INDEX: `user_id`
- INDEX: `accuracy DESC`

---

#### 9. agent_states 表 - Agent状态存储

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 状态ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| conversation_id | TEXT | 会话ID | NOT NULL |
| state_data | TEXT | 状态数据（JSON） | NOT NULL |
| context_vector_id | TEXT | 上下文向量ID | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新时间 | DEFAULT CURRENT_TIMESTAMP |

**新增字段说明**：
- `context_vector_id`: 关联到向量数据库的上下文

**索引**：
- PRIMARY KEY: `id`
- UNIQUE: `(user_id, conversation_id)`
- INDEX: `updated_at`

---

#### 10. embeddings 表 - 向量引用表

| 字段名 | 类型 | 说明 | 约束 |
|---------|------|------|--------|
| id | TEXT | 向量ID（UUID） | PRIMARY KEY |
| user_id | TEXT | 用户ID（外键） | NOT NULL, FK → users(id) |
| vector_db_id | TEXT | 向量数据库中的ID | NOT NULL |
| vector_type | TEXT | 向量类型 | NOT NULL |
| content_type | TEXT | 内容类型 | NOT NULL |
| content_summary | TEXT | 内容摘要 | NULLABLE |
| created_at | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |

**字段说明**：
- `vector_db_id`: 在向量数据库中的实际ID
- `vector_type`: 类型（message/knowledge/user_history/preference）
- `content_type`: 内容类型（text/image/audio）
- `content_summary`: 简短摘要，便于快速浏览

**索引**：
- PRIMARY KEY: `id`
- INDEX: `user_id`
- INDEX: `vector_type`
- INDEX: `vector_db_id`

---

## 第二层：向量数据库

### 存储职责

- ✅ 用户学习历史向量（用于语义搜索）
- ✅ 用户学习偏好向量
- ✅ 用户知识掌握度向量
- ✅ 对话历史向量（用于上下文检索）
- ✅ 任务向量（用于智能推荐）

### 向量数据库：Chroma

**选择理由**：
- 本地部署，零配置
- Python/JS SDK完善
- 适合小规模数据（MVP）
- 开源免费
- 支持元数据过滤

### 向量集合设计

#### Collection 1: user_messages
- **用途**: 存储用户消息的向量表示
- **维度**: 768（使用阿里云千问embedding）
- **元数据**：
  - `user_id`: 用户ID
  - `conversation_id`: 会话ID
  - `message_id`: 消息ID
  - `timestamp`: 时间戳
  - `role`: 角色（user/assistant）

#### Collection 2: user_preferences
- **用途**: 存储用户学习偏好向量
- **维度**: 768
- **元数据**：
  - `user_id`: 用户ID
  - `preference_type`: 类型（learning_style/time_preference/module_preference）
  - `updated_at`: 更新时间

#### Collection 3: user_knowledge_mastery
- **用途**: 存储用户知识掌握度向量
- **维度**: 768
- **元数据**：
  - `user_id`: 用户ID
  - `module`: 模块名称
  - `topic`: 知识点
  - `mastery_level`: 掌握度（0-100）
  - `updated_at`: 更新时间

#### Collection 4: task_vectors
- **用途**: 存储任务描述向量，用于智能推荐
- **维度**: 768
- **元数据**：
  - `user_id`: 用户ID
  - `task_id`: 任务ID
  - `module`: 模块
  - `difficulty`: 难度
  - `status`: 状态

---

## 第三层：百炼知识库

### 存储职责

- ✅ 备考经验库（系统预设）
- ✅ 知识点库（系统预设）
- ✅ 题目解析库（系统预设）
- ✅ 学习方法库（系统预设）

### 知识库分类

#### KB1: exam_experience（备考经验）
- **内容**: 历年考试经验、高分技巧
- **访问方式**: MCP工具调用
- **更新频率**: 低（系统维护）

#### KB2: knowledge_points（知识点）
- **内容**: 各模块知识点详解
- **访问方式**: MCP工具调用
- **更新频率**: 低（系统维护）

#### KB3: question_analysis（题目解析）
- **内容**: 典型题目解析
- **访问方式**: MCP工具调用
- **更新频率**: 中（定期更新）

#### KB4: learning_methods（学习方法）
- **内容**: 高效学习方法、记忆技巧
- **访问方式**: MCP工具调用
- **更新频率**: 低（系统维护）

---

## 数据流转策略

### 1. 用户对话流程

```
用户发送消息
    ↓
[SQLite] 保存消息到messages表
    ↓
[Vector DB] 生成embedding并存储到user_messages
    ↓
[Agent] 处理消息
    ↓
[Vector DB] 语义检索相关历史消息（上下文）
    ↓
[百炼KB] 检索相关知识
    ↓
[Agent] 生成回复
    ↓
[SQLite] 保存回复到messages表
    ↓
[Vector DB] 生成embedding并存储
```

### 2. 学习记录流程

```
完成学习
    ↓
[SQLite] 更新learning_records
    ↓
[SQLite] 更新module_progress
    ↓
[Vector DB] 更新user_knowledge_mastery
    ↓
[SQLite] 更新user_profiles（total_study_days）
```

### 3. 任务推荐流程

```
需要推荐任务
    ↓
[Vector DB] 检索相似任务
    ↓
[SQLite] 查询用户历史任务
    ↓
[Vector DB] 检索用户偏好
    ↓
[算法] 综合推荐
    ↓
[SQLite] 创建新任务
```

---

## 查询策略

### 1. 对话上下文检索

**策略**: 混合检索

```sql
-- SQLite: 查询最近N条消息
SELECT * FROM messages
WHERE conversation_id = ?
ORDER BY timestamp DESC
LIMIT 10;

-- Vector DB: 语义检索相关消息
query_vector = embed(current_message)
results = vector_db.search(
    collection: "user_messages",
    query: query_vector,
    filter: {user_id: current_user},
    top_k: 5
);
```

### 2. 知识库检索

**策略**: 先向量后关键词

```javascript
// 1. 向量检索（百炼）
vector_results = bailian.search({
    query: user_message,
    category: "exam_experience",
    top_k: 3
});

// 2. 关键词检索（SQLite）
keyword_results = db.query(`
    SELECT * FROM messages
    WHERE content LIKE ?
    AND user_id = ?
    ORDER BY timestamp DESC
    LIMIT 5
`, [`%${keyword}%`, user_id]);

// 3. 融合结果
final_results = merge_and_rank(vector_results, keyword_results);
```

### 3. 个性化推荐

**策略**: 基于用户向量

```javascript
// 1. 获取用户偏好向量
user_preferences = vector_db.get(
    collection: "user_preferences",
    filter: {user_id: current_user}
);

// 2. 获取知识掌握度
knowledge_mastery = vector_db.get(
    collection: "user_knowledge_mastery",
    filter: {user_id: current_user}
);

// 3. 综合推荐
recommendations = generate_recommendations(
    user_preferences,
    knowledge_mastery,
    current_context
);
```

---

## 数据同步机制

### 1. SQLite ↔ Vector DB 同步

**触发时机**:
- 消息创建/更新时
- 学习记录更新时
- 用户偏好变更时

**同步策略**:
- 异步同步（不阻塞主流程）
- 批量操作（提高效率）
- 失败重试（保证一致性）

### 2. Vector DB ↔ 百炼KB 同步

**触发时机**:
- Agent需要知识时
- 定期更新知识库时

**同步策略**:
- 实时调用MCP工具
- 缓存常用查询结果
- TTL过期机制

---

## 实现计划

### Phase 1: 基础设施（第1周）

#### Day 1-2: SQLite + Prisma
- [ ] 创建database包结构
- [ ] 配置Prisma schema
- [ ] 实现Repository基础类
- [ ] 实现数据初始化脚本

#### Day 3-4: 向量数据库集成
- [ ] 安装Chroma客户端
- [ ] 实现向量服务封装
- [ ] 创建向量集合
- [ ] 实现embedding生成

### Phase 2: 核心功能（第2周）

#### Day 5-7: Repository层
- [ ] 实现UserRepository
- [ ] 实现ConversationRepository
- [ ] 实现MessageRepository
- [ ] 实现TaskRepository

#### Day 8-10: 数据同步
- [ ] 实现消息向量同步
- [ ] 实现学习记录同步
- [ ] 实现任务向量同步
- [ ] 实现用户偏好同步

### Phase 3: 集成测试（第3周）

#### Day 11-14: 集成到Web
- [ ] 替换内存存储为数据库
- [ ] 更新API路由
- [ ] 测试数据持久化
- [ ] 性能优化

---

## 总结

本数据库设计方案提供了：

1. ✅ **三层分离架构**：SQLite + Chroma + 百炼KB
2. ✅ **完整的数据模型**：覆盖所有MVP功能需求
3. ✅ **类型安全**：使用Prisma ORM，提供完整的TypeScript支持
4. ✅ **性能优化**：合理的索引设计和向量检索
5. ✅ **可扩展性**：支持从SQLite平滑迁移到PostgreSQL
6. ✅ **易于维护**：清晰的Repository模式
7. ✅ **零配置**：MVP阶段使用SQLite和Chroma，无需额外部署

**下一步**：开始实现database包。