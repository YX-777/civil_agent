/**
 * 长期记忆 API
 * GET    /api/memory/long-term?userId=xxx   — 列出该用户全部长期记忆
 * DELETE /api/memory/long-term?userId=xxx&id=lm_xxx — 删除单条
 *
 * 数据源：ChromaDB collection "long_term_memory"
 * 每条 metadata 含：user_id / memory_id / content_type / weight / topics / access_count / creation_date / last_accessed
 */

import { NextRequest, NextResponse } from "next/server";
import { getVectorDBService } from "@tech-mate/database";

const COLLECTION = "long_term_memory";
const DEFAULT_USER_ID = "default-user";

/**
 * 判断一段长期记忆是否为"无价值疑问句" —— 历史脏数据兜底。
 *
 * 触发条件（任一）：
 *  - 文本含问号（? / ？）
 *  - 文本以高频疑问引导词开头（什么/啥/谁/哪/怎么/如何/为什么/多少/几）
 *  - 文本是孤立的"我叫什么 / 我是谁 / 我叫啥"这类自查式问句
 *
 * 这些都是没有信息量的对话噪声，不应该出现在「个人记忆」展示里。
 */
function isWorthlessQuestion(content: string): boolean {
  const text = (content || "").trim();
  if (!text) return true;
  if (/[?？]/.test(text)) return true;
  if (/^(?:我叫(?:什么|啥)|我是谁|我的名字(?:是什么|叫什么|是啥))/.test(text)) return true;
  if (/^(?:什么|啥|谁|哪|怎么|如何|为什么|多少|几)/.test(text) && text.length < 30) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    const vectorService = getVectorDBService();
    await vectorService.initialize();

    const all = await vectorService.getAllDocuments(COLLECTION);

    // 自动清理历史归档进来的"我叫什么"等疑问句脏数据（fire-and-forget，不阻塞读取）
    const toPurge = all.filter(
      (doc) => doc.metadata?.user_id === userId && isWorthlessQuestion(doc.content),
    );
    if (toPurge.length > 0) {
      void Promise.allSettled(
        toPurge.map((doc) => vectorService.delete(COLLECTION, doc.id)),
      ).then(() => {
        console.log(`[Memory] auto-purged ${toPurge.length} worthless-question entries for ${userId}`);
      });
    }

    // 过滤出当前用户的记忆（同时排除即将被清理的脏数据）
    const userMemories = all
      .filter((doc) => doc.metadata?.user_id === userId && !isWorthlessQuestion(doc.content))
      .map((doc) => {
        const meta = doc.metadata || {};
        let topics: string[] = [];
        if (Array.isArray(meta.topics)) topics = meta.topics;
        else if (typeof meta.topics === "string") {
          try { topics = JSON.parse(meta.topics); } catch { topics = [meta.topics]; }
        }

        return {
          id: doc.id,
          content: doc.content,
          contentType: meta.content_type || "message",
          weight: typeof meta.weight === "number" ? meta.weight : 0.5,
          accessCount: meta.access_count || 0,
          topics,
          creationDate: meta.creation_date || null,
          lastAccessed: meta.last_accessed || null,
        };
      })
      .sort((a, b) => b.weight - a.weight);

    return NextResponse.json({
      success: true,
      total: userMemories.length,
      memories: userMemories,
    });
  } catch (error) {
    console.error("Failed to fetch long-term memories:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim();
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const vectorService = getVectorDBService();
    await vectorService.initialize();

    // 安全校验：确认这条记忆属于该 user
    const target = await vectorService.get(COLLECTION, id);
    if (!target) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }
    if (target.metadata?.user_id && target.metadata.user_id !== userId) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await vectorService.delete(COLLECTION, id);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to delete long-term memory:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
