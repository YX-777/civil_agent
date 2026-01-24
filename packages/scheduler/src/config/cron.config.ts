/**
 * Cron 配置
 */

export interface CronJobConfig {
  name: string;
  expression: string;
  description: string;
  concurrency: number;
}

export const CRON_JOBS: CronJobConfig[] = [
  {
    name: "morning-greeting",
    expression: "0 8 * * *",
    description: "早安问候 - 每天 8:00",
    concurrency: 10,
  },
  {
    name: "evening-review",
    expression: "0 22 * * *",
    description: "晚间复盘 - 每天 22:00",
    concurrency: 10,
  },
  {
    name: "anomaly-check",
    expression: "59 23 * * *",
    description: "异常检测 - 每天 23:59",
    concurrency: 5,
  },
];

export function getCronJobConfig(name: string): CronJobConfig | undefined {
  return CRON_JOBS.find((job) => job.name === name);
}

export function getAllCronJobs(): CronJobConfig[] {
  return CRON_JOBS;
}