import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireDatabase } from "@/lib/db/http";
import { protectParent } from "@/lib/parent-auth";
const schema = z
  .object({
    practiceLevel: z.number().int().min(0).max(4),
    name: z.string().trim().min(1).max(50),
    primaryLanguage: z.enum(["EN", "MY", "DE"]),
    enabledLanguages: z
      .array(z.enum(["EN", "MY", "DE"]))
      .min(1)
      .max(3),
    cardsPerSession: z.union([
      z.literal(5),
      z.literal(8),
      z.literal(10),
      z.literal(12),
    ]),
  })
  .refine((v) => v.enabledLanguages.includes(v.primaryLanguage), {
    message: "Enable the primary language.",
  });
export async function PATCH(req: NextRequest) {
  const denied = (await protectParent()) ?? requireDatabase();
  if (denied) return denied;
  try {
    return NextResponse.json(
      await db.childProfile.update({
        where: { id: "demo-child" },
        data: schema.parse(await req.json()),
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
