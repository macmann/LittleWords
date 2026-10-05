import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, hasDatabase } from "@/lib/db/http";
import { demoData } from "@/lib/db/demo";
import { missionTrack, missionUnlocked } from "@/lib/content/track";
import { protectParent } from "@/lib/parent-auth";
import { sameOrigin } from "@/lib/http/origin";
import { sessionGenerator } from "@/lib/session/generator";
const schema = z.object({
  childId: z.literal("demo-child"),
  language: z.enum(["EN", "MY", "DE"]),
  numberOfCards: z.union([
    z.literal(5),
    z.literal(8),
    z.literal(10),
    z.literal(12),
  ]),
  category: z.string().max(100).optional(),
  missionId: z.string().max(100).optional(),
});
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return NextResponse.json({ error: "Please use the app." }, { status: 403 });
  try {
    const input = schema.parse(await req.json());
    const mission = input.missionId
      ? missionTrack.find((m) => m.id === input.missionId)
      : undefined;
    if (input.missionId && !mission)
      return NextResponse.json(
        { error: "This mission is unavailable." },
        { status: 404 },
      );
    if (mission) {
      const denied = await protectParent();
      if (denied) return denied;
      const progress = await db.missionProgress.findMany({
        where: { childId: input.childId },
      });
      if (
        !missionUnlocked(
          mission.id,
          input.language,
          progress.map((p) => ({
            ...p,
            completedAt: p.completedAt?.toISOString() || null,
          })),
        )
      )
        return NextResponse.json(
          { error: "Explore the earlier mission together first." },
          { status: 409 },
        );
    }
    const profile = hasDatabase()
      ? await db.childProfile.findUnique({ where: { id: input.childId } })
      : demoData().profile;
    if (!profile || !profile.enabledLanguages.includes(input.language))
      return NextResponse.json(
        { error: "Choose a language enabled by your parent." },
        { status: 400 },
      );
    const data = hasDatabase()
      ? {
          concepts: await db.concept.findMany({
            where: { OR: [{ childId: null }, { childId: input.childId }] },
            include: { translations: true },
          }),
          vocabulary: await db.childVocabulary.findMany({
            where: { childId: input.childId },
          }),
        }
      : demoData();
    if (mission) {
      const progress = await db.missionProgress.findUnique({
        where: {
          childId_missionId_language: {
            childId: input.childId,
            missionId: mission.id,
            language: input.language,
          },
        },
        include: {
          session: { include: { cards: { orderBy: { sequence: "asc" } } } },
        },
      });
      const previous = progress?.session;
      if (
        previous &&
        !previous.completedAt &&
        previous.cards.length &&
        previous.cards.every((card) =>
          data.concepts.some(
            (c) =>
              c.id === card.conceptId &&
              c.active &&
              c.translations.some((t) => t.language === input.language),
          ),
        )
      ) {
        const resumeSequence =
          previous.cards.find((c) => !c.seenAt)?.sequence ??
          previous.cards.length - 1;
        return NextResponse.json({
          id: previous.id,
          missionId: mission.id,
          language: input.language,
          resumeSequence,
          cards: previous.cards.map(({ conceptId, levelShown, sequence }) => ({
            conceptId,
            levelShown,
            sequence,
          })),
        });
      }
    }
    const cards = sessionGenerator.generate({
      ...input,
      ...data,
      concepts: mission
        ? data.concepts.filter((c) => mission.conceptSlugs.includes(c.slug))
        : data.concepts,
      category: mission ? undefined : input.category,
      numberOfCards: mission ? 5 : input.numberOfCards,
      practiceLevel: mission?.level || profile.practiceLevel,
      seed: Date.now() % 2147483647,
      includeMissions: true,
    });
    if (!cards.length)
      return NextResponse.json(
        { error: "No active cards in this category yet." },
        { status: 404 },
      );
    if (!hasDatabase())
      return NextResponse.json({
        id: "demo-session",
        cards,
        language: input.language,
      });
    const session = await db.$transaction(async (tx) => {
      const created = await tx.learningSession.create({
        data: {
          childId: input.childId,
          language: input.language,
          categoryId: mission ? null : input.category || null,
          missionId: mission?.id,
          cards: { create: cards },
        },
      });
      if (mission)
        await tx.missionProgress.upsert({
          where: {
            childId_missionId_language: {
              childId: input.childId,
              missionId: mission.id,
              language: input.language,
            },
          },
          create: {
            childId: input.childId,
            missionId: mission.id,
            language: input.language,
            sessionId: created.id,
          },
          update: { sessionId: created.id },
        });
      return created;
    });
    return NextResponse.json({
      missionId: mission?.id,
      id: session.id,
      cards,
      language: input.language,
    });
  } catch (e) {
    return apiError(e);
  }
}
class IncompleteMission extends Error {}
const progress = z.object({
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0).max(11).optional(),
  complete: z.boolean().optional(),
});
export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return NextResponse.json({ error: "Please use the app." }, { status: 403 });
  try {
    const input = progress.parse(await req.json());
    if (!hasDatabase() && input.sessionId === "demo-session")
      return NextResponse.json({ ok: true });
    await db.$transaction(async (tx) => {
      const s = await tx.learningSession.findFirst({
        where: { id: input.sessionId, childId: "demo-child" },
        include: { cards: true },
      });
      if (!s) throw new Error("Session missing");
      if (input.sequence !== undefined) {
        const card = s.cards.find((c) => c.sequence === input.sequence);
        if (!card) throw new Error("Card missing");
        const updated = await tx.sessionCard.updateMany({
          where: { id: card.id, seenAt: null },
          data: { seenAt: new Date() },
        });
        if (updated.count)
          await tx.childVocabulary.upsert({
            where: {
              childId_conceptId: {
                childId: s.childId,
                conceptId: card.conceptId,
              },
            },
            create: {
              childId: s.childId,
              conceptId: card.conceptId,
              seenCount: 1,
              lastSeen: new Date(),
            },
            update: { seenCount: { increment: 1 }, lastSeen: new Date() },
          });
      }
      if (input.complete && s.missionId) {
        const unseen = await tx.sessionCard.count({
          where: { sessionId: s.id, seenAt: null },
        });
        if (unseen)
          throw new IncompleteMission(
            "Explore all the mission cards before completing.",
          );
      }
      if (input.complete)
        await tx.learningSession.update({
          where: { id: s.id },
          data: { completedAt: new Date() },
        });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof IncompleteMission)
      return NextResponse.json({ error: e.message }, { status: 409 });
    return apiError(e);
  }
}
