import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDetailRefreshQueries,
  classifyDetailError,
  extractDetailContent,
  isDetailUnavailableText,
  isRetryableDetailError,
  selectRefreshFeedCandidate,
} from "./xiaohongshu-detail";

// 这组测试主要锁住两类回归：
// 1. 详情正文/评论的抽取规则被改坏
// 2. 失败分类或补救候选匹配被改坏

test("extractDetailContent extracts body and comment snippets from nested detail payload", () => {
  const content = extractDetailContent({
    noteCard: {
      desc: "杭州考公选岗时，先看招录人数和历年进面分。",
    },
    comments: [
      { content: "这条经验很实用，尤其是看进面分那段。" },
      { text: "还要结合岗位限制条件一起看。" },
    ],
  });

  assert.match(content, /正文：/);
  assert.match(content, /杭州考公选岗时/);
  assert.match(content, /评论摘录：/);
  assert.match(content, /进面分/);
  assert.match(content, /岗位限制条件/);
});

test("extractDetailContent supports alternate detail shapes", () => {
  const content = extractDetailContent({
    data: {
      note: {
        content: "浙江省考面试前一周，重点整理结构化答题模板。",
      },
      commentList: [{ text: "模板整理后答题稳定很多。" }],
    },
  });

  assert.match(content, /浙江省考面试前一周/);
  assert.match(content, /模板整理后答题稳定很多/);
});

test("isDetailUnavailableText detects inaccessible page prompt", () => {
  assert.equal(isDetailUnavailableText("Sorry, This Page Isn't Available Right Now"), true);
  assert.equal(isDetailUnavailableText("正常正文内容"), false);
});

test("classifyDetailError distinguishes detail failure categories", () => {
  assert.equal(classifyDetailError("Xiaohongshu MCP is not logged in"), "login_required");
  assert.equal(classifyDetailError("missing required field: xsec_token"), "invalid_param");
  assert.equal(
    classifyDetailError("获取Feed详情失败: feed 69bcfbaf000000001f005b74 not found in noteDetailMap"),
    "lookup_miss"
  );
  assert.equal(classifyDetailError("detail page unavailable from get_feed_detail"), "access_denied");
  assert.equal(classifyDetailError("navigation timeout of 30000 ms exceeded"), "transient");
  assert.equal(classifyDetailError("detail content empty or inaccessible from get_feed_detail"), "parse_empty");
});

test("isRetryableDetailError only retries transient and parse-empty cases", () => {
  assert.equal(isRetryableDetailError("fetch failed due to timeout"), true);
  assert.equal(isRetryableDetailError("detail content empty or inaccessible from get_feed_detail"), true);
  assert.equal(isRetryableDetailError("feed 69 not found in noteDetailMap"), true);
  assert.equal(isRetryableDetailError("missing required field: feed_id"), false);
  assert.equal(isRetryableDetailError("detail page unavailable from get_feed_detail"), false);
});

test("buildDetailRefreshQueries prefers title and keyword without duplicates", () => {
  assert.deepEqual(
    buildDetailRefreshQueries({
      title: "浙江省考140+上岸杭州（超真诚经验贴）",
      noteCard: {
        displayTitle: "浙江省考140+上岸杭州（超真诚经验贴）",
      },
      _keyword: "浙江省考",
    }),
    ["浙江省考140+上岸杭州（超真诚经验贴）", "浙江省考"]
  );
});

test("selectRefreshFeedCandidate matches by id first and then by title", () => {
  const original = {
    id: "post_1",
    title: "浙江地区公务员上岸难度(考情分析汇总)",
  };

  const matchedByTitle = selectRefreshFeedCandidate(original, [
    { id: "post_2", noteCard: { displayTitle: "别的帖子" } },
    { id: "post_3", noteCard: { displayTitle: "浙江地区公务员上岸难度(考情分析汇总)" } },
  ]);

  assert.equal(matchedByTitle?.id, "post_3");

  const matchedById = selectRefreshFeedCandidate(original, [
    { id: "post_1", noteCard: { displayTitle: "标题被改短了" } },
  ]);

  assert.equal(matchedById?.id, "post_1");
});
