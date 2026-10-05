import { test } from "node:test";
import assert from "node:assert/strict";
import { SessionGenerator } from "../lib/session/generator";
import { demoData } from "../lib/db/demo";
import type { Vocabulary } from "../types";
const generator = new SessionGenerator(),
  data = demoData();
test("finite deterministic sessions expand familiar words without duplicates", () => {
  const input = {
    ...data,
    language: "EN" as const,
    numberOfCards: 10,
    seed: 123,
  };
  const cards = generator.generate(input);
  assert.equal(cards.length, 10);
  assert.equal(new Set(cards.map((c) => c.conceptId)).size, 10);
  assert.deepEqual(cards, generator.generate(input));
  assert.equal(
    cards.filter(
      (c) =>
        data.vocabulary.find((v) => v.conceptId === c.conceptId)?.status ===
        "KNOWN",
    ).length,
    5,
  );
  for (const c of cards)
    assert.equal(
      c.levelShown,
      data.vocabulary.find((v) => v.conceptId === c.conceptId)?.status ===
        "KNOWN"
        ? 2
        : 1,
    );
});
test("50/30/20 weighting with populated vocabulary pools", () => {
  const vocabulary: Vocabulary[] = data.concepts.map((c, i) => ({
    conceptId: c.id,
    status: i < 15 ? "KNOWN" : i < 30 ? "LEARNING" : "NEW",
    comfortableLevel: 1,
    seenCount: 0,
    favorite: false,
    parentConfirmed: i < 15,
  }));
  const cards = generator.generate({
    ...data,
    vocabulary,
    language: "DE",
    numberOfCards: 10,
  });
  const counts = { KNOWN: 0, LEARNING: 0, NEW: 0 };
  for (const c of cards)
    counts[vocabulary.find((v) => v.conceptId === c.conceptId)!.status]++;
  assert.deepEqual(counts, { KNOWN: 5, LEARNING: 3, NEW: 2 });
});
test("category selection remains finite when fewer cards exist", () => {
  const sparseConcepts = data.concepts
    .filter((c) => c.categoryId === "family")
    .slice(0, 2);
  const cards = generator.generate({
    ...data,
    language: "MY",
    numberOfCards: 12,
    concepts: sparseConcepts,
    category: "family",
  });
  assert.equal(cards.length, 2);
  assert.ok(
    cards.every(
      (c) =>
        data.concepts.find((x) => x.id === c.conceptId)?.categoryId ===
        "family",
    ),
  );
});
test("disabled content is excluded and empty categories return no cards", () => {
  const cards = generator.generate({
    ...data,
    concepts: data.concepts.map((c) => ({ ...c, active: false })),
    language: "EN",
    numberOfCards: 10,
  });
  assert.deepEqual(cards, []);
});
test("exposure does not advance familiar concepts without parent comfort", () => {
  const vocabulary = data.vocabulary.map((v) => ({ ...v, seenCount: 100 }));
  const cards = generator.generate({
    ...data,
    vocabulary,
    language: "EN",
    numberOfCards: 10,
  });
  assert.ok(
    cards
      .filter(
        (c) =>
          vocabulary.find((v) => v.conceptId === c.conceptId)?.status ===
          "KNOWN",
      )
      .every((c) => c.levelShown === 2),
  );
});
test("parent confirmed phrase comfort unlocks a richer phrase", () => {
  const vocabulary = data.vocabulary.map((v) => ({
    ...v,
    comfortableLevel: 3,
    seenCount: 10,
  }));
  const cards = generator.generate({
    ...data,
    vocabulary,
    language: "EN",
    numberOfCards: 10,
  });
  assert.ok(
    cards
      .filter(
        (c) =>
          vocabulary.find((v) => v.conceptId === c.conceptId)?.status ===
          "KNOWN",
      )
      .every((c) => c.levelShown === 4),
  );
});
test("invalid session lengths are rejected", () => {
  assert.throws(() =>
    generator.generate({ ...data, language: "EN", numberOfCards: 100 }),
  );
});
test("sessions cover every enabled language with authored content", () => {
  for (const language of ["EN", "MY", "DE"] as const) {
    const cards = generator.generate({
      ...data,
      language,
      numberOfCards: 8,
      seed: 42,
    });
    assert.equal(cards.length, 8);
    assert.ok(
      cards.every((c) =>
        data.concepts
          .find((x) => x.id === c.conceptId)
          ?.translations.some((t) => t.language === language),
      ),
    );
  }
});

import {
  familiarExpansion,
  knownConceptSlugs,
} from "../lib/content/expansions";
test("known descriptors choose curated expansions of familiar nouns", () => {
  const truck = data.concepts.find((c) => c.slug === "truck")!;
  const known = knownConceptSlugs(data.concepts, data.vocabulary);
  assert.equal(
    familiarExpansion(truck, "EN", known)?.phraseLevel2,
    "Yellow truck",
  );
  assert.equal(
    familiarExpansion(truck, "DE", known)?.phraseLevel2,
    "Gelber Lastwagen",
  );
});

test("parent edited phrases are never replaced by seed alternatives", () => {
  const truck = data.concepts.find((c) => c.slug === "truck")!;
  const edited = {
    ...truck,
    translations: truck.translations.map((t) =>
      t.language === "EN" ? { ...t, phraseLevel2: "My truck" } : t,
    ),
  };
  assert.equal(
    familiarExpansion(edited, "EN", new Set(["yellow"]))?.phraseLevel2,
    "My truck",
  );
});

test("missions fit within the selected total session length", () => {
  for (const numberOfCards of [5, 8, 10, 12]) {
    const cards = generator.generate({
      ...data,
      language: "EN",
      numberOfCards,
      includeMissions: true,
    });
    assert.equal(cards.length + Math.floor(cards.length / 4), numberOfCards);
  }
});
