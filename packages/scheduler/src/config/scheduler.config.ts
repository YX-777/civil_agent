/**
 * 调度器配置
 */

import dotenv from "dotenv";

dotenv.config();

import { logger } from "@civil-agent/core";

export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
}

export interface QueueConfig {
  connection: RedisConfig;
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: "exponential";
      delay: number;
    };
    removeOnComplete: boolean;
    removeOnFail: boolean;
  };
}

export interface SchedulerConfig {
  enabled: boolean;
  timezone: string;
  queue: QueueConfig;
  pushService: {
    key: string;
    url: string;
  };
}

const DEFAULT_CONFIG: SchedulerConfig = {
  enabled: process.env.SCHEDULER_ENABLED === "true" || true,
  timezone: process.env.SCHEDULER_TIMEZONE || "Asia/Shanghai",
  queue: {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      db: parseInt(process.env.REDIS_DB || "0", 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    },
  },
  pushService: {
    key: process.env.PUSH_SERVICE_KEY || "",
    url: process.env.PUSH_SERVICE_URL || "",
  },
};

let cachedConfig: SchedulerConfig | null = null;

export function getSchedulerConfig(): SchedulerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = { ...DEFAULT_CONFIG };

  if (!config.queue.connection.host) {
    logger.warn("REDIS_HOST not configured, using localhost");
  }

  if (!config.pushService.key) {
    logger.warn("PUSH_SERVICE_KEY not configured, push notifications may not work");
  }

  cachedConfig = config;
  return config;
}

export function validateSchedulerConfig(config: SchedulerConfig): boolean {
  if (!config.queue.connection.host) {
    logger.error("REDIS_HOST is required");
    return false;
  }

  if (!config.queue.connection.port) {
    logger.error("REDIS_PORT is required");
    return false;
  }

  return true;
}