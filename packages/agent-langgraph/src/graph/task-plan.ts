import { LEARNING_MODULES } from "@tech-mate/core";

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
    // 1) 冒号形式："模块：React" / "**技术栈**：xxx" / "- **🎯 技术栈** ：xxx"
    //    关键：label 和冒号之间允许 markdown 强调符号（**、*、~、`）和空白，
    //    否则 bullet 列表 prompt 输出的 "- **🎯 技术栈**：AI应用开发" 会 miss
    //    导致 pendingTaskPlan 丢失，进而让 "确认计划" 快捷回复走错分支
    const colonRe = new RegExp(`${label}[\\s*_~\`]*[：:]\\s*(.+)`, "i");
    const colonMatch = planText.match(colonRe);
    if (colonMatch?.[1]) {
      // 兼容老表格遗留：右侧含 `|` 时只取第一段
      return colonMatch[1].trim().replace(/\s*\|.*$/, "").replace(/\*+$/, "").trim();
    }
    // 2) markdown 表格形式（legacy 兼容）："| 🎯 模块 | React开发 |" 或 "|模块|React|"
    //    label 前后允许 emoji + 空格 + 其它修饰；只关心 label 和它右边那一格
    const tableRe = new RegExp(`\\|[^|\\n]*?${label}[^|\\n]*?\\|([^|\\n]+)\\|`, "i");
    const tableMatch = planText.match(tableRe);
    if (tableMatch?.[1]) {
      return tableMatch[1].trim();
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

  // 实际 Agent 输出常见 label：技术栈 / 练习量 / 推荐理由
  // 同时兼容老版 prompt 里的"模块/题量"等
  const rawModule = extractLineValue(trimmedPlan, ["技术栈", "模块", "科目"]);
  const rawDifficulty = extractLineValue(trimmedPlan, ["难度"]);
  const rawQuestionCount = extractLineValue(trimmedPlan, ["题量", "任务量", "练习量"]);
  const rawPeriod = extractLineValue(trimmedPlan, ["周期", "时长", "预计周期"]);
  const reason = extractLineValue(trimmedPlan, ["推荐理由", "理由", "说明", "调整说明"]);

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
