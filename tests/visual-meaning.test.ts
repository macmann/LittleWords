import { test } from "node:test";
import assert from "node:assert/strict";
import { access, stat } from "node:fs/promises";
import { concepts } from "../lib/content/catalogue";
import {
  meaningVisual,
  meaningVisuals,
  meaningSheets,
} from "../lib/content/visuals";
import { pictureOptions } from "../lib/adventure/picture-options";
import { curatedPlan, validateProposal, readPlan } from "../lib/adventure/plan";
const find = (slug: string) => concepts.find((c) => c.slug === slug)!;
test("reported concepts and every action and description have reviewed, distinct meaning art", async () => {
  for (const c of concepts.filter((c) =>
    ["actions", "colors"].includes(c.categoryId),
  ))
    assert.ok(meaningVisual(c), c.slug);
  for (const [a, b] of [
    ["empty", "full"],
    ["sad", "happy"],
    ["wet", "water"],
    ["open", "close"],
    ["table", "chair"],
    ["toothpaste", "toothbrush"],
    ["push", "pull"],
    ["river", "lake"],
    ["dress", "skirt"],
  ]) {
    assert.ok(meaningVisual(find(a)), a);
    assert.notDeepEqual(
      meaningVisual(find(a)),
      meaningVisual(find(b)),
      `${a}/${b}`,
    );
  }
  for (const [sheet, slugs] of Object.entries(meaningSheets)) {
    assert.equal(slugs.length, 16);
    assert.equal(new Set(slugs).size, 16);
    await access(`public/images/meaning/${sheet}-v1.webp`);
    assert.ok(
      (await stat(`public/images/meaning/${sheet}-v1.webp`)).size < 500_000,
      "mobile art sheets stay small",
    );
    for (const slug of slugs) assert.ok(find(slug), slug);
  }
  assert.equal(Object.keys(meaningVisuals).length, 163);
});
test("parent photos and edited image URLs are never replaced by stock art", () => {
  assert.equal(meaningVisual({ ...find("sad"), childId: "own-child" }), null);
  assert.equal(
    meaningVisual({ ...find("sad"), imageUrl: "/api/photos/private.webp" }),
    null,
  );
  assert.equal(
    meaningVisual({ ...find("wet"), imageUrl: "/images/parent-review.svg" }),
    null,
  );
});
test("picture choices pair meaningful opposites, not random food or subjective states", () => {
  assert.deepEqual(
    pictureOptions(find("sad"), concepts).map((c) => c.slug),
    ["happy"],
  );
  assert.deepEqual(
    pictureOptions(find("empty"), concepts).map((c) => c.slug),
    ["full"],
  );
  assert.deepEqual(
    pictureOptions(find("wet"), concepts).map((c) => c.slug),
    ["dry"],
  );
  assert.equal(
    pictureOptions(find("car"), concepts).some((c) => c.categoryId === "food"),
    false,
  );
  for (const slug of [
    "run",
    "open",
    "close",
    "hungry",
    "thirsty",
    "warm",
    "hot",
    "cold",
    "soft",
    "hard",
    "mama",
    "uncle",
    "big",
    "small",
  ])
    assert.deepEqual(pictureOptions(find(slug), concepts), [], slug);
  const edited = { ...find("sad"), imageUrl: "/api/photos/custom.png" };
  assert.deepEqual(pictureOptions(edited, concepts), []);
});
test("AI layouts cannot override picture eligibility; old unsafe pairings resume with repaired layouts", () => {
  const cards = ["sad", "empty", "wet"].map((slug, sequence) => ({
    conceptId: find(slug).id,
    sequence,
    levelShown: sequence + 1,
  }));
  const plan = curatedPlan(cards, concepts);
  validateProposal(
    { theme: plan.theme, activities: plan.activities },
    cards,
    concepts,
  );
  assert.equal(plan.activities[0].optionId, "happy");
  const wrong = {
    ...plan,
    activities: plan.activities.map((a, i) =>
      i === 0 ? { ...a, optionId: "mango" } : a,
    ),
  };
  assert.throws(() =>
    validateProposal(
      { theme: wrong.theme, activities: wrong.activities },
      cards,
      concepts,
    ),
  );
  const repaired = readPlan(wrong, cards, concepts)!;
  assert.equal(repaired.source, "curated");
  assert.equal(repaired.fallbackReason, "invalid_plan");
  assert.equal(repaired.activities[0].optionId, "happy");
  assert.deepEqual(
    repaired.activities.map((a) => a.conceptId),
    cards.map((c) => c.conceptId),
  );
  const unknown = {
    ...wrong,
    activities: wrong.activities.map((a) => ({ ...a, conceptId: "foreign" })),
  };
  assert.equal(readPlan(unknown, cards, concepts), null);
});
test("action-only adventures remain finite without forcing an impossible picture question", () => {
  const cards = ["run", "jump", "wash"].map((slug, sequence) => ({
    conceptId: slug,
    sequence,
    levelShown: 2,
  }));
  const plan = curatedPlan(cards, concepts);
  assert.equal(
    plan.activities.some((a) => a.kind === "PICTURE_CHOICE"),
    false,
  );
  assert.equal(new Set(plan.activities.map((a) => a.kind)).size, 2);
  validateProposal(
    { theme: plan.theme, activities: plan.activities },
    cards,
    concepts,
  );
});
