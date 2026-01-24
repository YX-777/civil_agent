/**
 * 情感检测中间件
 * 检测用户消息中的情绪
 */

import { EmotionKeyword } from "@civil-agent/core";
import { logger } from "@civil-agent/core";

export interface EmotionDetectionResult {
  emotion: string;
  intensity: number;
  triggers: string[];
  confidence: number;
}

/**
 * 情感检测器
 */
export class EmotionDetector {
  private emotionKeywords: Map<string, string[]>;

  constructor() {
    this.emotionKeywords = new Map([
      [
        "焦虑",
        [
          "焦虑",
          "担心",
          "紧张",
          "不安",
          "害怕",
          "恐惧",
          "忧虑",
          "恐慌",
          "压力",
          "压抑",
        ],
      ],
      [
        "挫败",
        [
          "挫败",
          "失败",
          "失望",
          "沮丧",
          "失落",
          "灰心",
          "气馁",
          "绝望",
          "崩溃",
          "崩溃",
        ],
      ],
      [
        "迷茫",
        [
          "迷茫",
          "困惑",
          "不解",
          "疑惑",
          "糊涂",
          "不知道",
          "不清楚",
          "不明白",
          "搞不懂",
          "想不通",
        ],
      ],
      [
        "疲惫",
        [
          "疲惫",
          "累",
          "疲倦",
          "困倦",
          "乏力",
          "精疲力竭",
          "力不从心",
          "筋疲力尽",
          "累垮",
          "累死",
        ],
      ],
      [
        "兴奋",
        [
          "兴奋",
          "激动",
          "开心",
          "高兴",
          "快乐",
          "喜悦",
          "欣喜",
          "愉快",
          "满足",
          "满意",
        ],
      ],
      [
        "积极",
        [
          "积极",
          "主动",
          "热情",
          "充满信心",
          "信心满满",
          "有信心",
          "相信",
          "肯定",
          "一定",
          "加油",
        ],
      ],
      [
        "自信",
        [
          "自信",
          "有把握",
          "有信心",
          "相信",
          "肯定",
          "没问题",
          "没问题",
          "能行",
          "可以",
          "一定行",
        ],
      ],
      [
        "期待",
        [
          "期待",
          "盼望",
          "希望",
          "渴望",
          "憧憬",
          "向往",
          "梦想",
          "愿望",
          "想要",
          "希望",
        ],
      ],
    ]);
  }

  /**
   * 检测情绪
   */
  detectEmotion(message: string): EmotionDetectionResult {
    const result: EmotionDetectionResult = {
      emotion: "neutral",
      intensity: 0,
      triggers: [],
      confidence: 0,
    };

    let maxIntensity = 0;
    let maxEmotion = "neutral";
    const allTriggers: string[] = [];

    for (const [emotion, keywords] of this.emotionKeywords) {
      const triggers = keywords.filter((keyword) => message.includes(keyword));
      if (triggers.length > 0) {
        const intensity = Math.min(triggers.length * 2, 10);
        if (intensity > maxIntensity) {
          maxIntensity = intensity;
          maxEmotion = emotion;
        }
        allTriggers.push(...triggers);
      }
    }

    if (maxIntensity > 0) {
      result.emotion = maxEmotion;
      result.intensity = maxIntensity;
      result.triggers = allTriggers;
      result.confidence = Math.min(maxIntensity / 10 + 0.3, 1);
    }

    logger.info(`Emotion detected: ${result.emotion} (intensity: ${result.intensity})`);

    return result;
  }

  /**
   * 判断是否需要情感支持
   */
  needsEmotionSupport(message: string): boolean {
    const result = this.detectEmotion(message);
    const negativeEmotions = ["焦虑", "挫败", "迷茫", "疲惫"];
    return (
      negativeEmotions.includes(result.emotion) && result.intensity >= 3
    );
  }

  /**
   * 获取情绪标签
   */
  getEmotionLabel(emotion: string): string {
    const labels: Record<string, string> = {
      焦虑: "😰 焦虑",
      挫败: "😞 挫败",
      迷茫: "😕 迷茫",
      疲惫: "😴 疲惫",
      兴奋: "🎉 兴奋",
      积极: "💪 积极",
      自信: "😊 自信",
      期待: "🌟 期待",
      neutral: "😐 平静",
    };
    return labels[emotion] || labels.neutral;
  }

  /**
   * 获取情绪描述
   */
  getEmotionDescription(emotion: string, intensity: number): string {
    const descriptions: Record<string, string[]> = {
      焦虑: [
        "有点紧张",
        "感到焦虑",
        "非常焦虑",
        "极度焦虑",
      ],
      挫败: [
        "有点失落",
        "感到挫败",
        "非常挫败",
        "极度挫败",
      ],
      迷茫: [
        "有点困惑",
        "感到迷茫",
        "非常迷茫",
        "极度迷茫",
      ],
      疲惫: [
        "有点累",
        "感到疲惫",
        "非常疲惫",
        "极度疲惫",
      ],
      兴奋: [
        "有点兴奋",
        "感到兴奋",
        "非常兴奋",
        "极度兴奋",
      ],
      积极: [
        "有点积极",
        "感到积极",
        "非常积极",
        "极度积极",
      ],
      自信: [
        "有点自信",
        "感到自信",
        "非常自信",
        "极度自信",
      ],
      期待: [
        "有点期待",
        "感到期待",
        "非常期待",
        "极度期待",
      ],
      neutral: [
        "平静",
        "平静",
        "平静",
        "平静",
      ],
    };

    const level = Math.min(Math.floor((intensity - 1) / 3), 3);
    return descriptions[emotion]?.[level] || descriptions.neutral[0];
  }
}

/**
 * 单例情感检测器
 */
let emotionDetectorInstance: EmotionDetector | null = null;

export function getEmotionDetector(): EmotionDetector {
  if (!emotionDetectorInstance) {
    emotionDetectorInstance = new EmotionDetector();
  }
  return emotionDetectorInstance;
}