import { db } from "@/lib/db";
import { pictureOptions } from "@/lib/adventure/picture-options";
import {
  lessonSchema,
  updateMastery,
  type ChildLearningContext,
} from "./domain";
import type { Language } from "@/types";
export async function learningContext(
  childId: string,
  language: Language,
  count: number,
  primaryLanguage: string,
  learningLanguages: string[],
  age?: number,
): Promise<ChildLearningContext> {
  const [concepts, history, results] = await Promise.all([
    db.concept.findMany({
      where: {
        active: true,
        childId: null,
        translations: { some: { language } },
      },
      include: { translations: true },
      orderBy: { slug: "asc" },
    }),
    db.generativeLessonRecord.findMany({
      where: { childId, language },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.generativeActivityResult.findMany({
      include: { lesson: { select: { lesson: true } } },
      where: { lesson: { childId, language }, correct: { not: null } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const mastery: ChildLearningContext["mastery"] = {};
  for (const r of results) {
    const stored = lessonSchema.safeParse(r.lesson.lesson);
    const activity = stored.success
      ? stored.data.activities.find((a) => a.activityId === r.id)
      : undefined;
    if (activity && "wordIds" in activity && Array.isArray(r.selectedIds)) {
      const selected = r.selectedIds;
      activity.wordIds.forEach((wordId, i) => {
        mastery[wordId] = updateMastery(
          mastery[wordId],
          wordId,
          selected[i] === wordId,
          r.responseTime,
          r.createdAt.toISOString(),
        );
      });
    } else
      mastery[r.wordId] = updateMastery(
        mastery[r.wordId],
        r.wordId,
        r.correct!,
        r.responseTime,
        r.createdAt.toISOString(),
      );
  }
  // Limit provider context to approved public content. Include weakest words first.
  const pool = [...concepts]
    .sort(
      (a, b) =>
        (mastery[a.id]?.masteryScore ?? 0) - (mastery[b.id]?.masteryScore ?? 0),
    )
    .slice(0, 24);
  return {
    vocabulary: pool.map((c) => ({
      wordId: c.id,
      choiceIds: pictureOptions(c, pool).map((v) => v.id),
    })),
    mastery: Object.fromEntries(
      pool.filter((c) => mastery[c.id]).map((c) => [c.id, mastery[c.id]]),
    ),
    recentHistory: history.flatMap((h) => {
      const p = lessonSchema.safeParse(h.lesson);
      return p.success ? [p.data] : [];
    }),
    language,
    primaryLanguage,
    learningLanguages,
    age,
    count,
  };
}
