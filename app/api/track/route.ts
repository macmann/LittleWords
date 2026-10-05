import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireDatabase } from "@/lib/db/http";
import { protectParent } from "@/lib/parent-auth";
import { missionTrack, missionUnlocked } from "@/lib/content/track";
const schema = z.object({
  missionId: z.string().max(100),
  language: z.enum(["EN", "MY", "DE"]),
  offlineDone: z.literal(true),
});
export async function PATCH(req: NextRequest) {
  const denied = (await protectParent()) ?? requireDatabase();
  if (denied) return denied;
  try {
    const input = schema.parse(await req.json());
    const mission = missionTrack.find((m) => m.id === input.missionId);
    if (!mission)
      return NextResponse.json(
        { error: "This mission is unavailable." },
        { status: 404 },
      );
    return await db.$transaction(async (tx) => {
      const all = await tx.missionProgress.findMany({
        where: { childId: "demo-child" },
        include: { session: { include: { cards: true } } },
      });
      const progress = all.find(
        (p) => p.missionId === input.missionId && p.language === input.language,
      );
      if (
        !missionUnlocked(
          input.missionId,
          input.language,
          all.map((p) => ({
            ...p,
            completedAt: p.completedAt?.toISOString() || null,
          })),
        )
      )
        return NextResponse.json(
          { error: "Explore the earlier mission together first." },
          { status: 409 },
        );
      if (progress?.completedAt) return NextResponse.json({ ok: true });
      if (
        !progress?.session?.completedAt ||
        !progress.session.cards.length ||
        progress.session.cards.some((c) => !c.seenAt)
      )
        return NextResponse.json(
          { error: "Enjoy the mission cards and real-world activity first." },
          { status: 409 },
        );
      await tx.missionProgress.update({
        where: { id: progress.id },
        data: { completedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return apiError(e);
  }
}
