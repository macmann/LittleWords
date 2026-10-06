import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { accountContext } from "@/lib/security/account";
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
  const context = await accountContext(true);
  if (context.response) return context.response;
  const denied = (await protectParent()) ?? requireDatabase();
  if (denied) return denied;
  try {
    const { id, custom, translations, ...values } = schema.parse(
      await req.json(),
    );
    const { child, user } = context.account;
    if (!custom && user.role !== "ADMIN")
      return NextResponse.json(
        { error: "Shared content is managed by the library administrator." },
        { status: 403 },
      );
    if (values.imageUrl.startsWith("/api/photos/")) {
      if (!custom)
        return NextResponse.json(
          { error: "Shared cards must use a public /images/ illustration." },
          { status: 400 },
        );
      const filename = values.imageUrl.split("/").at(-1)!;
      const photo = await db.photoAsset.findFirst({
        where: { filename, userId: user.id },
      });
      const legacy = await db.concept.findFirst({
        where: { childId: child.id, imageUrl: values.imageUrl },
      });
      if (!photo && !legacy)
        return NextResponse.json(
          { error: "Photo not found." },
          { status: 404 },
        );
    }
    if (custom) {
      const prefix = `${child.id}--`;
      const label = values.slug.startsWith(prefix)
        ? values.slug.slice(prefix.length)
        : values.slug;
      values.slug = `${prefix}${label.slice(0, 64)}`;
    }
    const clean = translations.map((t) => ({
      ...t,
      audioWordUrl: t.audioWordUrl || null,
      audioPhraseUrl: t.audioPhraseUrl || null,
      audioSentenceUrl: t.audioSentenceUrl || null,
    }));
    if (id) {
      const existing = await db.concept.findFirst({
        where: { id, OR: [{ childId: null }, { childId: child.id }] },
      });
      if (!existing)
        return NextResponse.json({ error: "Card not found." }, { status: 404 });
      if (Boolean(existing.childId) !== custom)
        return NextResponse.json(
          { error: "The card type cannot be changed." },
          { status: 400 },
        );
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
          childId: custom ? child.id : null,
          translations: { create: clean },
        },
        include: { translations: true },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
