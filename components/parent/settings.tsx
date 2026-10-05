"use client";
import { useState } from "react";
import { Check, ShieldCheck, Volume2, Library, ArrowRight } from "lucide-react";
import type { Bootstrap, Language, Profile } from "@/types";
export function Settings({
  data,
  onRefresh,
  browserVoice,
  onVoiceChange,
  onAdmin,
}: {
  data: Bootstrap;
  onRefresh: () => void;
  browserVoice: boolean;
  onVoiceChange: (v: boolean) => void;
  onAdmin: () => void;
}) {
  const [profile, setProfile] = useState<Profile>(data.profile),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <section className="parent-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOU KNOW YOUR CHILD BEST</p>
          <h1>
            Parent area<span className="heading-dot">.</span>
          </h1>
          <p>Small steps. Their pace. Together.</p>
        </div>
        <div className="count-badge">
          <ShieldCheck size={19} />
          Parent mode
        </div>
      </div>
      <div className="settings-layout">
        <form
          className="settings-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error);
              setSaved(true);
              onRefresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Your little learner</h2>
          <label>
            Child’s name
            <input
              required
              maxLength={50}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </label>
          <label>
            Primary language
            <select
              value={profile.primaryLanguage}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  primaryLanguage: e.target.value as Language,
                })
              }
            >
              <option value="EN">English</option>
              <option value="MY">Burmese / Myanmar</option>
              <option value="DE">German</option>
            </select>
          </label>
          <fieldset>
            <legend>Available languages</legend>
            {(["EN", "MY", "DE"] as const).map((l) => (
              <label className="checkbox-row" key={l}>
                <input
                  type="checkbox"
                  checked={profile.enabledLanguages.includes(l)}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      enabledLanguages: e.target.checked
                        ? [...profile.enabledLanguages, l]
                        : profile.enabledLanguages.filter((v) => v !== l),
                    })
                  }
                />
                {l === "EN"
                  ? "English"
                  : l === "MY"
                    ? "Burmese / Myanmar"
                    : "German"}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Cards per session</legend>
            <div className="length-options">
              {[5, 8, 10, 12].map((n) => (
                <button
                  type="button"
                  aria-pressed={n === profile.cardsPerSession}
                  onClick={() => setProfile({ ...profile, cardsPerSession: n })}
                  key={n}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="field-help">
              Includes a real-world pause after every four word cards. Sessions
              always end.
            </p>
          </fieldset>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="success-message">
              <Check size={18} />
              Settings saved
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
            <Check size={18} />
          </button>
        </form>
        <div className="settings-aside">
          <article className="settings-card">
            <Volume2 size={26} />
            <h2>A familiar voice</h2>
            <p>
              Your recordings always play first. An optional device voice can
              read curated phrases when no recording is available.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={browserVoice}
                onChange={(e) => onVoiceChange(e.target.checked)}
              />
              Allow device voice on this browser
            </label>
            <p className="field-help">
              Voice availability varies. Myanmar often needs a recording or a
              grown-up reading aloud.
            </p>
          </article>
          <article className="settings-card">
            <Library size={26} />
            <h2>Make every word feel right</h2>
            <p>
              Review translations, add recordings, and manage the content
              library.
            </p>
            <button className="secondary" onClick={onAdmin}>
              Open content library
              <ArrowRight size={17} />
            </button>
          </article>
          <article className="guidance-note">
            <HeartIcon />
            <h3>You’re the most important part.</h3>
            <p>
              Wait for a look, a point, or a word. Then add just a little more.
              There’s no right speed and no need to finish every card.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
function HeartIcon() {
  return <span className="little-heart">♡</span>;
}
