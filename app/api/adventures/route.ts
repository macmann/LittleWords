import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { accountContext, privateHeaders } from "@/lib/security/account";
import { protectParent } from "@/lib/parent-auth";
import { apiError } from "@/lib/db/http";
import { sessionGenerator } from "@/lib/session/generator";
import { planAdventure, aiConfiguration } from "@/lib/ai/provider";
import { curatedPlan } from "@/lib/adventure/plan";
import { preferredPictureSlugs } from "@/lib/adventure/picture-options";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const inputSchema = z
  .object({
    language: z.enum(["EN", "MY", "DE"]),
    category: z.string().max(100).optional(),
  })
  .strict();
const calls = new Map<string, number>();
export async function POST(req: NextRequest) {
  const context = await accountContext(true);
  if (context.response) return context.response;
  const denied = await protectParent();
  if (denied) return denied;
  try {
    const input = inputSchema.parse(await req.json()),
      profile = context.account.child;
    if (!profile.enabledLanguages.includes(input.language))
      return NextResponse.json(
        { error: "Choose an enabled language." },
        { status: 400 },
      );
    const [concepts, vocabulary] = await Promise.all([
      db.concept.findMany({
        where: {
          active: true,
          childId: null,
          translations: { some: { language: input.language } },
        },
        include: { translations: true },
        orderBy: { slug: "asc" },
      }),
      db.childVocabulary.findMany({ where: { childId: profile.id } }),
    ]);
    const seed = Date.now() % 2147483647;
    const cards = sessionGenerator.generate({
      concepts,
      vocabulary,
      language: input.language,
      category: input.category,
      numberOfCards: profile.cardsPerSession,
      practiceLevel: profile.practiceLevel,
      seed,
      includeMissions: true,
    });
    if (!cards.length)
      return NextResponse.json(
        { error: "There are no approved cards in this category yet." },
        { status: 404 },
      );
    // Bound both prompt size and permitted choices; private cards are absent.
    const chosen = cards.map((card) =>
      concepts.find((c) => c.id === card.conceptId)!,
    );
    const preferred = new Set(chosen.flatMap(preferredPictureSlugs));
    const additional = concepts.filter(
      (c) => !chosen.some((v) => v.id === c.id),
    );
    additional.sort(
      (a, b) => Number(preferred.has(b.slug)) - Number(preferred.has(a.slug)),
    );
    const pool = [...chosen, ...additional.slice(0, 24 - chosen.length)];
    const configuration = aiConfiguration(),
      willCall = profile.aiPlanningEnabled && configuration.configured;
    const cooldown = (calls.get(profile.id) ?? 0) > Date.now();
    let plan;
    if (willCall && cooldown)
      plan = {
        ...curatedPlan(cards, pool, seed),
        fallbackReason: "busy" as const,
      };
    else {
      if (willCall) {
        if (calls.size >= 1000) calls.delete(calls.keys().next().value!);
        calls.set(profile.id, Date.now() + 60000);
      }
      plan = await planAdventure({
        cards,
        pool,
        language: input.language,
        enabled: profile.aiPlanningEnabled,
        knownIds: vocabulary
          .filter((v) => v.status === "KNOWN")
          .map((v) => v.conceptId),
        seed,
      });
    }
    const session = await db.learningSession.create({
      data: {
        childId: profile.id,
        language: input.language,
        categoryId: input.category ?? null,
        adventurePlan: plan,
        cards: {
          create: cards.map((card) => ({
            conceptId: card.conceptId,
            levelShown: card.levelShown,
            sequence: card.sequence,
          })),
        },
      },
    });
    return NextResponse.json(
      { id: session.id, cards, language: input.language, adventurePlan: plan },
      { headers: privateHeaders },
    );
  } catch (e) {
    return apiError(e);
  }
}
