"use client";
import { Check, LockKeyhole, ArrowRight, Leaf } from "lucide-react";
import { levels } from "@/lib/content/levels";
import { missionTrack, missionUnlocked } from "@/lib/content/track";
import type { Bootstrap, Language } from "@/types";
export function MissionTrack({
  data,
  language,
  busy,
  onStart,
  onConfirm,
}: {
  data: Bootstrap;
  language: Language;
  busy: boolean;
  onStart: (id: string) => void;
  onConfirm: (id: string) => void;
}) {
  const completed = data.missionProgress.filter(
    (p) => p.language === language && p.completedAt,
  ).length;
  return (
    <section className="parent-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A PATH TO EXPLORE TOGETHER</p>
          <h1>
            Our little mission path<span className="heading-dot">.</span>
          </h1>
          <p>Words become phrases. Phrases become little sentences.</p>
        </div>
      </div>
      <div className="track-intro">
        <Leaf size={24} />
        <div>
          <strong>
            {completed} of {missionTrack.length} shared adventures explored
          </strong>
          <p>
            One short practice, then an activity away from the screen. A point,
            a look, or a word all count as taking part. You decide when to
            continue.
          </p>
        </div>
      </div>
      {data.demo && (
        <p className="notice">
          This is a preview. Mission progress needs a configured database and
          your parent password.
        </p>
      )}
      {levels.map((l) => (
        <section className="track-level" key={l.level}>
          <div className="track-level-heading">
            <span className="level-circle">{l.level}</span>
            <div>
              <h2>{l.title}</h2>
              <p>{l.description}</p>
              <span className="phrase-example">“{l.example}”</span>
            </div>
          </div>
          <div className="track-missions">
            {missionTrack
              .filter((m) => m.level === l.level)
              .map((m) => {
                const progress = data.missionProgress.find(
                  (p) => p.missionId === m.id && p.language === language,
                );
                const done = !!progress?.completedAt,
                  unlocked = missionUnlocked(
                    m.id,
                    language,
                    data.missionProgress,
                  );
                return (
                  <article
                    className={`track-mission ${done ? "mission-completed" : ""}`}
                    key={m.id}
                  >
                    <div className="mission-heading">
                      <span className="round-symbol">
                        {done ? (
                          <Check size={23} />
                        ) : unlocked ? (
                          <Leaf size={23} />
                        ) : (
                          <LockKeyhole size={22} />
                        )}
                      </span>
                      <div>
                        <h3>{m.title}</h3>
                        <small>
                          {done
                            ? "Explored together"
                            : !unlocked
                              ? "Available after the earlier mission"
                              : progress?.readyToConfirm
                                ? "Ready for your real-world activity"
                                : progress
                                  ? "Started — practice again any time"
                                  : "Ready when you are"}
                        </small>
                      </div>
                    </div>
                    <p
                      className="track-activity"
                      lang={
                        language === "MY"
                          ? "my"
                          : language === "DE"
                            ? "de"
                            : "en"
                      }
                    >
                      {m.activity[language]}
                    </p>
                    <button
                      className={done ? "secondary" : "primary"}
                      disabled={!unlocked || busy || data.demo}
                      onClick={() => onStart(m.id)}
                    >
                      {done
                        ? "Practice again"
                        : progress?.readyToConfirm
                          ? "Repeat practice"
                          : progress
                            ? "Continue practice"
                            : "Start mission"}
                      <ArrowRight size={18} />
                    </button>
                    {!done && progress?.readyToConfirm && (
                      <button
                        className="secondary confirm-mission"
                        disabled={busy || data.demo}
                        onClick={() => onConfirm(m.id)}
                      >
                        <Check size={18} />
                        We explored it together
                      </button>
                    )}
                  </article>
                );
              })}
          </div>
        </section>
      ))}
      <p className="field-help">
        Language paths are separate. Repeating is always welcome. There are no
        scores, streaks, or deadlines.
      </p>
    </section>
  );
}
