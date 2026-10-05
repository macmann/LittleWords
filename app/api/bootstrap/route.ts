import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/db/http";
import { accountContext, privateHeaders } from "@/lib/security/account";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const context = await accountContext();
    if (context.response) return context.response;
    const { child: profile, user } = context.account;
    const [
      categories,
      concepts,
      vocabulary,
      progress,
      completed,
      cardsSeen,
      resume,
    ] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.concept.findMany({
        where: { OR: [{ childId: null }, { childId: profile.id }] },
        include: { translations: true },
        orderBy: { slug: "asc" },
      }),
      db.childVocabulary.findMany({ where: { childId: profile.id } }),
      db.missionProgress.findMany({
        where: { childId: profile.id },
        include: {
          session: {
            select: { completedAt: true, cards: { select: { seenAt: true } } },
          },
        },
      }),
      db.learningSession.count({
        where: { childId: profile.id, completedAt: { not: null } },
      }),
      db.sessionCard.count({
        where: { session: { childId: profile.id }, seenAt: { not: null } },
      }),
      db.learningSession.findFirst({
        where: { childId: profile.id, completedAt: null, missionId: null },
        orderBy: { startedAt: "desc" },
        include: { cards: { orderBy: { sequence: "asc" } } },
      }),
    ]);
    const usable =
      resume?.cards.length &&
      profile.enabledLanguages.includes(resume.language) &&
      resume.cards.every((card) =>
        concepts.some((c) => c.id === card.conceptId && c.active),
      );
    return NextResponse.json(
      {
        profile,
        categories,
        concepts,
        vocabulary,
        demo: false,
        account: { name: user.name, email: user.email, role: user.role },
        security: { configured: true, legacyPinRequired: false },
        progressSummary: { sessionsCompleted: completed, cardsSeen },
        resumeSession: usable
          ? {
              id: resume.id,
              language: resume.language,
              cards: resume.cards.map(
                ({ conceptId, levelShown, sequence }) => ({
                  conceptId,
                  levelShown,
                  sequence,
                }),
              ),
              resumeSequence:
                resume.cards.find((c) => !c.seenAt)?.sequence ??
                resume.cards.length - 1,
            }
          : null,
        missionProgress: progress.map((p) => ({
          missionId: p.missionId,
          language: p.language,
          completedAt: p.completedAt,
          readyToConfirm:
            !!p.session?.completedAt &&
            p.session.cards.length > 0 &&
            p.session.cards.every((c) => !!c.seenAt),
        })),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return apiError(e);
  }
}
