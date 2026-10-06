"use client";
import { useState } from "react";
import { Plus, Camera, Pencil, Check, X, Upload, Search } from "lucide-react";
import type { Bootstrap, Concept, Translation, Language } from "@/types";
export function ContentEditor({
  data,
  custom,
  onRefresh,
}: {
  data: Bootstrap;
  custom: boolean;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<Concept | null>(null),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(""),
    [lang, setLang] = useState<Language>("EN");
  const list = data.concepts.filter(
    (c) =>
      (custom ? Boolean(c.childId) : !c.childId) &&
      c.translations.some((t) =>
        t.word.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  function create() {
    setSuccess("");
    setError("");
    setLang("EN");
    setEditing({
      id: "",
      slug: "",
      categoryId: data.categories[0]?.id || "vehicles",
      imageUrl: "/images/fallback.svg",
      type: "OBJECT",
      difficulty: 1,
      active: true,
      childId: custom ? data.profile.id : null,
      translations: (["EN", "MY", "DE"] as const).map((language) => ({
        language,
        word: "",
        phraseLevel2: "",
        phraseLevel3: "",
        sentence: "",
        promptText:
          language === "MY"
            ? "ဒါ ဘာလဲ။"
            : language === "DE"
              ? "Was siehst du?"
              : "What can you see?",
        needsReview: language === "MY",
      })),
    });
  }
  function field(key: keyof Concept, value: unknown) {
    setEditing((old) => (old ? { ...old, [key]: value } : null));
  }
  function translationField(key: keyof Translation, value: string | boolean) {
    setEditing((old) =>
      old
        ? {
            ...old,
            translations: old.translations.map((t) =>
              t.language === lang ? { ...t, [key]: value } : t,
            ),
          }
        : null,
    );
  }
  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editing,
          id: editing.id || undefined,
          custom,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEditing(null);
      setSuccess("Your card is saved. It can now appear in learning sessions.");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save card.");
    } finally {
      setBusy(false);
    }
  }
  const t = editing?.translations.find((t) => t.language === lang);
  return (
    <section className="parent-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {custom
              ? "FAMILIAR FACES & FAVORITE THINGS"
              : "CURATED, ONE PHRASE AT A TIME"}
          </p>
          <h1>
            {custom ? "My world" : "Content library"}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {custom
              ? "Their cup. Their teddy. Their very own little world."
              : "Manage images, language, and gentle phrase expansions."}
          </p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={20} />
          {custom ? "Add a photo card" : "Create concept"}
        </button>
      </div>
      {data.demo && (
        <div className="notice">
          Demo mode: explore the editor. Database configuration is required to
          save.
        </div>
      )}
      {success && (
        <p role="status" className="success-message">
          <Check size={18} />
          {success}
        </p>
      )}
      <label className="search-field content-search">
        <Search size={20} />
        <input
          aria-label="Search content"
          placeholder="Find a card…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="world-grid">
        {list.map((c) => (
          <article className="world-card" key={c.id}>
            <div>
              <img
                src={c.imageUrl}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = "/images/fallback.svg";
                }}
              />
              {!c.active && <span className="inactive-badge">Paused</span>}
            </div>
            <h3>{c.translations.find((t) => t.language === "EN")?.word}</h3>
            <p>
              {c.translations.find((t) => t.language === "EN")?.phraseLevel2}
            </p>
            <button
              className="secondary"
              onClick={() => {
                setEditing({
                  ...structuredClone(c),
                  slug:
                    custom && c.slug.startsWith(`${data.profile.id}--`)
                      ? c.slug.slice(data.profile.id.length + 2)
                      : c.slug,
                });
                setError("");
                setLang("EN");
              }}
            >
              <Pencil size={16} />
              Edit card
            </button>
          </article>
        ))}
      </div>
      {!list.length && (
        <div className="empty-state">
          <Camera size={42} />
          <h2>
            {custom ? "Make the familiar feel special" : "No matching cards"}
          </h2>
          <p>
            {custom
              ? "Add a photo of a favorite toy, a family member, or something you use every day."
              : "Try a different search."}
          </p>
          {custom && (
            <button className="primary" onClick={create}>
              <Plus size={18} />
              Add your first card
            </button>
          )}
        </div>
      )}
      {editing && t && (
        <div className="modal-backdrop editor-backdrop">
          <section
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <header>
              <h2 id="editor-title">
                {editing.id ? "Edit card" : "A new little word"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close editor"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </header>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="editor-image">
                <img
                  src={editing.imageUrl}
                  alt="Card preview"
                  onError={(e) => {
                    e.currentTarget.src = "/images/fallback.svg";
                  }}
                />
                <label className="upload-label">
                  <Upload size={19} />
                  Upload photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      setError("");
                      try {
                        const form = new FormData();
                        form.append("file", file);
                        const res = await fetch("/api/upload", {
                          method: "POST",
                          body: form,
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error);
                        field("imageUrl", json.url);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Could not upload.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
              </div>
              <div className="form-columns">
                <label>
                  Card identifier
                  <input
                    required
                    pattern="[a-z0-9-]+"
                    maxLength={100}
                    placeholder="my-blue-truck"
                    value={editing.slug}
                    onChange={(e) => field("slug", e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={editing.categoryId}
                    onChange={(e) => field("categoryId", e.target.value)}
                  >
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Image path
                <input
                  required
                  value={editing.imageUrl}
                  onChange={(e) => field("imageUrl", e.target.value)}
                />
              </label>
              <div className="editor-language-tabs">
                {(["EN", "MY", "DE"] as const).map((l) => (
                  <button
                    type="button"
                    key={l}
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                  >
                    {l === "MY" ? "မြန်မာ" : l === "EN" ? "English" : "Deutsch"}
                  </button>
                ))}
              </div>
              {t.needsReview && (
                <div className="notice">
                  This is reviewable language content. Check natural phrasing
                  before using it with your child.
                </div>
              )}
              {(
                [
                  "word",
                  "phraseLevel2",
                  "phraseLevel3",
                  "sentence",
                  "promptText",
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  {
                    [
                      "1 · Word",
                      "2 · Short phrase",
                      "3 · Richer phrase",
                      "4 · Simple sentence",
                      "Parent question",
                    ][i]
                  }
                  <input
                    required
                    value={t[key]}
                    maxLength={200}
                    onChange={(e) => translationField(key, e.target.value)}
                  />
                </label>
              ))}
              <details>
                <summary>Recorded audio paths</summary>
                <p className="field-help">
                  Add files to public/audio. Recorded audio plays first. Level 3
                  uses an optional browser voice.
                </p>
                {(
                  [
                    "audioWordUrl",
                    "audioPhraseUrl",
                    "audioSentenceUrl",
                  ] as const
                ).map((key) => (
                  <label key={key}>
                    {key === "audioWordUrl"
                      ? "Word audio"
                      : key === "audioPhraseUrl"
                        ? "Level 2 audio"
                        : "Sentence audio"}
                    <input
                      placeholder="/audio/en/my-truck.mp3"
                      value={t[key] || ""}
                      onChange={(e) => translationField(key, e.target.value)}
                    />
                  </label>
                ))}
              </details>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={!t.needsReview}
                  onChange={(e) =>
                    translationField("needsReview", !e.target.checked)
                  }
                />
                Language reviewed by parent
              </label>
              <div className="form-columns">
                <label>
                  Difficulty
                  <select
                    value={editing.difficulty}
                    onChange={(e) =>
                      field("difficulty", Number(e.target.value))
                    }
                  >
                    {[1, 2, 3, 4].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Concept type
                  <select
                    value={editing.type}
                    onChange={(e) => field("type", e.target.value)}
                  >
                    {["OBJECT", "ACTION", "COLOR", "DESCRIPTION", "PERSON"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => field("active", e.target.checked)}
                />
                Include in sessions
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save card"}
                <Check size={18} />
              </button>
              <p className="field-help">
                Fill all three language tabs with curated phrases. Nothing is
                translated automatically.
              </p>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
