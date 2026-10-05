import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireDatabase } from "@/lib/db/http";
import { accountContext } from "@/lib/security/account";
import { protectParent } from "@/lib/parent-auth";
const schema = z.object({
  conceptId: z.string().min(1),
  status: z.enum(["KNOWN", "LEARNING", "NEW"]).optional(),
  comfortableLevel: z.number().int().min(1).max(3).optional(),
  favorite: z.boolean().optional(),
});
export async function PATCH(req: NextRequest) {
  const context = await accountContext(true);
  if (context.response) return context.response;
  const denied = (await protectParent()) ?? requireDatabase();
  if (denied) return denied;
  try {
    const { conceptId, ...values } = schema.parse(await req.json());
    const concept = await db.concept.findFirst({
      where: {
        id: conceptId,
        OR: [{ childId: null }, { childId: context.account.child.id }],
      },
    });
    if (!concept)
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    const v = await db.childVocabulary.upsert({
      where: {
        childId_conceptId: { childId: context.account.child.id, conceptId },
      },
      create: {
        childId: context.account.child.id,
        conceptId,
        ...values,
        parentConfirmed: values.status === "KNOWN",
      },
      update: {
        ...values,
        ...(values.status
          ? { parentConfirmed: values.status === "KNOWN" }
          : {}),
      },
    });
    return NextResponse.json(v);
  } catch (e) {
    return apiError(e);
  }
}
