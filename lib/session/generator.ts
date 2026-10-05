import type { Concept, Vocabulary, GeneratedCard, Language } from "@/types";
import { expansions, knownConceptSlugs } from "@/lib/content/expansions";
export type GeneratorInput = {
  concepts: Concept[];
  vocabulary: Vocabulary[];
  language: Language;
  numberOfCards: number;
  category?: string;
  seed?: number;
  includeMissions?: boolean;
};
function random(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
export class SessionGenerator {
  generate({
    concepts,
    vocabulary,
    language,
    numberOfCards,
    category,
    seed = 1,
    includeMissions = false,
  }: GeneratorInput): GeneratedCard[] {
    if (![5, 8, 10, 12].includes(numberOfCards))
      throw new Error("Choose 5, 8, 10, or 12 cards.");
    const wordCount = includeMissions
      ? numberOfCards - Math.floor(numberOfCards / 5)
      : numberOfCards;
    const rng = random(seed),
      vocab = new Map(vocabulary.map((v) => [v.conceptId, v]));
    const known = knownConceptSlugs(concepts, vocabulary);
    const expansionScore = (c: Concept) =>
      (vocab.get(c.id)?.favorite ? 2 : 0) +
      (expansions[c.slug]?.some((v) =>
        v.requires.every((slug) => known.has(slug)),
      )
        ? 1
        : 0);
    const pool = concepts.filter(
      (c) =>
        c.active &&
        (!category || c.categoryId === category) &&
        c.translations.some((t) => t.language === language),
    );
    const shuffle = <T>(items: T[]) =>
      items
        .map((item) => ({ item, r: rng() }))
        .sort((a, b) => a.r - b.r)
        .map(({ item }) => item);
    const grouped = {
      KNOWN: shuffle(
        pool.filter((c) => vocab.get(c.id)?.status === "KNOWN"),
      ).sort((a, b) => expansionScore(b) - expansionScore(a)),
      LEARNING: shuffle(
        pool.filter((c) => vocab.get(c.id)?.status === "LEARNING"),
      ),
      NEW: shuffle(
        pool.filter(
          (c) => !vocab.has(c.id) || vocab.get(c.id)?.status === "NEW",
        ),
      ),
    };
    const chosen: Concept[] = [];
    const quotas = {
      KNOWN: Math.round(wordCount * 0.5),
      LEARNING: Math.round(wordCount * 0.3),
      NEW:
        wordCount - Math.round(wordCount * 0.5) - Math.round(wordCount * 0.3),
    };
    for (const status of ["KNOWN", "LEARNING", "NEW"] as const)
      chosen.push(...grouped[status].slice(0, quotas[status]));
    // Fill sparse categories, still preferring expansion over introducing new nouns.
    const ids = new Set(chosen.map((c) => c.id));
    for (const status of ["KNOWN", "LEARNING", "NEW"] as const)
      for (const c of grouped[status])
        if (chosen.length < wordCount && !ids.has(c.id)) {
          chosen.push(c);
          ids.add(c.id);
        }
    // Avoid adjacent categories when an alternative is available. Never duplicate a concept.
    const remaining = shuffle(chosen),
      ordered: Concept[] = [];
    while (remaining.length) {
      const index = remaining.findIndex(
        (c) => c.categoryId !== ordered.at(-1)?.categoryId,
      );
      ordered.push(...remaining.splice(index < 0 ? 0 : index, 1));
    }
    return ordered.map((c, sequence) => {
      const v = vocab.get(c.id);
      let level = 1;
      if (v?.status === "KNOWN")
        level = Math.min(
          4,
          Math.max(
            2,
            Math.min(v.comfortableLevel + 1, 2 + Math.floor(v.seenCount / 4)),
          ),
        );
      if (v?.status === "LEARNING")
        level = Math.min(2, Math.max(1, v.comfortableLevel));
      // Counts alone never unlock richer levels. A parent must first confirm comfort.
      return { conceptId: c.id, levelShown: level, sequence };
    });
  }
}
export const sessionGenerator = new SessionGenerator();
export function phraseFor(concept: Concept, language: Language, level: number) {
  const t = concept.translations.find((t) => t.language === language);
  return t
    ? [t.word, t.phraseLevel2, t.phraseLevel3, t.sentence][level - 1] || t.word
    : "";
}
