import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { learningAccess } from "@/lib/generative/http";
import { lessonSchema } from "@/lib/generative/domain";
import { emit } from "@/lib/generative/service";
import { apiError } from "@/lib/db/http";
import { privateHeaders } from "@/lib/security/account";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const access = await learningAccess(req);
  if (access.response) return access.response;
  try {
    const { lessonId } = await params;
    const record = await db.generativeLessonRecord.findFirst({
      where: { id: lessonId, childId: access.child!.id },
      include: { results: true },
    });
    if (!record)
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const lesson = lessonSchema.parse(record.lesson);
    if (
      lesson.activities.some(
        (a) => !record.results.some((r) => r.id === a.activityId),
      )
    )
      return NextResponse.json(
        { error: "Finish the activities first." },
        { status: 409 },
      );
    const changed = await db.generativeLessonRecord.updateMany({
      where: { id: lessonId, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (changed.count) emit({ event: "lesson_completed", lessonId });
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
