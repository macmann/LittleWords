import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { protectParent } from "@/lib/parent-auth";
import { apiError, requireDatabase } from "@/lib/db/http";
const localUrl = z
  .string()
  .max(500)
  .refine(
    (s) =>
      /^\/(?:images\/[a-zA-Z0-9_./-]+|api\/photos\/[a-f0-9-]+\.(?:png|jpg|webp))$/.test(
        s,
      ) && !s.includes(".."),
    { message: "Use a local /images/ path or upload a photo." },
  );
const audioUrl = z.union([
  z.literal(""),
  z
    .string()
    .max(500)
    .refine((s) => s.startsWith("/audio/") && !s.includes(".."), {
      message: "Audio must use a local /audio/ path.",
    }),
]);
const translation = z.object({
  language: z.enum(["EN", "MY", "DE"]),
  word: z.string().trim().min(1).max(100),
  phraseLevel2: z.string().trim().min(1).max(150),
  phraseLevel3: z.string().trim().min(1).max(150),
  sentence: z.string().trim().min(1).max(200),
  promptText: z.string().trim().min(1).max(200),
  needsReview: z.boolean().optional(),
  audioWordUrl: audioUrl.nullish(),
  audioPhraseUrl: audioUrl.nullish(),
  audioSentenceUrl: audioUrl.nullish(),
});
const schema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
  categoryId: z.string().min(1),
  imageUrl: localUrl,
  type: z.enum(["OBJECT", "ACTION", "COLOR", "DESCRIPTION", "PERSON"]),
  difficulty: z.number().int().min(1).max(4),
  active: z.boolean(),
  custom: z.boolean(),
  translations: z
    .array(translation)
    .length(3)
    .refine((ts) => new Set(ts.map((t) => t.language)).size === 3, {
      message: "Provide one translation for each language.",
    }),
});
export async function POST(req: NextRequest) {
  const denied = (await protectParent()) ?? requireDatabase();
  if (denied) return denied;
  try {
    const { id, custom, translations, ...values } = schema.parse(
      await req.json(),
    );
    const clean = translations.map((t) => ({
      ...t,
      audioWordUrl: t.audioWordUrl || null,
      audioPhraseUrl: t.audioPhraseUrl || null,
      audioSentenceUrl: t.audioSentenceUrl || null,
    }));
    if (id) {
      const existing = await db.concept.findFirst({
        where: { id, OR: [{ childId: null }, { childId: "demo-child" }] },
      });
      if (!existing)
        return NextResponse.json({ error: "Card not found." }, { status: 404 });
      const concept = await db.concept.update({
        where: { id },
        data: {
          ...values,
          translations: {
            upsert: clean.map((t) => ({
              where: {
                conceptId_language: { conceptId: id, language: t.language },
              },
              create: t,
              update: t,
            })),
          },
        },
        include: { translations: true },
      });
      return NextResponse.json(concept);
    }
    return NextResponse.json(
      await db.concept.create({
        data: {
          ...values,
          childId: custom ? "demo-child" : null,
          translations: { create: clean },
        },
        include: { translations: true },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
