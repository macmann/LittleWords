"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  X,
  Hand,
  Heart,
  Check,
  Sun,
} from "lucide-react";
import type { Bootstrap, Concept, Language, Session } from "@/types";
import { audioService } from "@/lib/audio/service";
import { familiarExpansion, knownConceptSlugs } from "@/lib/content/expansions";
import { childCopy, missions } from "@/lib/content/missions";
export function LanguageControls({
  language,
  onChange,
  enabled = ["EN", "MY", "DE"],
}: {
  language: Language;
  onChange: (l: Language) => void;
  enabled?: Language[];
}) {
  return (
    <div className="language-controls" aria-label="Session language">
      {enabled.map((l) => (
        <button
          key={l}
          aria-pressed={l === language}
          onClick={() => onChange(l)}
          lang={l === "MY" ? "my" : l === "DE" ? "de" : "en"}
        >
          {l === "MY" ? "မြန်မာ" : l}
        </button>
      ))}
    </div>
  );
}
function Photo({ concept }: { concept: Concept }) {
  return (
    <img
      src={concept.imageUrl}
      alt=""
      draggable={false}
      onError={(e) => {
        e.currentTarget.src = "/images/fallback.svg";
      }}
    />
  );
}
export function LearningSession({
  data,
  session,
  onExit,
  browserVoice,
  onRefresh,
}: {
  data: Bootstrap;
  session: Session;
  onExit: () => void;
  browserVoice: boolean;
  onRefresh: () => void;
}) {
  const [index, setIndex] = useState(0),
    [language, setLanguage] = useState<Language>(session.language),
    [mission, setMission] = useState<number | null>(null),
    [complete, setComplete] = useState(false),
    [audioMessage, setAudioMessage] = useState(""),
    [saveError, setSaveError] = useState(""),
    [promptReady, setPromptReady] = useState(false),
    [ending, setEnding] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null),
    visited = useRef(new Set<number>()),
    pauses = useRef(new Set<number>());
  const card = session.cards[index],
    concept = data.concepts.find((c) => c.id === card?.conceptId),
    t = concept
      ? familiarExpansion(
          concept,
          language,
          knownConceptSlugs(data.concepts, data.vocabulary),
        )
      : undefined,
    copy = childCopy[language];
  const guide = index % 3 === 2;
  // Cycle the authored mission types across sessions, without generating text.
  const missionOffset =
    [...session.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    missions.length;
  const totalSteps =
    session.cards.length + Math.floor(session.cards.length / 4);
  const step = index + 1 + Math.floor(index / 4);
  useEffect(() => {
    audioService.stop();
    setAudioMessage("");
    setPromptReady(false);
    const timer = setTimeout(() => setPromptReady(true), 3000);
    return () => {
      clearTimeout(timer);
      audioService.stop();
    };
  }, [index, language, mission, complete]);
  useEffect(() => {
    if (!card || visited.current.has(index)) return;
    visited.current.add(index);
    fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, sequence: index }),
    })
      .then(async (res) => {
        if (!res.ok) {
          visited.current.delete(index);
          setSaveError(
            "Progress could not be saved. You can still enjoy the cards.",
          );
        }
      })
      .catch(() => {
        visited.current.delete(index);
        setSaveError(
          "Progress could not be saved. You can still enjoy the cards.",
        );
      });
  }, [card, index, session.id]);
  async function play(word = false) {
    if (!t) return;
    try {
      setAudioMessage("");
      if (word) await audioService.playWord(t, browserVoice);
      else if (card.levelShown === 4)
        await audioService.playSentence(t, browserVoice);
      else if (card.levelShown > 1)
        await audioService.playPhrase(t, card.levelShown, browserVoice);
      else await audioService.playWord(t, browserVoice);
    } catch (e) {
      setAudioMessage(e instanceof Error ? e.message : "Say it together.");
    }
  }
  async function finish() {
    setEnding(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, complete: true }),
      });
      if (!res.ok)
        setSaveError(
          "The session was enjoyed, but its completion could not be saved.",
        );
    } catch {
      setSaveError(
        "The session was enjoyed, but its completion could not be saved.",
      );
    } finally {
      setEnding(false);
      setComplete(true);
      onRefresh();
    }
  }
  function next() {
    audioService.stop();
    if (ending) return;
    const upcoming = index + 1;
    if (upcoming % 4 === 0 && !pauses.current.has(upcoming)) {
      pauses.current.add(upcoming);
      setMission(Math.floor(upcoming / 4) - 1);
      return;
    }
    if (index === session.cards.length - 1) void finish();
    else setIndex(upcoming);
  }
  function dismissMission() {
    setMission(null);
    if (index === session.cards.length - 1) void finish();
    else setIndex((i) => i + 1);
  }
  function changeLanguage(l: Language) {
    audioService.stop();
    setLanguage(l);
  }
  if (complete)
    return (
      <div
        className="child-stage celebration"
        lang={language === "MY" ? "my" : language === "DE" ? "de" : "en"}
      >
        <div className="celebration-flower">
          <Sun size={80} strokeWidth={1.5} />
        </div>
        <p className="eyebrow">A LITTLE MOMENT, A BIG CONNECTION</p>
        <h1>{copy.great}</h1>
        <p>{copy.finished}</p>
        <div className="mission-box">
          <Hand size={32} />
          <h2>{missions[0].text[language]}</h2>
          <p>Put the screen away and explore together.</p>
        </div>
        {saveError && (
          <p role="status" className="form-error">
            {saveError}
          </p>
        )}
        <button className="primary" onClick={onExit}>
          <Check size={20} />
          {copy.done}
        </button>
        <button className="text-button" onClick={onExit}>
          {copy.home}
        </button>
      </div>
    );
  if (mission !== null)
    return (
      <div
        className="child-stage mission-stage"
        lang={language === "MY" ? "my" : language === "DE" ? "de" : "en"}
      >
        <div className="round-symbol">
          <Hand size={48} />
        </div>
        <p className="eyebrow">A LITTLE REAL-WORLD MOMENT</p>
        <h1>{copy.mission}</h1>
        <h2>
          {missions[(mission + missionOffset) % missions.length].text[language]}
        </h2>
        <p>Take your time. Explore together.</p>
        <button className="primary" onClick={dismissMission}>
          <Check size={20} />
          {copy.done}
        </button>
        <button className="text-button" onClick={dismissMission}>
          {copy.skip}
        </button>
      </div>
    );
  if (!concept || !t)
    return (
      <div className="child-stage">
        <h1>These cards are taking a little break.</h1>
        <button className="primary" onClick={onExit}>
          Back home
        </button>
      </div>
    );
  const phrase =
    [t.word, t.phraseLevel2, t.phraseLevel3, t.sentence][card.levelShown - 1] ||
    t.word;
  return (
    <section
      className="learning"
      lang={language === "MY" ? "my" : language === "DE" ? "de" : "en"}
    >
      <header className="learning-header">
        <button
          className="icon-button"
          aria-label="End session and go home"
          onClick={onExit}
        >
          <X />
        </button>
        <span>
          {step} / {totalSteps}
        </span>
        <LanguageControls
          language={language}
          enabled={data.profile.enabledLanguages}
          onChange={changeLanguage}
        />
      </header>
      <div className="progress-track">
        <div style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>
      <div
        className="learning-card"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x,
            dy = e.changedTouches[0].clientY - touch.current.y;
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 65) return;
          const forward = Math.abs(dx) > Math.abs(dy) ? dx < 0 : dy < 0;
          if (forward) next();
          else if (index > 0) setIndex((i) => i - 1);
        }}
      >
        <button
          className="card-image"
          onClick={() => void play(true)}
          aria-label={`Listen to ${t.word}`}
        >
          <Photo concept={concept} />
          <span className="tap-hint">
            <Volume2 size={16} /> Tap to hear
          </span>
        </button>
        <h1>{t.word}</h1>
        <button className="listen-button" onClick={() => void play()}>
          <Volume2 size={24} />
          {copy.listen}
        </button>
        <p className="expanded-phrase">{phrase}</p>
        {guide ? (
          <div className="parent-cue">
            <p>
              <Heart size={16} /> A moment together
            </p>
            <h3>{t.promptText}</h3>
            {promptReady ? (
              <>
                <span>
                  If they say “{t.word}”, respond: “{t.phraseLevel2}!”
                </span>
                <span>
                  No answer? Gently say: “{t.word}. {t.phraseLevel2}.”
                </span>
              </>
            ) : (
              <span>Pause and give them time to respond.</span>
            )}
          </div>
        ) : (
          <p className="together-note">{copy.look}</p>
        )}
        {audioMessage && (
          <p className="audio-message" role="status">
            {audioMessage}
          </p>
        )}
      </div>
      <footer className="session-footer">
        <button
          className="secondary"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          <ArrowLeft size={20} />
          {copy.back}
        </button>
        <span>Swipe or use the arrows</span>
        <button className="primary" disabled={ending} onClick={next}>
          {ending
            ? "Saving…"
            : index === session.cards.length - 1
              ? copy.done
              : copy.next}
          <ArrowRight size={20} />
        </button>
      </footer>
      {saveError && (
        <p role="status" className="form-error">
          {saveError}
        </p>
      )}
    </section>
  );
}
