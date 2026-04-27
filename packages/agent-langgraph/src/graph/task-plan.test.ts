import test from "node:test";
import assert from "node:assert/strict";
import { parseTaskPlanFromText } from "./task-plan";

test("parseTaskPlanFromText should extract module and counts from formatted plan", () => {
  const parsed = parseTaskPlanFromText(`模块：数量关系
题量：每天 20 题
难度：中等
周期：预计 5 天完成
理由：先集中突破薄弱模块`);

  assert.ok(parsed);
  assert.equal(parsed.module, "数量关系");
  assert.equal(parsed.dailyQuestionCount, 20);
  assert.equal(parsed.periodDays, 5);
  assert.equal(parsed.difficulty, "medium");
  assert.equal(parsed.title, "数量关系20题5天计划");
});

test("parseTaskPlanFromText should normalize easy and hard difficulty labels", () => {
  const easy = parseTaskPlanFromText(`模块：资料分析
题量：每天 10 题
难度：基础
周期：预计 3 天完成`);
  const hard = parseTaskPlanFromText(`模块：判断推理
题量：每天 30 题
难度：困难
周期：预计 7 天完成`);

  assert.equal(easy?.difficulty, "easy");
  assert.equal(hard?.difficulty, "hard");
});

test("parseTaskPlanFromText should return null when no stable task fields exist", () => {
  const parsed = parseTaskPlanFromText("这周继续保持学习节奏，按部就班推进。");
  assert.equal(parsed, null);
});
