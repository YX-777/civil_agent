/**
 * 初始化知识库脚本
 */

import axios from "axios";
import { bailianConfig, validateBailianConfig } from "../config/bailian.config";
import { logger } from "@tech-mate/core";

/**
 * 初始化知识库
 */
async function initKnowledgeBase(): Promise<void> {
  try {
    logger.info("开始初始化百炼知识库...");

    // 验证配置
    validateBailianConfig();

    // 检查知识库是否存在
    logger.info(`检查知识库 ID: ${bailianConfig.knowledgeBaseId}`);

    try {
      const checkResponse = await axios.get(
        `${bailianConfig.apiEndpoint}/knowledge-base/${bailianConfig.knowledgeBaseId}`,
        {
          headers: {
            Authorization: `Bearer ${bailianConfig.apiKey}`,
          },
        }
      );

      if (checkResponse.data) {
        logger.info("知识库已存在，跳过创建");
        logger.info(`知识库名称: ${checkResponse.data.name}`);
        logger.info(`文档数量: ${checkResponse.data.document_count || 0}`);
        return;
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.info("知识库不存在，开始创建...");
      } else {
        throw error;
      }
    }

    // 创建知识库
    const createResponse = await axios.post(
      `${bailianConfig.apiEndpoint}/knowledge-base`,
      {
        name: "技术学习知识库",
        description: "包含用户学习历史和技术资料的知识库",
        embedding_model: "text-embedding-v2",
        chunk_size: 1000,
        chunk_overlap: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${bailianConfig.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const knowledgeBaseId = createResponse.data.knowledge_base_id;
    logger.info(`知识库创建成功，ID: ${knowledgeBaseId}`);

    // 更新环境变量提示
    logger.info("\n请更新环境变量配置:");
    logger.info(`BAILIAN_KNOWLEDGE_BASE_ID=${knowledgeBaseId}`);

    // 创建集合
    logger.info("\n创建知识库集合...");
    await createCollections(knowledgeBaseId);

    logger.info("\n知识库初始化完成!");
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("知识库初始化失败:", err);
    process.exit(1);
  }
}

/**
 * 创建知识库集合
 */
async function createCollections(knowledgeBaseId: string): Promise<void> {
  const collections = [
    {
      name: "user_learning_history",
      description: "用户学习历史记录",
    },
    {
      name: "tech_articles",
      description: "技术文章与最佳实践",
    },
  ];

  for (const collection of collections) {
    try {
      await axios.post(
        `${bailianConfig.apiEndpoint}/knowledge-base/${knowledgeBaseId}/collections`,
        collection,
        {
          headers: {
            Authorization: `Bearer ${bailianConfig.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      logger.info(`集合创建成功: ${collection.name}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn(`集合创建失败: ${collection.name}`, err);
    }
  }
}

/**
 * 上传示例文档
 */
async function uploadSampleDocuments(): Promise<void> {
  logger.info("\n上传示例文档...");

  const sampleDocuments = [
    {
      category: "tech_articles",
      content: "React Hooks 是函数组件中复用状态逻辑的核心机制。常用 Hook 包括 useState（状态）、useEffect（副作用）、useMemo（记忆化）、useCallback（缓存函数）、useRef（可变引用）。Hook 必须在组件顶层调用，不能在循环或条件分支中使用。",
      metadata: {
        source: "示例文档",
        tags: ["React", "Hooks", "前端"],
        author: "系统",
      },
    },
    {
      category: "tech_articles",
      content: "TypeScript 中条件类型与类型推断的组合可以实现复杂的类型体操。常见模式：infer 关键字提取类型片段、distributive conditional 处理联合类型、Mapped Types 改写对象类型。这些机制是大型库（如 React Query / tRPC）类型安全的基础。",
      metadata: {
        source: "示例文档",
        tags: ["TypeScript", "类型体操", "进阶"],
        author: "系统",
      },
    },
  ];

  for (const doc of sampleDocuments) {
    try {
      await axios.post(
        `${bailianConfig.apiEndpoint}/knowledge-base/${bailianConfig.knowledgeBaseId}/documents`,
        {
          documents: [
            {
              content: doc.content,
              metadata: {
                ...doc.metadata,
                category: doc.category,
                timestamp: new Date().toISOString(),
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${bailianConfig.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      logger.info(`文档上传成功: ${doc.category}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn(`文档上传失败: ${doc.category}`, err);
    }
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const uploadSamples = args.includes("--upload-samples");

  await initKnowledgeBase();

  if (uploadSamples) {
    await uploadSampleDocuments();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});