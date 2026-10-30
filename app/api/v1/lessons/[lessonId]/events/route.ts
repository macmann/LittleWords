import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { learningAccess } from "@/lib/generative/http";
import { lessonSchema } from "@/lib/generative/domain";
import { emit } from "@/lib/generative/service";
import { apiError } from "@/lib/db/http";
import { privateHeaders } from "@/lib/security/account";
const schema = z
  .object({
    event: z.enum(["activity_started", "reward_shown"]),
    activityId: z.string().max(100).optional(),
  })
  .strict();
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const access = await learningAccess(req);
  if (access.response) return access.response;
  try {
    const body = schema.parse(await req.json()),
      { lessonId } = await params;
    const record = await db.generativeLessonRecord.findFirst({
      where: { id: lessonId, childId: access.child!.id },
    });
    if (!record)
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const lesson = lessonSchema.parse(record.lesson),
      activity = lesson.activities.find(
        (a) => a.activityId === body.activityId,
      );
    if (
      (body.event === "activity_started" &&
        (!activity || record.completedAt)) ||
      (body.event === "reward_shown" && !record.completedAt)
    )
      return NextResponse.json(
        { error: "Invalid learning event." },
        { status: 400 },
      );
    emit({
      event: body.event,
      lessonId,
      activityId: activity?.activityId,
      wordId: activity?.wordId,
    });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
