import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, hasDatabase } from "@/lib/db/http";
import { demoData } from "@/lib/db/demo";
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
});
export async function POST(req: NextRequest) {
  try {
    const input = schema.parse(await req.json());
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
    const cards = sessionGenerator.generate({
      ...input,
      ...data,
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
    const session = await db.learningSession.create({
      data: {
        childId: input.childId,
        language: input.language,
        categoryId: input.category || null,
        cards: { create: cards },
      },
    });
    return NextResponse.json({
      id: session.id,
      cards,
      language: input.language,
    });
  } catch (e) {
    return apiError(e);
  }
}
const progress = z.object({
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0).max(11).optional(),
  complete: z.boolean().optional(),
});
export async function PATCH(req: NextRequest) {
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
      if (input.complete)
        await tx.learningSession.update({
          where: { id: s.id },
          data: { completedAt: new Date() },
        });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
