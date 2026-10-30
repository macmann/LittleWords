import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { protectParent } from "@/lib/parent-auth";
import { currentAgeMonths } from "@/lib/security/age";
import { db } from "@/lib/db";
import { apiError } from "@/lib/db/http";
import { privateHeaders } from "@/lib/security/account";
import { learningAccess } from "@/lib/generative/http";
import { learningContext } from "@/lib/generative/context";
import {
  configuredProvider,
  generateLearningExperience,
} from "@/lib/generative/service";
const input = z
  .object({
    language: z.enum(["EN", "MY", "DE"]),
    schemaVersion: z.literal("1.0").default("1.0"),
  })
  .strict();
export async function POST(req: NextRequest) {
  const access = await learningAccess(req);
  if (access.response) return access.response;
  const denied = await protectParent();
  if (denied) return denied;
  try {
    const { language } = input.parse(await req.json()),
      child = access.child!;
    if (!child.enabledLanguages.includes(language))
      return NextResponse.json(
        { error: "Choose an enabled language." },
        { status: 400 },
      );
    const context = await learningContext(
      child.id,
      language,
      Math.min(12, child.cardsPerSession),
      child.primaryLanguage,
      child.enabledLanguages,
      currentAgeMonths(child.ageMonths, child.ageRecordedAt) == null
        ? undefined
        : currentAgeMonths(child.ageMonths, child.ageRecordedAt)! / 12,
    );
    if (!context.vocabulary.length)
      return NextResponse.json(
        { error: "No approved words available." },
        { status: 404 },
      );
    // A persisted recent lesson also bounds AI calls across server instances.
    const recent = await db.generativeLessonRecord.findFirst({
      where: {
        childId: child.id,
        language,
        createdAt: { gte: new Date(Date.now() - 60000) },
        completedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent)
      return NextResponse.json(recent.lesson, { headers: privateHeaders });
    const { lesson, source } = await generateLearningExperience(
      context,
      randomUUID(),
      child.aiPlanningEnabled ? configuredProvider() : undefined,
    );
    await db.generativeLessonRecord.create({
      data: {
        id: lesson.lessonId,
        childId: child.id,
        language,
        lesson,
        source,
      },
    });
    return NextResponse.json(lesson, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
