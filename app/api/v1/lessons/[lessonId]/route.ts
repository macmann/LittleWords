import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { privateHeaders } from "@/lib/security/account";
import { learningAccess } from "@/lib/generative/http";
import { lessonSchema } from "@/lib/generative/domain";
import { apiError } from "@/lib/db/http";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const access = await learningAccess(req, false);
  if (access.response) return access.response;
  try {
    const { lessonId } = await params;
    const record = await db.generativeLessonRecord.findFirst({
      where: { id: lessonId, childId: access.child!.id },
    });
    if (!record)
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const parsed = lessonSchema.safeParse(record.lesson);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Unsupported lesson version." },
        { status: 409 },
      );
    return NextResponse.json(parsed.data, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
