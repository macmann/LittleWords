/** Production API integration check. Uses and removes only a fresh random schema.
 * Run after npm run build with DATABASE_URL pointing to a PostgreSQL role that can create schemas. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required for the integration check.");
const admin = new PrismaClient();
const schema = `littlewords_test_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", schema);
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const directory = await mkdtemp(
  path.join(os.tmpdir(), "littlewords-integration-"),
);
const port = process.env.INTEGRATION_PORT || "3120";
const base = `http://localhost:${port}`;
const environment = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: url.toString(),
  UPLOAD_DIR: directory,
  PORT: port,
  APP_ORIGIN: base,
  PARENT_PIN: "",
  PARENT_SESSION_SECRET: randomBytes(32).toString("hex"),
};
let server,
  exit,
  logs = "",
  schemaCreated = false;
function launch(extra = {}) {
  logs = "";
  server = spawn(process.execPath, ["scripts/deploy.mjs"], {
    env: { ...environment, ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  exit = new Promise((resolve) =>
    server.once("exit", (code, signal) => resolve({ code, signal })),
  );
  server.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk;
  });
}
async function stop() {
  if (!server) return;
  server.kill("SIGTERM");
  let timer;
  try {
    await Promise.race([
      exit,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Server did not stop cleanly.")),
          10000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    server = undefined;
  }
}
async function ready() {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw new Error("Production startup exited before readiness.");
    try {
      if ((await fetch(base + "/api/health")).status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Production readiness timed out.");
}
async function request(route, method = "GET", body, cookie, origin = base) {
  return fetch(base + route, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function expect(route, method, body, cookie, status = 200) {
  const res = await request(route, method, body, cookie);
  assert.equal(
    res.status,
    status,
    `${method} ${route} returned unexpected status`,
  );
  return res;
}
function cookieFrom(res) {
  const value = res.headers.get("set-cookie");
  assert.ok(value?.includes("Secure"));
  return value.split(";")[0];
}
async function login(password) {
  return cookieFrom(await expect("/api/gate", "POST", { password }));
}
async function exercise(session) {
  for (const card of session.cards)
    await expect("/api/sessions", "PATCH", {
      sessionId: session.id,
      sequence: card.sequence,
    });
  await expect("/api/sessions", "PATCH", {
    sessionId: session.id,
    complete: true,
  });
}
async function prepareAgain() {
  const child = spawn(
    process.execPath,
    ["scripts/deploy.mjs", "--prepare-only"],
    { env: environment, stdio: "ignore" },
  );
  const code = await new Promise((resolve) => child.once("exit", resolve));
  assert.equal(code, 0);
}
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  launch();
  await ready();
  let bootstrap = await (await expect("/api/bootstrap", "GET")).json();
  assert.equal(bootstrap.security.configured, false);
  assert.equal(bootstrap.security.legacyPinRequired, false);
  assert.equal(bootstrap.concepts.length, 73);
  const password = "shared words test password",
    replacement = "new shared words password";
  const setup = { action: "setup", password, confirmation: password };
  assert.equal(
    (
      await request(
        "/api/gate",
        "POST",
        setup,
        undefined,
        "https://other.example.test",
      )
    ).status,
    403,
  );
  await expect(
    "/api/gate",
    "POST",
    { ...setup, confirmation: "different" },
    undefined,
    400,
  );
  await expect(
    "/api/gate",
    "POST",
    { ...setup, password: "short", confirmation: "short" },
    undefined,
    400,
  );
  const competing = await Promise.all([
    request("/api/gate", "POST", setup),
    request("/api/gate", "POST", setup),
  ]);
  assert.deepEqual(competing.map((r) => r.status).sort(), [200, 409]);
  let cookie = cookieFrom(competing.find((r) => r.status === 200));
  const credential = await db.parentCredential.findUnique({
    where: { id: "household" },
  });
  assert.ok(
    credential.passwordHash.startsWith("scrypt:") &&
      !credential.passwordHash.includes(password),
  );
  await expect(
    "/api/gate",
    "POST",
    { ...setup, password: replacement, confirmation: replacement },
    undefined,
    409,
  );
  await expect(
    "/api/gate",
    "POST",
    { password: "not the password" },
    undefined,
    401,
  );
  cookie = await login(password);
  bootstrap = await (await expect("/api/bootstrap", "GET")).json();
  assert.equal(bootstrap.security.configured, true);
  assert.ok(!JSON.stringify(bootstrap).includes("passwordHash"));
  const input = { childId: "demo-child", language: "EN", numberOfCards: 5 };
  await expect(
    "/api/sessions",
    "POST",
    { ...input, missionId: "name-vehicles" },
    undefined,
    401,
  );
  await expect(
    "/api/sessions",
    "POST",
    { ...input, missionId: "sentence-actions" },
    cookie,
    409,
  );
  await expect(
    "/api/profile",
    "PATCH",
    { ...bootstrap.profile, practiceLevel: 4 },
    undefined,
    401,
  );
  await expect(
    "/api/profile",
    "PATCH",
    { ...bootstrap.profile, practiceLevel: 4 },
    cookie,
  );
  const regular = await (
    await expect("/api/sessions", "POST", { ...input, practiceLevel: 1 })
  ).json();
  assert.ok(regular.cards.every((c) => c.levelShown === 4));
  const first = await (
    await expect(
      "/api/sessions",
      "POST",
      { ...input, missionId: "name-vehicles" },
      cookie,
    )
  ).json();
  assert.equal(first.cards.length, 4);
  assert.ok(first.cards.every((c) => c.levelShown === 1));
  const confirmation = {
    missionId: "name-vehicles",
    language: "EN",
    offlineDone: true,
  };
  await expect("/api/track", "PATCH", confirmation, cookie, 409);
  await expect(
    "/api/sessions",
    "PATCH",
    { sessionId: first.id, complete: true },
    undefined,
    409,
  );
  await expect("/api/sessions", "PATCH", {
    sessionId: first.id,
    sequence: first.cards[0].sequence,
  });
  const resumed = await (
    await expect(
      "/api/sessions",
      "POST",
      { ...input, missionId: first.missionId },
      cookie,
    )
  ).json();
  assert.equal(resumed.id, first.id);
  assert.equal(resumed.resumeSequence, 1);
  for (const card of first.cards) {
    const before = await db.childVocabulary.findUnique({
      where: {
        childId_conceptId: { childId: "demo-child", conceptId: card.conceptId },
      },
    });
    for (let i = 0; i < 2; i++)
      await expect("/api/sessions", "PATCH", {
        sessionId: first.id,
        sequence: card.sequence,
      });
    const after = await db.childVocabulary.findUnique({
      where: {
        childId_conceptId: { childId: "demo-child", conceptId: card.conceptId },
      },
    });
    assert.equal(
      after.seenCount,
      (before?.seenCount || 0) + (card.sequence === 0 ? 0 : 1),
    );
  }
  await expect("/api/sessions", "PATCH", {
    sessionId: first.id,
    complete: true,
  });
  await expect("/api/track", "PATCH", confirmation, undefined, 401);
  await expect(
    "/api/track",
    "PATCH",
    { ...confirmation, offlineDone: false },
    cookie,
    400,
  );
  await expect("/api/track", "PATCH", confirmation, cookie);
  const confirmedAt = (
    await db.missionProgress.findFirst({
      where: { missionId: first.missionId, language: "EN" },
    })
  ).completedAt.toISOString();
  await expect("/api/track", "PATCH", confirmation, cookie);
  assert.equal(
    (
      await db.missionProgress.findFirst({
        where: { missionId: first.missionId, language: "EN" },
      })
    ).completedAt.toISOString(),
    confirmedAt,
  );
  await expect(
    "/api/sessions",
    "POST",
    { ...input, missionId: "name-home", language: "DE" },
    cookie,
    409,
  );
  console.log(
    "First-run setup is atomic, password-only access is enforced, and missions require seen cards plus parent confirmation in the same language.",
  );
  const oldCookie = cookie;
  await expect(
    "/api/gate",
    "PATCH",
    {
      currentPassword: "wrong",
      password: replacement,
      confirmation: replacement,
    },
    cookie,
    401,
  );
  cookie = cookieFrom(
    await expect(
      "/api/gate",
      "PATCH",
      {
        currentPassword: password,
        password: replacement,
        confirmation: replacement,
      },
      cookie,
    ),
  );
  await expect("/api/gate", "GET", undefined, oldCookie, 401);
  await expect("/api/gate", "GET", undefined, cookie);
  await expect("/api/gate", "POST", { password }, undefined, 401);
  cookie = await login(replacement);
  const path = [
    "name-home",
    "name-actions",
    "pair-vehicles",
    "pair-home",
    "pair-animals",
    "detail-vehicles",
    "detail-home",
    "detail-food",
    "sentence-vehicles",
    "sentence-home",
    "sentence-actions",
  ];
  for (let i = 0; i < path.length; i++) {
    const missionId = path[i];
    const session = await (
      await expect("/api/sessions", "POST", { ...input, missionId }, cookie)
    ).json();
    assert.ok(
      session.cards.every((c) => c.levelShown === Math.floor((i + 1) / 3) + 1),
    );
    await exercise(session);
    await expect(
      "/api/track",
      "PATCH",
      { missionId, language: "EN", offlineDone: true },
      cookie,
    );
  }
  const saved = JSON.stringify({
    credential: await db.parentCredential.findMany(),
    progress: await db.missionProgress.findMany({
      orderBy: { missionId: "asc" },
    }),
    vocabulary: await db.childVocabulary.findMany({
      orderBy: { conceptId: "asc" },
    }),
    profile: await db.childProfile.findMany(),
  });
  await prepareAgain();
  assert.ok(
    saved ===
      JSON.stringify({
        credential: await db.parentCredential.findMany(),
        progress: await db.missionProgress.findMany({
          orderBy: { missionId: "asc" },
        }),
        vocabulary: await db.childVocabulary.findMany({
          orderBy: { conceptId: "asc" },
        }),
        profile: await db.childProfile.findMany(),
      }),
    "Repeated migration/seed preserves password, mission progress, vocabulary, and settings.",
  );
  await stop();
  launch();
  await ready();
  bootstrap = await (await expect("/api/bootstrap", "GET")).json();
  assert.equal(
    bootstrap.missionProgress.filter((p) => p.completedAt).length,
    12,
  );
  await expect("/api/gate", "GET", undefined, cookie);
  console.log(
    "All 12 missions advance through four authored levels; password rotation revokes old cookies; saved settings and progress survive repeat seeds and server restart.",
  );
  // Simulate an old PIN deployment in this disposable schema only.
  await db.parentCredential.deleteMany();
  await stop();
  launch({ PARENT_PIN: "2468" });
  await ready();
  bootstrap = await (await expect("/api/bootstrap", "GET")).json();
  assert.equal(bootstrap.security.legacyPinRequired, true);
  await expect("/api/gate", "POST", setup, undefined, 401);
  cookie = cookieFrom(
    await expect("/api/gate", "POST", { ...setup, legacyPin: "2468" }),
  );
  await expect("/api/gate", "POST", { password: "2468" }, undefined, 401);
  await expect("/api/gate", "GET", undefined, cookie);
  assert.equal(
    await db.missionProgress.count({ where: { completedAt: { not: null } } }),
    12,
  );
  cookie = await login(password);
  for (let i = 0; i < 5; i++)
    await expect(
      "/api/gate",
      "POST",
      { password: "wrong password" },
      undefined,
      401,
    );
  await expect("/api/gate", "POST", { password }, undefined, 429);
  console.log(
    "Legacy PIN authorizes the one-time upgrade; it no longer unlocks parent tools after setup. Integration checks passed.",
  );
} catch (error) {
  console.error(error.message);
  // Redact connection strings before showing startup diagnostics.
  if (logs)
    console.error(
      logs
        .replaceAll(environment.DATABASE_URL, "[redacted]")
        .replaceAll(process.env.DATABASE_URL, "[redacted]")
        .replaceAll(environment.PARENT_SESSION_SECRET, "[redacted]"),
    );
  process.exitCode = 1;
} finally {
  await stop();
  await db.$disconnect();
  if (schemaCreated)
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.$disconnect();
  await rm(directory, { recursive: true, force: true });
}
