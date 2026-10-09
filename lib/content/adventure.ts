import type { Language } from "@/types";
/** Short curated controls; Burmese remains reviewable editorial content. */
export const adventureCopy: Record<
  Language,
  {
    choose: string;
    scene: string;
    together: string;
    notice: string;
    tap: string;
    listen: string;
    model: string;
    turn: string;
  }
> = {
  EN: {
    choose: "Can you find it?",
    scene: "Tap and say it together",
    together: "Your turn, then together",
    notice: "A look, a point, or a word is welcome.",
    tap: "Tap to explore",
    listen: "Listen again",
    model: "Let’s say it together",
    turn: "Give them a turn",
  },
  DE: {
    choose: "Findest du es?",
    scene: "Tippen und zusammen sagen",
    together: "Du bist dran, dann zusammen",
    notice: "Ein Blick, ein Zeigen oder ein Wort ist willkommen.",
    tap: "Zum Entdecken tippen",
    listen: "Noch einmal hören",
    model: "Sagen wir es zusammen",
    turn: "Zeit zum Antworten",
  },
  MY: {
    choose: "ရှာတွေ့လား။",
    scene: "နှိပ်ပြီး အတူတူ ပြောမယ်။",
    together: "အလှည့်ပေးပြီး အတူတူ ပြောမယ်။",
    notice: "ကြည့်တာ၊ လက်ညှိုးထိုးတာ၊ စကားတစ်ခွန်းပြောတာ အားလုံးရတယ်။",
    tap: "နှိပ်ပြီး ကြည့်မယ်။",
    listen: "ပြန်နားထောင်မယ်။",
    model: "အတူတူ ပြောမယ်။",
    turn: "ပြောဖို့ အလှည့်ပေးမယ်။",
  },
};
