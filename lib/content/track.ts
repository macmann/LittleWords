import type { Language, TrackProgress } from "@/types";
export type TrackMission = {
  id: string;
  level: number;
  title: string;
  conceptSlugs: string[];
  activity: Record<Language, string>;
};
// All prompts are authored content. The mission path never generates language.
export const missionTrack: TrackMission[] = [
  {
    id: "name-vehicles",
    level: 1,
    title: "Meet the vehicles",
    conceptSlugs: ["car", "truck", "bus", "excavator", "police-car"],
    activity: {
      EN: "Point to a car or toy car together.",
      DE: "Zeigt zusammen auf ein Auto oder Spielzeugauto.",
      MY: "ကား ဒါမှမဟုတ် ကစားစရာကားလေးကို အတူတူ လက်ညှိုးထိုးပြမယ်။",
    },
  },
  {
    id: "name-home",
    level: 1,
    title: "Things around us",
    conceptSlugs: ["cup", "chair", "bed", "spoon", "door"],
    activity: {
      EN: "Find your cup. Point or say cup.",
      DE: "Findet deinen Becher. Zeigt darauf oder sagt Becher.",
      MY: "ကိုယ့်ခွက်လေးကို ရှာမယ်။ လက်ညှိုးထိုးပြ ဒါမှမဟုတ် ခွက်လို့ ပြောမယ်။",
    },
  },
  {
    id: "name-actions",
    level: 1,
    title: "Move with me",
    conceptSlugs: ["jump", "walk", "run", "sit", "stand"],
    activity: {
      EN: "Can you jump together?",
      DE: "Könnt ihr zusammen springen?",
      MY: "အတူတူ ခုန်ကြမလား။",
    },
  },
  {
    id: "pair-vehicles",
    level: 2,
    title: "A little word pair",
    conceptSlugs: ["car", "truck", "bus", "excavator", "police-car"],
    activity: {
      EN: "Find a toy car. Say a little phrase together.",
      DE: "Findet ein Spielzeugauto. Sagt zusammen einen kurzen Ausdruck dazu.",
      MY: "ကစားစရာကားလေးကို ရှာမယ်။ စကားတိုလေး အတူတူ ပြောမယ်။",
    },
  },
  {
    id: "pair-home",
    level: 2,
    title: "Our familiar things",
    conceptSlugs: ["cup", "chair", "bed", "spoon", "door"],
    activity: {
      EN: "Point to your cup. Add one word together.",
      DE: "Zeigt auf deinen Becher. Fügt zusammen ein Wort hinzu.",
      MY: "ကိုယ့်ခွက်လေးကို လက်ညှိုးထိုးပြမယ်။ စကားတစ်လုံး ထပ်ပေါင်းပြီး ပြောမယ်။",
    },
  },
  {
    id: "pair-animals",
    level: 2,
    title: "Animal friends",
    conceptSlugs: ["dog", "cat", "bird", "fish", "cow"],
    activity: {
      EN: "Find an animal in a book. Say a little phrase together.",
      DE: "Findet ein Tier in einem Buch. Sagt zusammen einen kurzen Ausdruck dazu.",
      MY: "စာအုပ်ထဲက တိရစ္ဆာန်လေးကို ရှာမယ်။ စကားတိုလေး အတူတူ ပြောမယ်။",
    },
  },
  {
    id: "detail-vehicles",
    level: 3,
    title: "Tell me a little more",
    conceptSlugs: ["car", "truck", "bus", "excavator", "police-car"],
    activity: {
      EN: "Look at a toy vehicle. Say its color and name together.",
      DE: "Schaut ein Spielzeugfahrzeug an. Sagt zusammen seine Farbe und seinen Namen.",
      MY: "ကစားစရာကားလေးကို ကြည့်မယ်။ အရောင်နဲ့ နာမည်ကို အတူတူ ပြောမယ်။",
    },
  },
  {
    id: "detail-home",
    level: 3,
    title: "Look a little closer",
    conceptSlugs: ["cup", "chair", "bed", "spoon", "door"],
    activity: {
      EN: "Find something at home. Describe it slowly together.",
      DE: "Findet etwas zu Hause. Beschreibt es langsam zusammen.",
      MY: "အိမ်ထဲက ပစ္စည်းလေးတစ်ခုကို ရှာမယ်။ အတူတူ ဖြည်းဖြည်း ပြောပြမယ်။",
    },
  },
  {
    id: "detail-food",
    level: 3,
    title: "At our table",
    conceptSlugs: ["apple", "banana", "rice", "bread", "milk"],
    activity: {
      EN: "Look at your snack. Say a longer phrase together.",
      DE: "Schaut euren Snack an. Sagt zusammen einen längeren Ausdruck dazu.",
      MY: "မုန့်လေးကို ကြည့်မယ်။ စကားလေး နည်းနည်းပိုရှည်အောင် အတူတူ ပြောမယ်။",
    },
  },
  {
    id: "sentence-vehicles",
    level: 4,
    title: "Our vehicles do things",
    conceptSlugs: ["car", "truck", "bus", "excavator", "police-car"],
    activity: {
      EN: "Move a toy car. Take turns saying what it does.",
      DE: "Bewegt ein Spielzeugauto. Sagt abwechselnd, was es macht.",
      MY: "ကစားစရာကားလေးကို ရွှေ့မယ်။ ဘာလုပ်နေလဲဆိုတာ တစ်ယောက်တစ်လှည့် ပြောမယ်။",
    },
  },
  {
    id: "sentence-home",
    level: 4,
    title: "A sentence at home",
    conceptSlugs: ["cup", "chair", "bed", "spoon", "door"],
    activity: {
      EN: "Choose a familiar thing. Say a little sentence together.",
      DE: "Wählt etwas Vertrautes. Sagt zusammen einen kurzen Satz.",
      MY: "ရင်းနှီးတဲ့ ပစ္စည်းလေးတစ်ခု ရွေးမယ်။ ဝါကျတိုလေး အတူတူ ပြောမယ်။",
    },
  },
  {
    id: "sentence-actions",
    level: 4,
    title: "Tell me what we do",
    conceptSlugs: ["jump", "walk", "run", "sit", "stand"],
    activity: {
      EN: "Do an action together. Take turns saying what you do.",
      DE: "Macht zusammen eine Bewegung. Sagt abwechselnd, was ihr macht.",
      MY: "အတူတူ လှုပ်ရှားမယ်။ ဘာလုပ်နေကြလဲဆိုတာ တစ်ယောက်တစ်လှည့် ပြောမယ်။",
    },
  },
];
export function missionUnlocked(
  id: string,
  language: Language,
  progress: Pick<TrackProgress, "missionId" | "language" | "completedAt">[],
): boolean {
  const index = missionTrack.findIndex((m) => m.id === id);
  if (index < 0) return false;
  return missionTrack
    .slice(0, index)
    .every((m) =>
      progress.some(
        (p) =>
          p.missionId === m.id && p.language === language && !!p.completedAt,
      ),
    );
}
