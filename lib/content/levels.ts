import type { Language } from "@/types";
export const levels = [
  {
    level: 1,
    title: "Familiar words",
    description: "Look, name, and leave space for a point or a word.",
    example: "Truck",
    cue: {
      EN: "Point and say it together.",
      DE: "Zeigt darauf und sagt das Wort zusammen.",
      MY: "လက်ညှိုးထိုးပြီး အတူတူ ပြောကြမယ်။",
    },
  },
  {
    level: 2,
    title: "Two words together",
    description: "Add one small detail to a familiar word.",
    example: "Big truck",
    cue: {
      EN: "Say the little phrase together.",
      DE: "Sagt den kurzen Ausdruck zusammen.",
      MY: "စကားတိုလေးကို အတူတူ ပြောကြမယ်။",
    },
  },
  {
    level: 3,
    title: "A little more detail",
    description: "Build a richer phrase, one gentle step at a time.",
    example: "Big yellow truck",
    cue: {
      EN: "Say it slowly, then together.",
      DE: "Sagt es langsam und dann zusammen.",
      MY: "ဖြည်းဖြည်းပြောပြီး အတူတူ ပြောကြမယ်။",
    },
  },
  {
    level: 4,
    title: "Our little sentences",
    description:
      "Take turns saying a short sentence, then look for it in real life.",
    example: "The truck is moving.",
    cue: {
      EN: "Your turn, my turn. Say it together.",
      DE: "Du bist dran, ich bin dran. Sprechen wir zusammen.",
      MY: "တစ်ယောက်တစ်လှည့် အတူတူ ပြောကြမယ်။",
    },
  },
] satisfies {
  level: number;
  title: string;
  description: string;
  example: string;
  cue: Record<Language, string>;
}[];
