import { z } from "zod";
export const themes = [
  "jungle",
  "ocean",
  "space",
  "farm",
  "vehicles",
  "dinosaurs",
  "city",
  "playground",
  "default",
] as const;
export const palettes = [
  "bright",
  "warm",
  "cool",
  "pastel",
  "high-contrast",
] as const;
export const rewards = [
  "stars",
  "balloons",
  "confetti",
  "rocket",
  "animal-cheer",
  "progress-badge",
] as const;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const base = {
  activityId: id,
  wordId: id,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
};
export const activitySchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("learn_card") }).strict(),
  z
    .object({
      ...base,
      type: z.literal("image_choice"),
      choices: z.array(id).min(2).max(4),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("listen_choice"),
      choices: z.array(id).min(2).max(4),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("match_pairs"),
      wordIds: z.array(id).min(2).max(3),
    })
    .strict(),
  z.object({ ...base, type: z.literal("speak_repeat") }).strict(),
  z
    .object({
      ...base,
      type: z.literal("drag_drop"),
      choices: z.array(id).min(2).max(4),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("story_scene"),
      choices: z.array(id).min(2).max(4),
    })
    .strict(),
]);
export const lessonSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    lessonId: id,
    source: z.enum(["AI", "fallback"]).optional(),
    theme: z.enum(themes),
    palette: z.enum(palettes),
    difficulty: base.difficulty,
    activities: z.array(activitySchema).min(1).max(12),
    reward: z.object({ type: z.enum(rewards) }).strict(),
  })
  .strict();
export type GenerativeLesson = z.infer<typeof lessonSchema>;
export type GenerativeActivity = z.infer<typeof activitySchema>;
export type WordMastery = {
  wordId: string;
  attempts: number;
  correct: number;
  incorrect: number;
  masteryScore: number;
  lastSeenAt: string;
  averageResponseTime?: number;
};
export type ChildLearningContext = {
  vocabulary: { wordId: string; choiceIds: string[] }[];
  mastery: Record<string, WordMastery>;
  recentHistory: GenerativeLesson[];
  language: string;
  primaryLanguage: string;
  learningLanguages: string[];
  age?: number;
  count: number;
};
export function updateMastery(
  previous: WordMastery | undefined,
  wordId: string,
  correct: boolean,
  responseTime: number,
  at: string,
): WordMastery {
  const attempts = (previous?.attempts ?? 0) + 1,
    successes = (previous?.correct ?? 0) + Number(correct);
  return {
    wordId,
    attempts,
    correct: successes,
    incorrect: attempts - successes,
    masteryScore: successes / attempts,
    lastSeenAt: at,
    averageResponseTime:
      ((previous?.averageResponseTime ?? 0) * (attempts - 1) + responseTime) /
      attempts,
  };
}
export function validateLesson(
  raw: unknown,
  context: ChildLearningContext,
): GenerativeLesson {
  const lesson = lessonSchema.parse(raw),
    pool = new Map(context.vocabulary.map((v) => [v.wordId, v]));
  if (lesson.activities.length !== Math.min(12, Math.max(1, context.count)))
    throw new Error("Unexpected length");
  if (
    new Set(lesson.activities.map((a) => a.activityId)).size !==
    lesson.activities.length
  )
    throw new Error("Duplicate activity");
  for (const a of lesson.activities) {
    const word = pool.get(a.wordId);
    if (!word) throw new Error("Unapproved vocabulary");
    if ("choices" in a) {
      if (
        !a.choices.includes(a.wordId) ||
        new Set(a.choices).size !== a.choices.length ||
        a.choices.length > a.difficulty + 1 ||
        a.choices.some((v) => v !== a.wordId && !word.choiceIds.includes(v))
      )
        throw new Error("Invalid choices");
    }
    if ("wordIds" in a && a.difficulty === 1)
      throw new Error("Pairs require measured familiarity");
    if (
      "wordIds" in a &&
      (!a.wordIds.includes(a.wordId) ||
        new Set(a.wordIds).size !== a.wordIds.length ||
        a.wordIds.some(
          (v) =>
            !pool.has(v) || (v !== a.wordId && !word.choiceIds.includes(v)),
        ))
    )
      throw new Error("Invalid pairs");
    if (a.difficulty > difficultyFor(context, a.wordId))
      throw new Error("Unsupported difficulty");
  }
  return lesson;
}
export function difficultyFor(
  context: ChildLearningContext,
  wordId: string,
): 1 | 2 | 3 {
  const m = context.mastery[wordId];
  if (!m || m.attempts < 3 || (context.age !== undefined && context.age < 4))
    return 1;
  return m.masteryScore >= 0.85 ? 3 : m.masteryScore >= 0.5 ? 2 : 1;
}
export function calculateNoveltyScore(
  candidate: GenerativeLesson,
  history: GenerativeLesson[],
) {
  if (!history.length) return 1;
  return (
    history.reduce(
      (sum, old) =>
        sum +
        Number(old.theme !== candidate.theme) +
        Number(old.palette !== candidate.palette) +
        Number(old.reward.type !== candidate.reward.type) +
        Number(
          old.activities.map((a) => a.type).join() !==
            candidate.activities.map((a) => a.type).join(),
        ),
      0,
    ) /
    (history.length * 4)
  );
}
export function generateLocalLesson(
  context: ChildLearningContext,
  lessonId = "local-lesson",
): GenerativeLesson {
  if (!context.vocabulary.length) throw new Error("No approved vocabulary");
  const history = context.recentHistory.slice(0, 5);
  const pick = <T extends string>(values: readonly T[], used: T[]) =>
    values.find((v) => !used.includes(v)) ??
    values[(history.length + 1) % values.length];
  const words = [...context.vocabulary].sort(
    (a, b) =>
      (context.mastery[a.wordId]?.masteryScore ?? 0) -
      (context.mastery[b.wordId]?.masteryScore ?? 0),
  );
  const previousChoice = history[0]?.activities.find(
    (a) => "choices" in a,
  )?.type;
  const variation = previousChoice === "listen_choice" ? 1 : 0;
  const activities: GenerativeActivity[] = Array.from(
    { length: Math.min(12, Math.max(1, context.count)) },
    (_, i) => {
      const word = words[Math.floor(i / 2) % words.length],
        difficulty = difficultyFor(context, word.wordId);
      const base = {
        activityId: `${lessonId}-${i}`,
        wordId: word.wordId,
        difficulty,
      };
      if (i === 0 && difficulty === 1) return { ...base, type: "learn_card" };
      if (word.choiceIds.length && i % 3 !== 0) {
        const choices = [word.wordId, ...word.choiceIds.slice(0, difficulty)];
        // Stable rotation prevents the target always occupying the first slot.
        const offset = (i + history.length) % choices.length;
        return {
          ...base,
          type:
            difficulty === 3
              ? "story_scene"
              : difficulty === 2 && i % 2 === 0
                ? "drag_drop"
                : (i + variation) % 2
                  ? "listen_choice"
                  : "image_choice",
          choices: [...choices.slice(offset), ...choices.slice(0, offset)],
        };
      }
      if (
        difficulty > 1 &&
        word.choiceIds.some((id) => words.some((w) => w.wordId === id))
      )
        return {
          ...base,
          type: "match_pairs",
          wordIds: [
            word.wordId,
            word.choiceIds.find((id) => words.some((w) => w.wordId === id))!,
          ],
        };
      return { ...base, type: i % 2 ? "speak_repeat" : "learn_card" };
    },
  );
  return validateLesson(
    {
      schemaVersion: "1.0",
      lessonId,
      source: "fallback",
      theme: pick(
        themes,
        history.map((h) => h.theme),
      ),
      palette: pick(
        palettes,
        history.map((h) => h.palette),
      ),
      difficulty: Math.max(...activities.map((a) => a.difficulty)),
      activities,
      reward: {
        type: pick(
          rewards,
          history.map((h) => h.reward.type),
        ),
      },
    },
    context,
  );
}
export const analyticsEvents = [
  "lesson_requested",
  "lesson_generated",
  "lesson_generation_failed",
  "lesson_validation_failed",
  "lesson_fallback_used",
  "activity_started",
  "activity_completed",
  "activity_correct",
  "activity_incorrect",
  "activity_skipped",
  "reward_shown",
  "lesson_completed",
] as const;
export type LearningEvent = {
  event: (typeof analyticsEvents)[number];
  lessonId: string;
  activityId?: string;
  wordId?: string;
  responseTime?: number;
  correctness?: boolean;
  source?: "AI" | "fallback";
};
export interface LearningAIProvider {
  generateLesson(context: ChildLearningContext): Promise<unknown>;
}

/** Native and web implementations may later supply speech recognition without changing lessons. */
export interface SpeechRecognitionAdapter {
  isAvailable(): boolean;
  recognize(
    wordId: string,
    language: string,
  ): Promise<"recognized" | "try_together" | "unavailable">;
}

/** Acknowledgements are exposure, never evidence that a word is mastered. */
export function evaluateActivity(
  activity: GenerativeActivity,
  selectedIds: string[],
): boolean | null {
  if ("choices" in activity) {
    if (selectedIds.length !== 1 || !activity.choices.includes(selectedIds[0]))
      throw new Error("Invalid choice");
    return selectedIds[0] === activity.wordId;
  }
  if ("wordIds" in activity) {
    if (
      selectedIds.length !== activity.wordIds.length ||
      new Set(selectedIds).size !== selectedIds.length ||
      selectedIds.some((id) => !activity.wordIds.includes(id))
    )
      throw new Error("Invalid pairs");
    return selectedIds.every((id, i) => id === activity.wordIds[i]);
  }
  if (selectedIds.length) throw new Error("Unexpected answer");
  return null;
}
