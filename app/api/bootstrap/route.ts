import { NextResponse } from "next/server";
import { aiConfiguration } from "@/lib/ai/provider";
import { lessonSchema } from "@/lib/generative/domain";
import { readPlan } from "@/lib/adventure/plan";
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
    const generativeEnabled = process.env.GENERATIVE_UI_ENABLED === "true";
    const [generativeResume, generativeCompleted, generativeSeen] =
      generativeEnabled
        ? await Promise.all([
            db.generativeLessonRecord.findFirst({
              where: {
                childId: profile.id,
                completedAt: null,
                language: { in: profile.enabledLanguages },
              },
              orderBy: { createdAt: "desc" },
              include: { results: { select: { id: true } } },
            }),
            db.generativeLessonRecord.count({
              where: { childId: profile.id, completedAt: { not: null } },
            }),
            db.generativeActivityResult.count({
              where: { lesson: { childId: profile.id } },
            }),
          ])
        : ([null, 0, 0] as const);
    const parsedGenerative = lessonSchema.safeParse(generativeResume?.lesson);
    const approvedIds = new Set(
      concepts
        .filter(
          (c) =>
            c.active &&
            c.translations.some(
              (t) => t.language === generativeResume?.language,
            ),
        )
        .map((c) => c.id),
    );
    const nextGenerativeIndex = parsedGenerative.success
      ? parsedGenerative.data.activities.findIndex(
          (a) => !generativeResume?.results.some((r) => r.id === a.activityId),
        )
      : -1;
    const resumeGenerativeLesson =
      generativeResume &&
      parsedGenerative.success &&
      parsedGenerative.data.activities.every((a) =>
        [
          a.wordId,
          ...("choices" in a ? a.choices : "wordIds" in a ? a.wordIds : []),
        ].every((id) => approvedIds.has(id)),
      )
        ? {
            lesson: parsedGenerative.data,
            language: generativeResume.language,
            resumeIndex:
              nextGenerativeIndex < 0
                ? parsedGenerative.data.activities.length - 1
                : nextGenerativeIndex,
          }
        : null;
    const adventurePlan = resume?.adventurePlan
      ? readPlan(resume.adventurePlan, resume.cards, concepts)
      : null;
    const usable =
      (!resume?.adventurePlan || !!adventurePlan) &&
      resume?.cards.length &&
      profile.enabledLanguages.includes(resume.language) &&
      resume.cards.every((card) =>
        concepts.some((c) => c.id === card.conceptId && c.active),
      );
    return NextResponse.json(
      {
        generativeUIEnabled: generativeEnabled,
        resumeGenerativeLesson,
        profile,
        categories,
        concepts,
        vocabulary,
        demo: false,
        ai: aiConfiguration(),
        account: { name: user.name, email: user.email, role: user.role },
        security: { configured: true, legacyPinRequired: false },
        progressSummary: {
          sessionsCompleted: completed + generativeCompleted,
          cardsSeen: cardsSeen + generativeSeen,
        },
        resumeSession: usable
          ? {
              id: resume.id,
              adventurePlan,
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
