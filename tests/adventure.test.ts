import { test } from "node:test";
import assert from "node:assert/strict";
import { demoData } from "../lib/db/demo";
import { curatedPlan, validateProposal, readPlan } from "../lib/adventure/plan";
import { planAdventure } from "../lib/ai/provider";
const data = demoData();
const pool = data.concepts.slice(0, 8);
const cards = pool
  .slice(0, 3)
  .map((c, sequence) => ({
    conceptId: c.id,
    sequence,
    levelShown: sequence + 2,
  }));
const input = {
  cards,
  pool,
  language: "EN" as const,
  enabled: true,
  knownIds: [cards[0].conceptId],
  seed: 2,
};
const base = curatedPlan(cards, pool, 2);
const proposal = { theme: base.theme, activities: base.activities };
test("finite fallback preserves chosen concepts and stages, and resume validates the snapshot", () => {
  assert.deepEqual(readPlan(base, cards, pool), base);
  assert.equal(new Set(base.activities.map((a) => a.kind)).size, 3);
  assert.deepEqual(
    base.activities.map((a) => a.conceptId),
    cards.map((c) => c.conceptId),
  );
  assert.equal(cards[2].levelShown, 4);
  assert.equal(readPlan({ ...base, html: "<script>" }, cards, pool), null);
});
test("untrusted layouts cannot change content, add executable UI, repeat cards or use private choices", () => {
  const invalid = [
    { ...proposal, theme: "unknown" },
    { ...proposal, title: "generated words" },
    { ...proposal, activities: proposal.activities.slice(1) },
    {
      ...proposal,
      activities: proposal.activities.map((a) => ({ ...a, levelShown: 4 })),
    },
    {
      ...proposal,
      activities: proposal.activities.map((a) => ({
        ...a,
        conceptId: "foreign",
      })),
    },
    {
      ...proposal,
      activities: proposal.activities.map((a) => ({ ...a, sequence: 0 })),
    },
    {
      ...proposal,
      activities: proposal.activities.map((a) =>
        a.kind === "PICTURE_CHOICE" ? { ...a, optionId: a.conceptId } : a,
      ),
    },
    {
      ...proposal,
      activities: proposal.activities.map((a) =>
        a.kind === "PICTURE_CHOICE" ? { ...a, optionId: "private-photo" } : a,
      ),
    },
  ];
  for (const value of invalid)
    assert.throws(() => validateProposal(value, cards, pool));
});
for (const provider of ["openai", "deepseek"] as const)
  test(`${provider} uses server credentials and sends approved labels without private data`, async () => {
    const privateCard = {
      ...pool[0],
      id: "private-photo",
      childId: "private-child",
      imageUrl: "/private/family.jpg",
    };
    let calls = 0;
    const result = await planAdventure(
      {
        ...input,
        pool: [...pool, privateCard],
        knownIds: [...input.knownIds, privateCard.id],
      },
      {
        env: {
          AI_PROVIDER: provider,
          OPENAI_API_KEY: "test-key",
          DEEPSEEK_API_KEY: "test-key",
        },
        fetch: (async (url, init) => {
          calls++;
          assert.equal(
            url,
            provider === "openai"
              ? "https://api.openai.com/v1/chat/completions"
              : "https://api.deepseek.com/chat/completions",
          );
          assert.equal(
            (init!.headers as Record<string, string>).Authorization,
            "Bearer test-key",
          );
          const body = String(init!.body);
          for (const forbidden of [
            "private-photo",
            "private-child",
            "family.jpg",
            "imageUrl",
            "ageMonths",
            "email",
            "test-key",
          ])
            assert.ok(!body.includes(forbidden));
          const payload = JSON.parse(JSON.parse(body).messages[1].content);
          assert.equal(payload.cards[0].level, 2);
          assert.equal(payload.cards[0].familiar, true);
          return Response.json({
            choices: [{ message: { content: JSON.stringify(proposal) } }],
          });
        }) as typeof fetch,
      },
    );
    assert.equal(calls, 1);
    assert.equal(result.source, provider);
    assert.deepEqual(result.activities, base.activities);
  });
test("opt-out, missing configuration and private targets never contact providers", async () => {
  const never = (async () => {
    throw new Error("must not call");
  }) as typeof fetch;
  assert.equal(
    (
      await planAdventure(
        { ...input, enabled: false },
        {
          env: { AI_PROVIDER: "openai", OPENAI_API_KEY: "test" },
          fetch: never,
        },
      )
    ).fallbackReason,
    "disabled",
  );
  assert.equal(
    (
      await planAdventure(input, {
        env: { AI_PROVIDER: "deepseek" },
        fetch: never,
      })
    ).fallbackReason,
    "not_configured",
  );
  assert.equal(
    (
      await planAdventure(
        { ...input, pool: pool.map((c) => ({ ...c, childId: "private" })) },
        {
          env: { AI_PROVIDER: "openai", OPENAI_API_KEY: "test" },
          fetch: never,
        },
      )
    ).fallbackReason,
    "invalid_plan",
  );
});
test("outages, rejected credentials, oversized or malformed output keep the finite curated adventure", async () => {
  const responses = [
    () => new Response("secret provider diagnostics", { status: 401 }),
    () => new Response("x".repeat(70000)),
    () => Response.json({ choices: [{ message: { content: "not JSON" } }] }),
    () =>
      Response.json({
        choices: [
          {
            message: { content: JSON.stringify({ ...proposal, code: "run" }) },
          },
        ],
      }),
  ];
  for (const response of responses) {
    const plan = await planAdventure(input, {
      env: { AI_PROVIDER: "openai", OPENAI_API_KEY: "test" },
      fetch: (async () => response()) as typeof fetch,
    });
    assert.equal(plan.source, "curated");
    assert.deepEqual(plan.activities, base.activities);
  }
  const plan = await planAdventure(input, {
    env: { AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "test" },
    fetch: (async () => {
      throw new Error("network unavailable");
    }) as typeof fetch,
  });
  assert.equal(plan.fallbackReason, "unavailable");
});
