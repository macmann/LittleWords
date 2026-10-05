import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demoData } from "@/lib/db/demo";
import { apiError, hasDatabase } from "@/lib/db/http";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!hasDatabase()) return NextResponse.json(demoData());
  try {
    const profile = await db.childProfile.findUnique({
      where: { id: "demo-child" },
    });
    if (!profile)
      return NextResponse.json(
        {
          error:
            "Run npm run db:migrate and npm run db:seed to create your child profile.",
        },
        { status: 503 },
      );
    const [categories, concepts, vocabulary, credential, progress] =
      await Promise.all([
        db.category.findMany({ orderBy: { sortOrder: "asc" } }),
        db.concept.findMany({
          where: { OR: [{ childId: null }, { childId: profile.id }] },
          include: { translations: true },
          orderBy: { slug: "asc" },
        }),
        db.childVocabulary.findMany({ where: { childId: profile.id } }),
        db.parentCredential.findUnique({
          where: { id: "household" },
          select: { id: true },
        }),
        db.missionProgress.findMany({
          where: { childId: profile.id },
          include: {
            session: {
              select: {
                completedAt: true,
                cards: { select: { seenAt: true } },
              },
            },
          },
        }),
      ]);
    return NextResponse.json({
      profile,
      categories,
      concepts,
      vocabulary,
      demo: false,
      security: {
        configured: !!credential,
        legacyPinRequired: !credential && !!process.env.PARENT_PIN,
      },
      missionProgress: progress.map((p) => ({
        missionId: p.missionId,
        language: p.language,
        completedAt: p.completedAt,
        readyToConfirm:
          !!p.session?.completedAt &&
          p.session.cards.length > 0 &&
          p.session.cards.every((c) => !!c.seenAt),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
