import { test } from "node:test";
import assert from "node:assert/strict";
import { missionTrack, missionUnlocked } from "../lib/content/track";
import { SessionGenerator } from "../lib/session/generator";
import { demoData } from "../lib/db/demo";
import { hashPassword, verifyPassword } from "../lib/security/password";
const data = demoData();

test("parent-selected levels override exposure history without changing vocabulary", () => {
  const before = JSON.stringify(data.vocabulary);
  for (const practiceLevel of [1, 2, 3, 4]) {
    const cards = new SessionGenerator().generate({
      ...data,
      language: "EN",
      numberOfCards: 10,
      practiceLevel,
    });
    assert.equal(cards.length, 10);
    assert.ok(cards.every((c) => c.levelShown === practiceLevel));
  }
  assert.equal(JSON.stringify(data.vocabulary), before);
  for (const practiceLevel of [-1, 5, 1.5])
    assert.throws(
      () =>
        new SessionGenerator().generate({
          ...data,
          language: "EN",
          numberOfCards: 5,
          practiceLevel,
        }),
      /level/,
    );
});

test("mission unlocking requires earlier parent confirmations in the same language", () => {
  const first = missionTrack[0].id,
    second = missionTrack[1].id,
    last = missionTrack.at(-1)!.id;
  assert.equal(missionUnlocked(first, "EN", []), true);
  assert.equal(missionUnlocked(second, "EN", []), false);
  const started = [
    { missionId: first, language: "EN" as const, completedAt: null },
  ];
  assert.equal(missionUnlocked(second, "EN", started), false);
  const confirmed = [{ ...started[0], completedAt: new Date().toISOString() }];
  assert.equal(missionUnlocked(second, "EN", confirmed), true);
  assert.equal(missionUnlocked(second, "DE", confirmed), false);
  assert.equal(missionUnlocked(last, "EN", confirmed), false);
  assert.equal(missionUnlocked("missing", "EN", confirmed), false);
  const all = missionTrack.map((m) => ({
    missionId: m.id,
    language: "EN" as const,
    completedAt: new Date().toISOString(),
  }));
  assert.equal(missionUnlocked(last, "EN", all), true);
});

test("all 12 authored missions have finite, available content at their stage in every language", () => {
  assert.equal(missionTrack.length, 12);
  assert.equal(new Set(missionTrack.map((m) => m.id)).size, 12);
  for (const language of ["EN", "MY", "DE"] as const)
    for (const mission of missionTrack) {
      const concepts = data.concepts.filter((c) =>
        mission.conceptSlugs.includes(c.slug),
      );
      assert.equal(concepts.length, mission.conceptSlugs.length);
      const cards = new SessionGenerator().generate({
        ...data,
        concepts,
        language,
        numberOfCards: 5,
        includeMissions: true,
        practiceLevel: mission.level,
      });
      assert.equal(cards.length, 4);
      assert.equal(new Set(cards.map((c) => c.conceptId)).size, 4);
      assert.ok(cards.every((c) => c.levelShown === mission.level));
      assert.ok(mission.activity[language].length > 0);
      for (const c of concepts)
        assert.ok(
          c.translations.find((t) => t.language === language)?.sentence,
        );
    }
});

test("parent passwords are independently salted and verify without plaintext or unsafe hash parsing", async () => {
  const password = "our little shared words မြန်မာ";
  const a = await hashPassword(password),
    b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.equal(a.includes(password), false);
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("another password", a), false);
  assert.equal(await verifyPassword(password, "scrypt:invalid:invalid"), false);
  assert.equal(await verifyPassword("x".repeat(129), a), false);
  await assert.rejects(hashPassword("short"));
});
