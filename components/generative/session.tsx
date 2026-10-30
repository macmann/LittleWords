"use client";
import { useEffect, useRef, useState } from "react";
import { X, Volume2 } from "lucide-react";
import { ConceptImage } from "@/components/concept-image";
import { audioService } from "@/lib/audio/service";
import type { Bootstrap, Language } from "@/types";
import {
  evaluateActivity,
  type GenerativeLesson,
} from "@/lib/generative/domain";
const mascots = {
  jungle: "🐒",
  ocean: "🐙",
  space: "🚀",
  farm: "🐑",
  vehicles: "🚂",
  dinosaurs: "🦕",
  city: "🏙️",
  playground: "🪁",
  default: "🌈",
};
const rewardIcons = {
  stars: "⭐",
  balloons: "🎈",
  confetti: "🎉",
  rocket: "🚀",
  "animal-cheer": "🐻",
  "progress-badge": "🏅",
};
export function GenerativeSession({
  lesson,
  data,
  language,
  browserVoice,
  local,
  onExit,
  initialIndex = 0,
}: {
  lesson: GenerativeLesson;
  data: Bootstrap;
  language: Language;
  browserVoice: boolean;
  local: boolean;
  initialIndex?: number;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(
      Math.min(lesson.activities.length - 1, Math.max(0, initialIndex)),
    ),
    [answer, setAnswer] = useState<string[]>([]),
    [feedback, setFeedback] = useState<string | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [audioError, setAudioError] = useState("");
  const started = useRef(0),
    submitted = useRef(false);
  const activity = lesson.activities[index];
  const concept = (id: string) => data.concepts.find((c) => c.id === id);
  const word = (id: string) =>
    concept(id)?.translations.find((t) => t.language === language)?.word ?? "";
  useEffect(() => {
    started.current = Date.now();
    submitted.current = false;
    setAnswer([]);
    setFeedback(null);
    setAudioError("");
    audioService.stop();
    return () => audioService.stop();
  }, [index]);
  useEffect(() => {
    if (local) return;
    void fetch(`/api/v1/lessons/${lesson.lessonId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        done
          ? { event: "reward_shown" }
          : { event: "activity_started", activityId: activity.activityId },
      ),
    }).catch(() => {});
  }, [index, done, local, lesson.lessonId, activity.activityId]);
  async function play(id: string) {
    const t = concept(id)?.translations.find((t) => t.language === language);
    if (t)
      try {
        await audioService.playWord(t, browserVoice);
      } catch (e) {
        setAudioError(e instanceof Error ? e.message : "Say it together.");
      }
  }
  async function submit(ids: string[]) {
    if (submitted.current || saving) return;
    submitted.current = true;
    setSaving(true);
    setError("");
    setAnswer(ids);
    try {
      let recordedCorrect: boolean | null | undefined;
      if (!local) {
        const res = await fetch(
          `/api/v1/activities/${activity.activityId}/result`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lessonId: lesson.lessonId,
              selectedIds: ids,
              responseTime: Math.min(3600000, Date.now() - started.current),
            }),
          },
        );
        if (!res.ok)
          throw new Error("Connect again, then try saving your answer.");
        recordedCorrect = (await res.json()).correct;
      }
      const correct =
        recordedCorrect !== undefined
          ? recordedCorrect !== false
          : evaluateActivity(activity, ids) !== false;
      setFeedback(
        correct
          ? "Lovely exploring!"
          : `Let’s learn together: ${word(activity.wordId)}`,
      );
      if (!correct) void play(activity.wordId);
    } catch (e) {
      submitted.current = false;
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }
  async function next() {
    if (saving) return;
    if (index < lesson.activities.length - 1) {
      setIndex(index + 1);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (!local) {
        const res = await fetch(`/api/v1/lessons/${lesson.lessonId}/complete`, {
          method: "POST",
        });
        if (!res.ok)
          throw new Error("Connect again to finish saving your adventure.");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }
  const visual = (id: string) => {
    const c = concept(id);
    return c ? <ConceptImage concept={c} /> : null;
  };
  return (
    <section
      className="learning generative-learning"
      lang={language === "MY" ? "my" : language === "DE" ? "de" : "en"}
    >
      <header className="learning-header">
        <button
          className="icon-button"
          aria-label="End session"
          onClick={onExit}
        >
          <X />
        </button>
        <span>
          {done ? lesson.activities.length : index + 1} /{" "}
          {lesson.activities.length}
        </span>
        <span>{language}</span>
      </header>
      <div className="progress-track">
        <div
          style={{
            width: `${(done ? 1 : index / lesson.activities.length) * 100}%`,
          }}
        />
      </div>
      {local && (
        <p className="generative-note">
          Offline practice · progress will not be saved.
        </p>
      )}
      <main
        className={`generative-stage palette-${lesson.palette}`}
        data-theme={lesson.theme}
      >
        <span
          className={`generative-mascot ${done ? "generative-reward" : ""}`}
          data-reward={done ? lesson.reward.type : undefined}
          aria-hidden="true"
        >
          {done ? rewardIcons[lesson.reward.type] : mascots[lesson.theme]}
        </span>
        {done ? (
          <>
            <h1>Wonderful exploring!</h1>
            <p>Our little adventure is finished.</p>
            <button className="primary" onClick={onExit}>
              Back home
            </button>
          </>
        ) : (
          <>
            <h1>
              {activity.type === "listen_choice" && feedback === null
                ? "Listen and find the picture"
                : activity.type === "image_choice" ||
                    activity.type === "story_scene" ||
                    activity.type === "drag_drop"
                  ? `Find ${word(activity.wordId)}`
                  : activity.type === "match_pairs"
                    ? "Match each picture to its word"
                    : word(activity.wordId)}
            </h1>
            <button
              className="listen-button"
              onClick={() => void play(activity.wordId)}
            >
              <Volume2 /> Listen
            </button>
            <p role="status">{audioError}</p>
            {activity.type === "drag_drop" && (
              <div
                className="generative-drop-target"
                role="group"
                aria-label={`Matching basket for ${word(activity.wordId)}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (activity.choices.includes(id)) void submit([id]);
                }}
              >
                <span aria-hidden="true">🧺</span>
                <p>Drag the matching picture here, or tap it below.</p>
              </div>
            )}
            {"choices" in activity ? (
              <div
                className={`generative-choices ${activity.type === "story_scene" ? "generative-scene" : ""}`}
              >
                {activity.choices.map((id) => (
                  <button
                    className="generative-choice"
                    key={id}
                    disabled={saving || feedback !== null}
                    aria-label={word(id)}
                    draggable={
                      activity.type === "drag_drop" &&
                      !saving &&
                      feedback === null
                    }
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", id)
                    }
                    onClick={() => void submit([id])}
                  >
                    {visual(id)}
                  </button>
                ))}
              </div>
            ) : "wordIds" in activity ? (
              <>
                <div className="generative-choices">
                  {activity.wordIds.map((id, i) => (
                    <div className="generative-choice" key={id}>
                      {visual(id)}
                      <span>{i + 1}</span>
                    </div>
                  ))}
                </div>
                <p>Choose the word for picture {answer.length + 1}.</p>
                <div className="generative-choices">
                  {[...activity.wordIds].reverse().map((id) => (
                    <button
                      key={id}
                      className="primary"
                      disabled={
                        answer.includes(id) || saving || feedback !== null
                      }
                      onClick={() => {
                        const ids = [...answer, id];
                        setAnswer(ids);
                        if (ids.length === activity.wordIds.length)
                          void submit(ids);
                      }}
                    >
                      {word(id)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="generative-visual">
                  {visual(activity.wordId)}
                </div>
                {activity.type === "speak_repeat" && (
                  <p>Say the word together.</p>
                )}
                <button
                  className="primary"
                  disabled={saving || feedback !== null}
                  onClick={() => void submit([])}
                >
                  {activity.type === "speak_repeat" ? "I said it" : "Ready"}
                </button>
              </>
            )}
            {error && (
              <div role="alert">
                <p>{error}</p>
                <button
                  onClick={() =>
                    void (feedback === null ? submit(answer) : next())
                  }
                >
                  Try again
                </button>
              </div>
            )}
            {feedback !== null && (
              <div aria-live="polite">
                <p>{feedback}</p>
                <button
                  className="primary"
                  disabled={saving}
                  onClick={() => void next()}
                >
                  {index === lesson.activities.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {process.env.NODE_ENV === "development" && (
        <details className="generative-inspector">
          <summary>Learning inspector</summary>
          <p>
            Source: {local ? "local" : (lesson.source ?? "server")} · Schema{" "}
            {lesson.schemaVersion} · Difficulty {lesson.difficulty}
          </p>
          <pre>{JSON.stringify(lesson, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
