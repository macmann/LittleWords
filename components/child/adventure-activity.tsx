"use client";
import { ConceptImage } from "@/components/concept-image";
import { useState } from "react";
import { Volume2, Heart } from "lucide-react";
import type { Concept, Language } from "@/types";
import type { Activity, AdventurePlan } from "@/lib/adventure/plan";
import { adventureCopy } from "@/lib/content/adventure";
export function AdventureActivity({
  activity,
  theme,
  concept,
  option,
  language,
  phrase,
  play,
  playOption,
}: {
  activity: Activity;
  theme: AdventurePlan["theme"];
  concept: Concept;
  option?: Concept;
  language: Language;
  phrase: string;
  play: () => void;
  playOption: (concept: Concept) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [explored, setExplored] = useState(false),
    [turn, setTurn] = useState(false);
  const copy = adventureCopy[language];
  const word =
    concept.translations.find((t) => t.language === language)?.word ?? "";
  function photo(c: Concept) {
    return <ConceptImage concept={c} />;
  }

  return (
    <section
      className={`adventure-activity theme-${theme}`}
      aria-label="Shared activity"
    >
      <h2>
        {activity.kind === "PICTURE_CHOICE"
          ? copy.choose
          : activity.kind === "INTERACTIVE_SCENE"
            ? copy.scene
            : copy.together}
      </h2>
      {activity.kind === "PICTURE_CHOICE" && option ? (
        <>
          <button className="secondary" onClick={play}>
            <Volume2 size={20} />
            {copy.listen}
          </button>
          <p className="picture-target">{word}</p>
          <div className="picture-choices">
            {(activity.sequence % 2
              ? [option, concept]
              : [concept, option]
            ).map((c) => (
              <button
                key={c.id}
                data-swipe-surface
                className={selected === c.id ? "picture-selected" : ""}
                aria-pressed={selected === c.id}
                aria-label={
                  c.translations.find((t) => t.language === language)?.word
                }
                onClick={() => {
                  setSelected(c.id);
                  playOption(c);
                }}
              >
                {photo(c)}
                <span className="picture-label">
                  {c.translations.find((t) => t.language === language)?.word}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <button className="secondary" onClick={play}>
              <Heart size={19} />
              {copy.model}
            </button>
          )}
        </>
      ) : activity.kind === "INTERACTIVE_SCENE" ? (
        <div className="interactive-scene">
          <span className="scene-cloud" aria-hidden="true" />
          <button
            data-swipe-surface
            className={`scene-object ${explored ? "scene-explored" : ""}`}
            aria-label={`${copy.tap}: ${word}`}
            onClick={() => {
              setExplored((v) => !v);
              play();
            }}
          >
            {photo(concept)}
          </button>
          <span className="scene-ground" aria-hidden="true" />
          {explored && <p className="scene-phrase">{phrase}</p>}
        </div>
      ) : (
        <>
          <button
            data-swipe-surface
            className="together-picture"
            aria-label={`${copy.listen}: ${word}`}
            onClick={play}
          >
            {photo(concept)}
          </button>
          <p className="together-phrase">{phrase}</p>
          <button
            className="secondary"
            onClick={() => {
              setTurn((v) => !v);
              if (turn) play();
            }}
          >
            <Heart size={19} />
            {turn ? copy.model : copy.turn}
          </button>
        </>
      )}
      <p className="activity-notice" role="status">
        {copy.notice}
      </p>
    </section>
  );
}
