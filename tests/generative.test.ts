import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateActivity,
  generateLocalLesson,
  validateLesson,
  updateMastery,
  calculateNoveltyScore,
  difficultyFor,
  type ChildLearningContext,
} from "../lib/generative/domain";
import { generateLearningExperience } from "../lib/generative/service";
const context: ChildLearningContext = {
  vocabulary: [
    { wordId: "apple", choiceIds: ["dog", "cat"] },
    { wordId: "dog", choiceIds: ["apple", "cat"] },
    { wordId: "cat", choiceIds: ["apple", "dog"] },
  ],
  mastery: {},
  recentHistory: [],
  language: "EN",
  primaryLanguage: "EN",
  learningLanguages: ["EN", "DE", "MY"],
  count: 5,
};
test("local lessons are deterministic, bounded and valid", () => {
  const lesson = generateLocalLesson(context, "test");
  assert.deepEqual(lesson, generateLocalLesson(context, "test"));
  assert.equal(lesson.schemaVersion, "1.0");
  assert.equal(lesson.activities.length, 5);
  assert.equal(lesson.activities[0].type, "learn_card");
  assert.ok(lesson.activities.every((a) => a.difficulty === 1));
  assert.deepEqual(validateLesson(lesson, context), lesson);
});
test("rejects code, unsupported versions, vocabulary, enums and malformed choices", () => {
  const lesson = generateLocalLesson(context, "test");
  for (const altered of [
    { ...lesson, html: "<script/>" },
    { ...lesson, schemaVersion: "2.0" },
    { ...lesson, theme: "evil" },
    { ...lesson, reward: { type: "loot" } },
    {
      ...lesson,
      activities: lesson.activities.map((a) => ({
        ...a,
        wordId: "https://evil.com",
      })),
    },
    {
      ...lesson,
      activities: lesson.activities.map((a) => ({ ...a, wordId: "unknown" })),
    },
    {
      ...lesson,
      activities: lesson.activities.map((a) => ({ ...a, type: "ReactCard" })),
    },
  ])
    assert.throws(() => validateLesson(altered, context));
  const choiceIndex = lesson.activities.findIndex((a) => "choices" in a);
  for (const choices of [
    ["dog", "cat"],
    ["apple", "apple"],
    ["apple", "unknown"],
    ["apple", "dog", "cat"],
  ]) {
    const copy = structuredClone(lesson);
    copy.activities[choiceIndex] = {
      activityId: "choice",
      type: "image_choice",
      wordId: "apple",
      difficulty: 1,
      choices,
    };
    assert.throws(() => validateLesson(copy, context));
  }
});
test("mastery uses measured correct answers and running response time", () => {
  let m = updateMastery(undefined, "apple", true, 1000, "2026-10-30T00:00:00Z");
  m = updateMastery(m, "apple", false, 3000, "2026-10-30T00:00:01Z");
  assert.equal(m.masteryScore, 0.5);
  assert.equal(m.attempts, 2);
  assert.equal(m.incorrect, 1);
  assert.equal(m.averageResponseTime, 2000);
  assert.equal(
    difficultyFor({ ...context, mastery: { apple: m } }, "apple"),
    1,
  );
  m = updateMastery(m, "apple", true, 1000, "2026-10-30T00:00:02Z");
  assert.equal(
    difficultyFor({ ...context, mastery: { apple: m } }, "apple"),
    2,
  );
  assert.equal(
    difficultyFor({ ...context, age: 3, mastery: { apple: m } }, "apple"),
    1,
  );
});
test("novelty varies presentation while repeating vocabulary", () => {
  const first = generateLocalLesson(context, "one");
  const next = generateLocalLesson(
    { ...context, recentHistory: [first] },
    "two",
  );
  assert.notEqual(first.theme, next.theme);
  assert.notEqual(first.palette, next.palette);
  assert.notEqual(first.reward.type, next.reward.type);
  assert.ok(calculateNoveltyScore(next, [first]) >= 0.75);
  assert.equal(first.activities[0].wordId, next.activities[0].wordId);
});
test("provider failure and untrusted responses produce valid fallback", async () => {
  for (const provider of [
    {
      async generateLesson() {
        throw new Error("Unavailable");
      },
    },
    {
      async generateLesson() {
        return { html: "<script/>" };
      },
    },
  ]) {
    const result = await generateLearningExperience(context, "safe", provider);
    assert.equal(result.source, "fallback");
    assert.equal(result.lesson.lessonId, "safe");
    validateLesson(result.lesson, context);
  }
});
test("AI IDs are replaced by server IDs", async () => {
  const result = await generateLearningExperience(context, "server", {
    async generateLesson() {
      return generateLocalLesson(context, "model");
    },
  });
  assert.equal(result.source, "AI");
  assert.equal(result.lesson.lessonId, "server");
  assert.equal(result.lesson.activities[0].activityId, "server-0");
});
test("empty and sparse catalogues fail safely or use introductions", () => {
  assert.throws(() => generateLocalLesson({ ...context, vocabulary: [] }));
  const sparse = generateLocalLesson({
    ...context,
    vocabulary: [{ wordId: "apple", choiceIds: [] }],
  });
  assert.ok(
    sparse.activities.every(
      (a) => a.type === "learn_card" || a.type === "speak_repeat",
    ),
  );
});

test("advanced activities remain approved and measured mastery gates difficulty", () => {
  const mastery = Object.fromEntries(
    context.vocabulary.map((v) => [
      v.wordId,
      {
        wordId: v.wordId,
        attempts: 5,
        correct: 5,
        incorrect: 0,
        masteryScore: 1,
        lastSeenAt: "2026-10-30T00:00:00Z",
      },
    ]),
  );
  const advanced = { ...context, mastery };
  const lesson = generateLocalLesson(advanced, "advanced");
  assert.ok(lesson.activities.some((a) => a.type === "story_scene"));
  assert.ok(lesson.activities.some((a) => a.type === "match_pairs"));
  const drag = structuredClone(lesson);
  const choiceIndex = drag.activities.findIndex((a) => "choices" in a);
  const original = drag.activities[choiceIndex];
  if (!("choices" in original)) throw new Error("Missing choice");
  drag.activities[choiceIndex] = { ...original, type: "drag_drop" };
  validateLesson(drag, advanced);
  assert.throws(() => validateLesson(drag, context));
});

test("activity sequence continues varying after history reaches its bound", () => {
  let history = [] as ReturnType<typeof generateLocalLesson>[];
  let previous = "";
  for (let i = 0; i < 12; i++) {
    const lesson = generateLocalLesson(
      { ...context, recentHistory: history },
      `lesson-${i}`,
    );
    const sequence = lesson.activities.map((a) => a.type).join();
    if (i) assert.notEqual(sequence, previous);
    previous = sequence;
    history = [lesson, ...history].slice(0, 5);
  }
});

test("compatible provider bounds transport and strips historical tracking IDs", async () => {
  const { configuredProvider } = await import("../lib/generative/service");
  const env = {
    GENERATIVE_AI_ENDPOINT:
      "https://approved-provider.example/v1/chat/completions",
    GENERATIVE_AI_API_KEY: "test-key",
    GENERATIVE_AI_MODEL: "test-model",
  };
  assert.equal(configuredProvider({ env: {} }), undefined);
  const previous = generateLocalLesson(context, "tracking-id");
  const provider = configuredProvider({
    env,
    fetch: async (_url, init) => {
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal);
      const body = JSON.parse(init!.body as string);
      assert.equal(body.model, "test-model");
      assert.equal(body.messages[0].role, "system");
      assert.ok(!body.messages[1].content.includes("tracking-id"));
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify(generateLocalLesson(context, "proposal")),
            },
          },
        ],
      });
    },
  });
  const result = await generateLearningExperience(
    { ...context, recentHistory: [previous] },
    "safe-transport",
    provider,
  );
  assert.equal(result.source, "AI");
  const oversized = configuredProvider({
    env,
    fetch: async () => new Response("x".repeat(70000)),
  });
  assert.equal(
    (await generateLearningExperience(context, "bounded", oversized)).source,
    "fallback",
  );
});

test("shared scoring validates selections and keeps acknowledgements out of mastery", () => {
  const base = { activityId: "a", wordId: "apple", difficulty: 1 as const };
  const choice = {
    ...base,
    type: "listen_choice" as const,
    choices: ["apple", "dog"],
  };
  assert.equal(evaluateActivity(choice, ["apple"]), true);
  assert.equal(evaluateActivity(choice, ["dog"]), false);
  for (const ids of [[], ["unknown"], ["apple", "dog"]])
    assert.throws(() => evaluateActivity(choice, ids));
  const pairs = {
    ...base,
    type: "match_pairs" as const,
    wordIds: ["apple", "dog"],
  };
  assert.equal(evaluateActivity(pairs, ["apple", "dog"]), true);
  assert.equal(evaluateActivity(pairs, ["dog", "apple"]), false);
  assert.throws(() => evaluateActivity(pairs, ["apple", "apple"]));
  for (const type of ["learn_card", "speak_repeat"] as const) {
    assert.equal(evaluateActivity({ ...base, type }, []), null);
    assert.throws(() => evaluateActivity({ ...base, type }, ["apple"]));
  }
});
