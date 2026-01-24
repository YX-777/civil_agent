/**
 * 初始化知识库脚本
 */

import axios from "axios";
import { bailianConfig, validateBailianConfig } from "../config/bailian.config";
import { logger } from "@civil-agent/core";

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
        name: "考公备考知识库",
        description: "包含用户学习历史和备考经验的知识库",
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
      name: "exam_experience",
      description: "备考经验文档",
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
      category: "exam_experience",
      content: "行测数量关系是公务员考试的重点模块，需要掌握数学基础知识和解题技巧。建议每天练习20道题目，重点突破比例问题、行程问题、工程问题等常见题型。",
      metadata: {
        source: "示例文档",
        tags: ["行测", "数量关系", "备考经验"],
        author: "系统",
      },
    },
    {
      category: "exam_experience",
      content: "申论写作需要注意文章结构和逻辑性。通常包括：提出问题、分析问题、解决问题三个部分。建议多阅读人民日报评论文章，学习官方表达方式。",
      metadata: {
        source: "示例文档",
        tags: ["申论", "写作", "备考经验"],
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