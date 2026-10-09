import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireDatabase } from "@/lib/db/http";
import { accountContext } from "@/lib/security/account";
import { protectParent } from "@/lib/parent-auth";
const schema = z
  .object({
    aiPlanningEnabled: z.boolean().default(false),
    ageMonths: z.number().int().min(0).max(95),
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
  const context = await accountContext(true);
  if (context.response) return context.response;
  const denied = (await protectParent()) ?? requireDatabase();
  if (denied) return denied;
  try {
    const body = await req.json();
    return NextResponse.json(
      await db.childProfile.update({
        where: { id: context.account.child.id },
        data: (() => {
          const input = schema.parse(body);
          return {
            ...input,
            ...(input.ageMonths !== context.account.child.ageMonths
              ? { ageRecordedAt: new Date() }
              : {}),
          };
        })(),
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
