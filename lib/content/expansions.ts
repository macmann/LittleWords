import type { Concept, Language, Translation, Vocabulary } from "@/types";
/** Authored alternatives, selected by familiar descriptors rather than generated. */
export const expansions: Record<
  string,
  {
    requires: string[];
    phrases: Record<Language, { phraseLevel2: string; phraseLevel3: string }>;
  }[]
> = {
  truck: [
    {
      requires: ["yellow"],
      phrases: {
        EN: { phraseLevel2: "Yellow truck", phraseLevel3: "Big yellow truck" },
        DE: {
          phraseLevel2: "Gelber Lastwagen",
          phraseLevel3: "Großer gelber Lastwagen",
        },
        MY: {
          phraseLevel2: "ကုန်တင်ကားဝါဝါ",
          phraseLevel3: "အဝါရောင် ကုန်တင်ကားကြီး",
        },
      },
    },
  ],
  car: [
    {
      requires: ["red"],
      phrases: {
        EN: { phraseLevel2: "Red car", phraseLevel3: "Big red car" },
        DE: { phraseLevel2: "Rotes Auto", phraseLevel3: "Großes rotes Auto" },
        MY: { phraseLevel2: "ကားနီနီ", phraseLevel3: "ကားနီကြီး" },
      },
    },
  ],
  excavator: [
    {
      requires: ["yellow"],
      phrases: {
        EN: {
          phraseLevel2: "Yellow excavator",
          phraseLevel3: "Big yellow excavator",
        },
        DE: {
          phraseLevel2: "Gelber Bagger",
          phraseLevel3: "Großer gelber Bagger",
        },
        MY: {
          phraseLevel2: "မြေတူးကားဝါဝါ",
          phraseLevel3: "အဝါရောင် မြေတူးကားကြီး",
        },
      },
    },
  ],
  "police-car": [
    {
      requires: ["blue"],
      phrases: {
        EN: {
          phraseLevel2: "Blue police car",
          phraseLevel3: "Big blue police car",
        },
        DE: {
          phraseLevel2: "Blaues Polizeiauto",
          phraseLevel3: "Großes blaues Polizeiauto",
        },
        MY: {
          phraseLevel2: "ရဲကားပြာပြာ",
          phraseLevel3: "အပြာရောင် ရဲကားကြီး",
        },
      },
    },
  ],
};
export function knownConceptSlugs(
  concepts: Concept[],
  vocabulary: Vocabulary[],
): Set<string> {
  const ids = new Set(
    vocabulary.filter((v) => v.status === "KNOWN").map((v) => v.conceptId),
  );
  return new Set(concepts.filter((c) => ids.has(c.id)).map((c) => c.slug));
}
export function familiarExpansion(
  concept: Concept,
  language: Language,
  known: Set<string>,
): Translation | undefined {
  const translation = concept.translations.find((t) => t.language === language);
  if (!translation || concept.childId) return translation;
  const candidate = expansions[concept.slug]?.find((v) =>
    v.requires.every((slug) => known.has(slug)),
  );
  // Respect parent edits and their recordings. Only the unchanged seed truck
  // phrase has an alternative; the other authored phrases already use colors.
  const originalTruckPhrase: Record<Language, string> = {
    EN: "Big truck",
    DE: "Großer Lastwagen",
    MY: "ကုန်တင်ကားကြီး",
  };
  if (
    !candidate ||
    concept.slug !== "truck" ||
    translation.phraseLevel2 !== originalTruckPhrase[language] ||
    translation.audioPhraseUrl
  )
    return translation;
  return {
    ...translation,
    phraseLevel2: candidate.phrases[language].phraseLevel2,
    audioPhraseUrl: null,
  };
}
