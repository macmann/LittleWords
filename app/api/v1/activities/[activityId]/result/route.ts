import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/db/http";
import { privateHeaders } from "@/lib/security/account";
import { learningAccess } from "@/lib/generative/http";
import { evaluateActivity, lessonSchema } from "@/lib/generative/domain";
import { emit } from "@/lib/generative/service";
const input = z
  .object({
    lessonId: z.string().max(100),
    selectedIds: z.array(z.string().max(100)).max(3),
    responseTime: z.number().int().min(0).max(3600000),
  })
  .strict();
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const access = await learningAccess(req);
  if (access.response) return access.response;
  try {
    const body = input.parse(await req.json()),
      { activityId } = await params;
    const record = await db.generativeLessonRecord.findFirst({
      where: { id: body.lessonId, childId: access.child!.id },
    });
    if (!record)
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const lesson = lessonSchema.parse(record.lesson),
      activity = lesson.activities.find((a) => a.activityId === activityId);
    if (!activity)
      return NextResponse.json(
        { error: "Activity not found." },
        { status: 404 },
      );
    const existing = await db.generativeActivityResult.findUnique({
      where: { id: activityId },
    });
    if (existing)
      return NextResponse.json(
        { ok: true, correct: existing.correct },
        { headers: privateHeaders },
      );
    if (record.completedAt)
      return NextResponse.json(
        { error: "Lesson already completed." },
        { status: 409 },
      );
    const previousIds = lesson.activities
      .slice(0, lesson.activities.indexOf(activity))
      .map((a) => a.activityId);
    const previous = await db.generativeActivityResult.count({
      where: { lessonId: record.id, id: { in: previousIds } },
    });
    if (previous !== previousIds.length)
      return NextResponse.json(
        { error: "Finish the previous activity first." },
        { status: 409 },
      );
    let correct: boolean | null;
    try {
      correct = evaluateActivity(activity, body.selectedIds);
    } catch {
      return NextResponse.json(
        { error: "Invalid activity answer." },
        { status: 400 },
      );
    }
    const result = await db.generativeActivityResult.upsert({
      where: { id: activityId },
      create: {
        id: activityId,
        lessonId: record.id,
        wordId: activity.wordId,
        correct,
        responseTime: body.responseTime,
        selectedIds: body.selectedIds,
      },
      update: {},
    });
    emit({
      event: "activity_completed",
      lessonId: record.id,
      activityId,
      wordId: activity.wordId,
      responseTime: result.responseTime,
    });
    if (result.correct !== null)
      emit({
        event: result.correct ? "activity_correct" : "activity_incorrect",
        lessonId: record.id,
        activityId,
        wordId: activity.wordId,
        correctness: result.correct,
      });
    return NextResponse.json(
      { ok: true, correct: result.correct },
      { headers: privateHeaders },
    );
  } catch (e) {
    return apiError(e);
  }
}
