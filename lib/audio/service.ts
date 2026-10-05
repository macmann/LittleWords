import type { Language, Translation } from "@/types";
export class AudioService {
  private audio: HTMLAudioElement | null = null;
  private generation = 0;
  stop() {
    this.generation++;
    this.audio?.pause();
    this.audio = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }
  async play(
    text: string,
    language: Language,
    url?: string | null,
    browserVoice = true,
  ): Promise<void> {
    this.stop();
    const generation = this.generation;
    if (url) {
      const audio = new Audio(url);
      this.audio = audio;
      try {
        await audio.play();
        return;
      } catch {
        if (generation !== this.generation) return;
        this.audio = null;
      }
    }
    if (!browserVoice || !("speechSynthesis" in window))
      throw new Error("Say it together: " + text);
    const lang = { EN: "en", MY: "my", DE: "de" }[language];
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (!voice && language === "MY")
      throw new Error(
        "A Myanmar voice is not installed. Read this phrase together.",
      );
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = { EN: "en-US", MY: "my-MM", DE: "de-DE" }[language];
    if (voice) utterance.voice = voice;
    utterance.rate = 0.82;
    await new Promise<void>((resolve, reject) => {
      utterance.onstart = () => resolve();
      utterance.onend = () => resolve();
      utterance.onerror = () => {
        if (generation !== this.generation) resolve();
        else
          reject(
            new Error(
              "The device voice is unavailable. Say it together: " + text,
            ),
          );
      };
      window.speechSynthesis.speak(utterance);
    });
  }
  playWord(t: Translation, browser = true) {
    return this.play(t.word, t.language, t.audioWordUrl, browser);
  }
  playPhrase(t: Translation, level = 2, browser = true) {
    return this.play(
      level === 3 ? t.phraseLevel3 : t.phraseLevel2,
      t.language,
      level === 2 ? t.audioPhraseUrl : undefined,
      browser,
    );
  }
  playSentence(t: Translation, browser = true) {
    return this.play(t.sentence, t.language, t.audioSentenceUrl, browser);
  }
}
export const audioService = new AudioService();
