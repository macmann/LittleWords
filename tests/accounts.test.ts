import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { concepts, categories } from "../lib/content/catalogue";
import { currentAgeMonths } from "../lib/security/age";
import { additionalBurmese } from "../lib/content/additional-burmese";

test("the expanded catalogue has 145 unique cards, at least ten per category, and complete authored stages", async () => {
  assert.equal(concepts.length, 145);
  assert.equal(new Set(concepts.map((c) => c.slug)).size, 145);
  for (const category of categories)
    assert.ok(
      concepts.filter((c) => c.categoryId === category.id).length >= 10,
      category.slug,
    );
  for (const c of concepts) {
    assert.equal(c.translations.length, 3);
    for (const t of c.translations)
      for (const value of [t.word, t.phraseLevel2, t.phraseLevel3, t.sentence])
        assert.ok(value && !value.includes("undefined"));
    await access(path.join(process.cwd(), "public", c.imageUrl));
  }
  assert.equal(Object.keys(additionalBurmese).length, 72);
});

test("age snapshots can support future content without inferring a birthday", () => {
  assert.equal(currentAgeMonths(27, "2026-01-15", new Date("2026-04-14")), 29);
  assert.equal(currentAgeMonths(27, "2026-01-15", new Date("2026-04-15")), 30);
  assert.equal(currentAgeMonths(27, "2026-12-15", new Date("2026-04-15")), 27);
  assert.equal(currentAgeMonths(null, null), null);
});
