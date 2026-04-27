import { LEARNING_MODULES } from "@civil-agent/core";

export interface ParsedTaskPlan {
  title: string;
  description: string;
  module: string | null;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  dailyQuestionCount: number | null;
  periodDays: number | null;
  reason?: string | null;
  rawPlan: string;
}

function extractLineValue(planText: string, labels: string[]): string | null {
  for (const label of labels) {
    const regex = new RegExp(`${label}[：:]\\s*(.+)`, "i");
    const match = planText.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function normalizeModule(rawModule: string | null): string | null {
  if (!rawModule) return null;
  const matched = LEARNING_MODULES.find((item) => rawModule.includes(item));
  return matched ?? rawModule;
}

function normalizeDifficulty(rawDifficulty: string | null): "easy" | "medium" | "hard" {
  if (!rawDifficulty) return "medium";
  if (/(困难|hard|高难|拔高)/i.test(rawDifficulty)) {
    return "hard";
  }
  if (/(简单|easy|基础|入门)/i.test(rawDifficulty)) {
    return "easy";
  }
  return "medium";
}

function extractFirstInteger(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function inferEstimatedMinutes(dailyQuestionCount: number | null): number {
  if (!dailyQuestionCount || dailyQuestionCount <= 0) {
    return 60;
  }
  // MVP 阶段用一个保守估算：每题约 3 分钟，且给最小/最大边界，
  // 这样既能覆盖客观题练习，也不会让模型随口给出的题量把时长拉得过离谱。
  return Math.min(240, Math.max(30, dailyQuestionCount * 3));
}

function buildTaskTitle(module: string | null, dailyQuestionCount: number | null, periodDays: number | null): string {
  const moduleLabel = module ?? "综合练习";
  const questionPart = dailyQuestionCount ? `${dailyQuestionCount}题` : "专项任务";
  const periodPart = periodDays ? `${periodDays}天计划` : "阶段计划";
  return `${moduleLabel}${questionPart}${periodPart}`;
}

export function parseTaskPlanFromText(planText: string): ParsedTaskPlan | null {
  const trimmedPlan = planText.trim();
  if (!trimmedPlan) return null;

  const rawModule = extractLineValue(trimmedPlan, ["模块", "科目"]);
  const rawDifficulty = extractLineValue(trimmedPlan, ["难度"]);
  const rawQuestionCount = extractLineValue(trimmedPlan, ["题量", "任务量"]);
  const rawPeriod = extractLineValue(trimmedPlan, ["周期", "时长"]);
  const reason = extractLineValue(trimmedPlan, ["理由", "说明", "调整说明"]);

  const module = normalizeModule(rawModule);
  const dailyQuestionCount = extractFirstInteger(rawQuestionCount);
  const periodDays = extractFirstInteger(rawPeriod);
  const difficulty = normalizeDifficulty(rawDifficulty);
  const estimatedMinutes = inferEstimatedMinutes(dailyQuestionCount);

  // 至少要拿到“模块 / 题量 / 周期”中的任意一项，否则这份计划无法稳定落到真实任务里。
  if (!module && !dailyQuestionCount && !periodDays) {
    return null;
  }

  const title = buildTaskTitle(module, dailyQuestionCount, periodDays);
  const descriptionParts = [
    `Agent 生成的学习计划：${title}`,
    rawQuestionCount ? `建议题量：${rawQuestionCount}` : null,
    rawDifficulty ? `建议难度：${rawDifficulty}` : null,
    rawPeriod ? `计划周期：${rawPeriod}` : null,
    reason ? `安排理由：${reason}` : null,
    `原始计划：\n${trimmedPlan}`,
  ].filter(Boolean);

  return {
    title,
    description: descriptionParts.join("\n"),
    module,
    difficulty,
    estimatedMinutes,
    dailyQuestionCount,
    periodDays,
    reason,
    rawPlan: trimmedPlan,
  };
}
