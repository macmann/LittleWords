import "dotenv/config";
import { PrismaClient, ConceptType } from "@prisma/client";
import {
  categories,
  concepts,
  knownSlugs,
  learningSlugs,
} from "../lib/content/catalogue";
const db = new PrismaClient();
async function main() {
  await db.user.upsert({
    where: { id: "demo-user" },
    create: { id: "demo-user" },
    update: {},
  });
  await db.childProfile.upsert({
    where: { id: "demo-child" },
    create: {
      id: "demo-child",
      userId: "demo-user",
      name: "Demo Child",
      primaryLanguage: "EN",
      enabledLanguages: ["EN", "MY", "DE"],
      cardsPerSession: 10,
    },
    update: {},
  });
  for (const category of categories)
    await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
    });
  for (const { translations, ...concept } of concepts) {
    // Re-running the seed preserves parent edits and vocabulary.
    await db.concept.upsert({
      where: { slug: concept.slug },
      create: { ...concept, type: concept.type as ConceptType },
      update: {},
    });
    for (const t of translations)
      await db.conceptTranslation.upsert({
        where: {
          conceptId_language: { conceptId: concept.id, language: t.language },
        },
        create: { ...t, conceptId: concept.id },
        update: {},
      });
    await db.childVocabulary.upsert({
      where: {
        childId_conceptId: { childId: "demo-child", conceptId: concept.id },
      },
      create: {
        childId: "demo-child",
        conceptId: concept.id,
        status: knownSlugs.includes(concept.slug)
          ? "KNOWN"
          : learningSlugs.includes(concept.slug)
            ? "LEARNING"
            : "NEW",
        parentConfirmed: knownSlugs.includes(concept.slug),
      },
      update: {},
    });
  }
  console.log(
    `Seeded ${concepts.length} concepts, ${categories.length} categories, and Demo Child.`,
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
