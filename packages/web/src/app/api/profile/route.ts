import { NextRequest, NextResponse } from "next/server";
import { getStatsService, getUserRepository } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

function serializeProfile(profile: {
  nickname: string;
  targetScore: number;
  examDate: Date | null;
  totalStudyDays: number;
}) {
  return {
    nickname: profile.nickname,
    targetScore: profile.targetScore,
    examDate: profile.examDate ? profile.examDate.toISOString() : null,
    totalStudyDays: profile.totalStudyDays,
  };
}

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    const userRepo = getUserRepository();
    await userRepo.findOrCreateUser(userId);

    const [profile, statsSummary] = await Promise.all([
      userRepo.getUserProfile(userId),
      getStatsService().getStatsSummary(userId, "all"),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.totalStudyDays !== (statsSummary.studyDays ?? profile.totalStudyDays)) {
      await userRepo.updateStudyDays(userId, statsSummary.studyDays ?? profile.totalStudyDays);
      profile.totalStudyDays = statsSummary.studyDays ?? profile.totalStudyDays;
    }

    // 个人资料表中的 totalStudyDays 可能落后于真实学习记录，
    // 读取接口优先返回统计结果中的学习天数，让页面展示与 dashboard 保持一致。
    return NextResponse.json({
      success: true,
      profile: {
        ...serializeProfile(profile),
        totalStudyDays: statsSummary.studyDays ?? profile.totalStudyDays,
      },
      summary: statsSummary,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getDatabase();

    const body = await request.json();
    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : DEFAULT_USER_ID;
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
    const targetScore = typeof body?.targetScore === "number" ? body.targetScore : Number(body?.targetScore);
    const examDateRaw = typeof body?.examDate === "string" ? body.examDate.trim() : "";

    if (!nickname) {
      return NextResponse.json({ error: "nickname is required" }, { status: 400 });
    }

    if (!Number.isFinite(targetScore) || targetScore <= 0) {
      return NextResponse.json({ error: "targetScore must be a positive number" }, { status: 400 });
    }

    const userRepo = getUserRepository();
    await userRepo.findOrCreateUser(userId);

    const updatedProfile = await userRepo.updateUserProfile(userId, {
      nickname,
      targetScore,
      examDate: examDateRaw ? new Date(examDateRaw) : null,
    });

    const statsSummary = await getStatsService().getStatsSummary(userId, "all");

    if (updatedProfile.totalStudyDays !== (statsSummary.studyDays ?? updatedProfile.totalStudyDays)) {
      await userRepo.updateStudyDays(userId, statsSummary.studyDays ?? updatedProfile.totalStudyDays);
      updatedProfile.totalStudyDays = statsSummary.studyDays ?? updatedProfile.totalStudyDays;
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...serializeProfile(updatedProfile),
        totalStudyDays: statsSummary.studyDays ?? updatedProfile.totalStudyDays,
      },
      summary: statsSummary,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
