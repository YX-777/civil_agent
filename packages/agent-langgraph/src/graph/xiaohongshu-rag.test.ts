import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGeneralAnswerPrompt,
  buildXiaohongshuRagQuery,
  formatXiaohongshuRagContext,
  resolveXiaohongshuKnowledge,
  shouldRouteToXiaohongshuRag,
} from "./xiaohongshu-rag";

// 这组测试的重点不是覆盖所有考公问法，而是锁住：
// 1. 白名单命中逻辑
// 2. 本地知识上下文的组装方式
// 3. 没命中或没结果时必须老实降级

test("shouldRouteToXiaohongshuRag matches civil exam whitelist queries", () => {
  assert.equal(shouldRouteToXiaohongshuRag("想看杭州考公上岸经验"), true);
  assert.equal(shouldRouteToXiaohongshuRag("浙江省考面试经验怎么准备"), true);
  assert.equal(shouldRouteToXiaohongshuRag("今天帮我做一个学习计划"), false);
});

test("buildXiaohongshuRagQuery falls back when message is empty", () => {
  assert.equal(buildXiaohongshuRagQuery(""), "浙江省考 备考经验");
  assert.equal(buildXiaohongshuRagQuery(" 杭州事业单位考试如何选岗 "), "杭州事业单位考试如何选岗");
});

test("formatXiaohongshuRagContext builds readable context and sources", () => {
  const formatted = formatXiaohongshuRagContext([
    {
      content: "岗位选择时先看招录人数，再看往年进面分。",
      metadata: {
        title: "杭州考公选岗经验",
        author: "上岸学姐",
        post_id: "abc123",
        source_url: "https://example.com/post/abc123",
      },
    },
  ]);

  assert.match(formatted.ragContext, /参考经验 1/);
  assert.match(formatted.ragContext, /岗位选择时先看招录人数/);
  assert.deepEqual(formatted.sourceNotes, [
    "标题：杭州考公选岗经验",
    "作者：上岸学姐",
    "帖子ID：abc123",
    "来源：https://example.com/post/abc123",
  ]);
});

test("resolveXiaohongshuKnowledge returns empty context when rag misses", () => {
  const routed = resolveXiaohongshuKnowledge("杭州考公怎么选岗", {
    success: false,
    error: "network error",
  });

  assert.equal(routed.shouldUseRag, true);
  assert.equal(routed.ragContext, "");
  assert.deepEqual(routed.ragResults, []);
});

test("resolveXiaohongshuKnowledge keeps local results when rag hits", () => {
  const routed = resolveXiaohongshuKnowledge("浙江省考面试经验有哪些", {
    success: true,
    data: {
      results: [
        {
          content: "面试前一周重点做结构化答题框架整理。",
          metadata: {
            title: "浙江省考面试经验",
            author: "岸上同学",
          },
        },
      ],
    },
  });

  assert.equal(routed.shouldUseRag, true);
  assert.equal(routed.ragResults.length, 1);
  assert.match(routed.ragContext, /结构化答题框架/);
  assert.deepEqual(routed.sourceNotes, ["标题：浙江省考面试经验", "作者：岸上同学"]);
});

test("buildGeneralAnswerPrompt injects local xiaohongshu knowledge and sources", () => {
  const prompt = buildGeneralAnswerPrompt("杭州考公报班怎么选", {
    shouldUseRag: true,
    ragQuery: "杭州考公报班怎么选",
    ragContext: "参考经验 1：\n优先看机构是否提供岗位匹配服务。",
    ragResults: [],
    sourceNotes: ["标题：杭州考公报班避坑", "帖子ID：post_1"],
  });

  assert.match(prompt, /优先基于以下本地整理的小红书经验内容回答/);
  assert.match(prompt, /用户问题：杭州考公报班怎么选/);
  assert.match(prompt, /标题：杭州考公报班避坑/);
  assert.match(prompt, /不要假装实时搜索/);
});

test("buildGeneralAnswerPrompt falls back to plain message when no knowledge exists", () => {
  assert.equal(
    buildGeneralAnswerPrompt("普通闲聊问题", {
      shouldUseRag: false,
      ragQuery: "普通闲聊问题",
      ragContext: "",
      ragResults: [],
      sourceNotes: [],
    }),
    "普通闲聊问题"
  );
});
