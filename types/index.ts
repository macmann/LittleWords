export type Language = "EN" | "MY" | "DE";
export type Status = "KNOWN" | "LEARNING" | "NEW";
export type Translation = {
  language: Language;
  word: string;
  phraseLevel2: string;
  phraseLevel3: string;
  sentence: string;
  promptText: string;
  audioWordUrl?: string | null;
  audioPhraseUrl?: string | null;
  audioSentenceUrl?: string | null;
  needsReview?: boolean;
};
export type Concept = {
  id: string;
  slug: string;
  categoryId: string;
  imageUrl: string;
  type: string;
  difficulty: number;
  active: boolean;
  childId?: string | null;
  translations: Translation[];
};
export type Vocabulary = {
  conceptId: string;
  status: Status;
  seenCount: number;
  comfortableLevel: number;
  favorite: boolean;
  parentConfirmed: boolean;
};
export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
};
export type Profile = {
  id: string;
  name: string;
  primaryLanguage: Language;
  enabledLanguages: Language[];
  cardsPerSession: number;
  practiceLevel: number;
};
export type Bootstrap = {
  profile: Profile;
  concepts: Concept[];
  categories: Category[];
  vocabulary: Vocabulary[];
  demo: boolean;
  security: { configured: boolean; legacyPinRequired: boolean };
  missionProgress: TrackProgress[];
};
export type GeneratedCard = {
  conceptId: string;
  levelShown: number;
  sequence: number;
};
export type Session = {
  resumeSequence?: number;
  missionId?: string | null;
  id: string;
  cards: GeneratedCard[];
  language: Language;
};

export type TrackProgress = {
  missionId: string;
  language: Language;
  completedAt: string | null;
  readyToConfirm: boolean;
};
