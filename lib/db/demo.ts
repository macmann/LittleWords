import {
  categories,
  concepts,
  knownSlugs,
  learningSlugs,
} from "@/lib/content/catalogue";
import type { Bootstrap } from "@/types";
export function demoData(): Bootstrap {
  return {
    demo: true,
    ai: { provider: "none", configured: false },
    account: { name: "Demo Parent", email: null, role: "PARENT" },
    progressSummary: { sessionsCompleted: 0, cardsSeen: 0 },
    resumeSession: null,
    security: { configured: false, legacyPinRequired: false },
    missionProgress: [],
    categories,
    concepts,
    profile: {
      id: "demo-child",
      name: "Demo Child",
      primaryLanguage: "EN",
      enabledLanguages: ["EN", "MY", "DE"],
      cardsPerSession: 10,
      practiceLevel: 0,
      aiPlanningEnabled: false,
      ageMonths: 36,
      ageRecordedAt: null,
    },
    vocabulary: concepts.map((c) => ({
      conceptId: c.id,
      status: knownSlugs.includes(c.slug)
        ? "KNOWN"
        : learningSlugs.includes(c.slug)
          ? "LEARNING"
          : "NEW",
      seenCount: 0,
      comfortableLevel: 1,
      favorite: false,
      parentConfirmed: knownSlugs.includes(c.slug),
    })),
  };
}
