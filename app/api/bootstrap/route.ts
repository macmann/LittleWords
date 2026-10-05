import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demoData } from "@/lib/db/demo";
import { apiError, hasDatabase } from "@/lib/db/http";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!hasDatabase()) return NextResponse.json(demoData());
  try {
    const profile = await db.childProfile.findUnique({
      where: { id: "demo-child" },
    });
    if (!profile)
      return NextResponse.json(
        {
          error:
            "Run npm run db:migrate and npm run db:seed to create your child profile.",
        },
        { status: 503 },
      );
    const [categories, concepts, vocabulary] = await Promise.all([
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.concept.findMany({
        where: { OR: [{ childId: null }, { childId: profile.id }] },
        include: { translations: true },
        orderBy: { slug: "asc" },
      }),
      db.childVocabulary.findMany({ where: { childId: profile.id } }),
    ]);
    return NextResponse.json({
      profile,
      categories,
      concepts,
      vocabulary,
      demo: false,
    });
  } catch (e) {
    return apiError(e);
  }
}
