import { z } from "zod";
import type { Concept, GeneratedCard } from "@/types";
export const activityKinds = [
  "PICTURE_CHOICE",
  "INTERACTIVE_SCENE",
  "SAY_TOGETHER",
] as const;
export const themes = ["road", "garden", "cozy"] as const;
export const activitySchema = z
  .object({
    sequence: z.number().int().min(0).max(11),
    conceptId: z.string().min(1).max(100),
    kind: z.enum(activityKinds),
    optionId: z.string().min(1).max(100).optional(),
  })
  .strict();
export const proposalSchema = z
  .object({
    theme: z.enum(themes),
    activities: z.array(activitySchema).min(1).max(12),
  })
  .strict();
export type Activity = z.infer<typeof activitySchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export const storedSchema = proposalSchema
  .extend({
    version: z.literal(1),
    source: z.enum(["curated", "openai", "deepseek"]),
    fallbackReason: z
      .enum([
        "disabled",
        "not_configured",
        "unavailable",
        "invalid_plan",
        "busy",
      ])
      .optional(),
  })
  .strict();
export type AdventurePlan = z.infer<typeof storedSchema>;
/** Content/stages are picked locally. AI can only choose a tested presentation. */
export function validateProposal(
  value: unknown,
  cards: GeneratedCard[],
  pool: Concept[],
): Proposal {
  const plan = proposalSchema.parse(value);
  const approved = new Set(
    pool.filter((c) => c.active && !c.childId).map((c) => c.id),
  );
  if (plan.activities.length !== cards.length)
    throw new Error("Incorrect adventure length");
  const sorted = [...plan.activities].sort((a, b) => a.sequence - b.sequence);
  for (const [i, activity] of sorted.entries()) {
    const card = cards[i];
    if (
      activity.sequence !== card.sequence ||
      activity.conceptId !== card.conceptId ||
      !approved.has(activity.conceptId)
    )
      throw new Error("Unapproved adventure concept");
    if (activity.kind === "PICTURE_CHOICE") {
      if (
        !activity.optionId ||
        activity.optionId === activity.conceptId ||
        !approved.has(activity.optionId)
      )
        throw new Error("Unapproved picture choice");
    } else if (activity.optionId) throw new Error("Unexpected picture choice");
  }
  if (
    cards.length >= 3 &&
    approved.size >= 2 &&
    new Set(sorted.map((a) => a.kind)).size !== 3
  )
    throw new Error("Activities need variety");
  return { ...plan, activities: sorted };
}
export function curatedPlan(
  cards: GeneratedCard[],
  pool: Concept[],
  seed = 0,
): AdventurePlan {
  const options = pool.filter((c) => c.active && !c.childId);
  const activities = cards
    .map((card, i): Activity => {
      const other = options.find((c) => c.id !== card.conceptId);
      const kind = activityKinds[i % 3];
      return {
        ...card,
        kind: kind === "PICTURE_CHOICE" && !other ? "SAY_TOGETHER" : kind,
        ...(kind === "PICTURE_CHOICE" && other ? { optionId: other.id } : {}),
      };
    })
    .map(({ conceptId, sequence, kind, optionId }) => ({
      conceptId,
      sequence,
      kind,
      ...(optionId ? { optionId } : {}),
    }));
  return {
    version: 1,
    source: "curated",
    theme: themes[Math.abs(seed) % themes.length],
    activities,
  };
}
export function readPlan(
  value: unknown,
  cards: GeneratedCard[],
  concepts: Concept[],
): AdventurePlan | null {
  if (!value) return null;
  try {
    const plan = storedSchema.parse(value);
    return {
      ...plan,
      ...validateProposal(
        { theme: plan.theme, activities: plan.activities },
        cards,
        concepts,
      ),
    };
  } catch {
    return null;
  }
}
