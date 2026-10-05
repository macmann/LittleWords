import type { Language } from "@/types";
export type MissionType =
  "FIND_OBJECT" | "FIND_COLOR" | "POINT_TO" | "DO_ACTION" | "PARENT_QUESTION";
export const missions: { type: MissionType; text: Record<Language, string> }[] =
  [
    {
      type: "FIND_COLOR",
      text: {
        EN: "Can you find something blue?",
        DE: "Findest du etwas Blaues?",
        MY: "အပြာရောင် ပစ္စည်းလေး ရှာကြည့်မလား။",
      },
    },
    {
      type: "FIND_OBJECT",
      text: {
        EN: "Where are your shoes?",
        DE: "Wo sind deine Schuhe?",
        MY: "ဖိနပ်လေး ဘယ်မှာလဲ။",
      },
    },
    {
      type: "POINT_TO",
      text: {
        EN: "Can you point to a car?",
        DE: "Kannst du auf ein Auto zeigen?",
        MY: "ကားလေးကို လက်ညှိုးထိုးပြမလား။",
      },
    },
    {
      type: "DO_ACTION",
      text: {
        EN: "Can you jump?",
        DE: "Kannst du springen?",
        MY: "ခုန်ပြမလား။",
      },
    },
    {
      type: "PARENT_QUESTION",
      text: {
        EN: "What can you see nearby?",
        DE: "Was siehst du hier?",
        MY: "အနားမှာ ဘာတွေမြင်လဲ။",
      },
    },
  ];
export const childCopy: Record<
  Language,
  {
    listen: string;
    next: string;
    back: string;
    done: string;
    skip: string;
    great: string;
    finished: string;
    home: string;
    mission: string;
    look: string;
  }
> = {
  EN: {
    listen: "Listen",
    next: "Next",
    back: "Back",
    done: "Done",
    skip: "Skip",
    great: "Great job!",
    finished: "You finished today’s cards.",
    home: "Back home",
    mission: "Let’s look around",
    look: "Look, listen, and say it together.",
  },
  DE: {
    listen: "Anhören",
    next: "Weiter",
    back: "Zurück",
    done: "Fertig",
    skip: "Überspringen",
    great: "Toll gemacht!",
    finished: "Das waren deine Karten für heute.",
    home: "Zur Startseite",
    mission: "Schauen wir uns um",
    look: "Schaut, hört und sprecht zusammen.",
  },
  MY: {
    listen: "နားထောင်မယ်",
    next: "နောက်တစ်ခု",
    back: "ပြန်မယ်",
    done: "ပြီးပြီ",
    skip: "ကျော်မယ်",
    great: "တော်လိုက်တာ။",
    finished: "ဒီနေ့အတွက် ကတ်လေးတွေ ပြီးပြီ။",
    home: "ပင်မစာမျက်နှာ",
    mission: "ပတ်ဝန်းကျင်မှာ ကြည့်ရအောင်",
    look: "အတူတူ ကြည့်၊ နားထောင်၊ ပြောကြမယ်။",
  },
};
