"use client";
import { useState, useRef } from "react";
import { Search, Check, Heart, SlidersHorizontal } from "lucide-react";
import type { Bootstrap, Status, Concept } from "@/types";
export function VocabularyManager({
  data,
  onRefresh,
}: {
  data: Bootstrap;
  onRefresh: () => void;
}) {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [filter, setFilter] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [selected, setSelected] = useState<Concept | null>(null);
  const vocab = new Map(data.vocabulary.map((v) => [v.conceptId, v]));
  const concepts = data.concepts.filter(
    (c) =>
      c.active &&
      (!category || c.categoryId === category) &&
      (!filter || (vocab.get(c.id)?.status || "NEW") === filter) &&
      c.translations.some((t) =>
        [t.word, t.phraseLevel2, t.phraseLevel3, t.sentence].some((value) =>
          value.toLowerCase().includes(search.trim().toLowerCase()),
        ),
      ),
  );
  const listHeading = useRef<HTMLParagraphElement>(null);
  const pageSize = 24;
  const pages = Math.max(1, Math.ceil(concepts.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = concepts.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  function changePage(next: number) {
    setPage(next);
    listHeading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }
  const selectedTranslation =
    selected?.translations.find(
      (t) => t.language === data.profile.primaryLanguage,
    ) ?? selected?.translations[0];
  async function update(
    conceptId: string,
    values: { status?: Status; comfortableLevel?: number; favorite?: boolean },
  ) {
    setBusy(conceptId);
    setError("");
    try {
      const res = await fetch("/api/vocabulary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId, ...values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="parent-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FAMILIAR WORDS, NEW POSSIBILITIES</p>
          <h1>
            My words<span className="heading-dot">.</span>
          </h1>
          <p>Start with what they know. Grow from there.</p>
        </div>
        <div className="count-badge">
          <Check size={19} />
          {data.vocabulary.filter((v) => v.status === "KNOWN").length} familiar
          words
        </div>
      </div>
      {data.demo && (
        <div className="notice">
          You’re exploring a read-only demo. Set up the database to save your
          child’s words.
        </div>
      )}
      <div className="filters">
        <label className="search-field">
          <Search size={20} />
          <input
            placeholder="Search words or phrases…"
            aria-label="Search words"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filter category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All categories</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter vocabulary status"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All words</option>
          <option value="KNOWN">Knows</option>
          <option value="LEARNING">Learning</option>
          <option value="NEW">New</option>
        </select>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="word-results" ref={listHeading} role="status">
        {concepts.length
          ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, concepts.length)} of ${concepts.length} words`
          : "0 words"}
      </p>
      <div className="word-grid">
        {visible.map((c) => {
          const v = vocab.get(c.id),
            t =
              c.translations.find(
                (t) => t.language === data.profile.primaryLanguage,
              ) || c.translations[0];
          return (
            <article className="word-item" key={c.id}>
              <button
                className="favorite-button"
                aria-label={`${v?.favorite ? "Unfavorite" : "Favorite"} ${t.word}`}
                onClick={() => void update(c.id, { favorite: !v?.favorite })}
                disabled={busy === c.id}
              >
                <Heart size={17} fill={v?.favorite ? "currentColor" : "none"} />
              </button>
              <img
                src={c.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                width={200}
                height={140}
                onError={(e) => {
                  e.currentTarget.src = "/images/fallback.svg";
                }}
              />
              <h3>{t.word}</h3>
              <div className="status-controls">
                {(["KNOWN", "LEARNING", "NEW"] as const).map((status) => (
                  <button
                    key={status}
                    aria-pressed={(v?.status || "NEW") === status}
                    disabled={busy === c.id}
                    onClick={() => void update(c.id, { status })}
                  >
                    {status === "KNOWN"
                      ? "Knows"
                      : status === "LEARNING"
                        ? "Learning"
                        : "New"}
                  </button>
                ))}
              </div>
              <button className="word-details" onClick={() => setSelected(c)}>
                <SlidersHorizontal size={14} /> Phrase comfort
              </button>
            </article>
          );
        })}
      </div>
      {pages > 1 && (
        <nav className="word-pagination" aria-label="Word library pages">
          <button
            className="secondary"
            disabled={currentPage === 0}
            onClick={() => changePage(currentPage - 1)}
          >
            Previous words
          </button>
          <span>
            Page {currentPage + 1} of {pages}
          </span>
          <button
            className="secondary"
            disabled={currentPage >= pages - 1}
            onClick={() => changePage(currentPage + 1)}
          >
            Next words
          </button>
        </nav>
      )}
      {!concepts.length && (
        <div className="empty-state">
          <Search size={32} />
          <h2>No words here yet</h2>
          <p>Try a different search or category.</p>
        </div>
      )}
      {selected && (
        <div className="modal-backdrop">
          <div
            className="gate-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Phrase progression"
          >
            <h2>{selectedTranslation!.word}</h2>
            <p>Advance only when this phrase feels comfortable together.</p>
            {[1, 2, 3].map((level) => (
              <button
                className="comfort-option"
                key={level}
                disabled={busy === selected.id}
                onClick={() =>
                  void update(selected.id, { comfortableLevel: level })
                }
              >
                <span>
                  {
                    [
                      selectedTranslation!.word,
                      selectedTranslation!.phraseLevel2,
                      selectedTranslation!.phraseLevel3,
                    ][level - 1]
                  }
                </span>
                <span>
                  {vocab.get(selected.id)?.comfortableLevel === level ? (
                    <Check size={18} />
                  ) : (
                    "Comfortable"
                  )}
                </span>
              </button>
            ))}
            <button
              className="secondary"
              onClick={() =>
                void update(selected.id, {
                  comfortableLevel: Math.max(
                    1,
                    (vocab.get(selected.id)?.comfortableLevel || 1) - 1,
                  ),
                })
              }
            >
              Keep practicing
            </button>
            <button className="primary" onClick={() => setSelected(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
