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
function cookieFrom(res, previous = "") {
  const map = new Map(
    previous
      .split("; ")
      .filter(Boolean)
      .map((v) => v.split("=")),
  );
  for (const value of res.headers.getSetCookie()) {
    assert.ok(value.includes("Secure"));
    const [name, token] = value.split(";")[0].split("=");
    map.set(name, token);
  }
  return [...map].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function login(email, password) {
  return cookieFrom(
    await expect("/api/auth", "POST", { action: "login", email, password }),
  );
}
async function exercise(session, cookie) {
  for (const card of session.cards)
    await expect(
      "/api/sessions",
      "PATCH",
      {
        sessionId: session.id,
        sequence: card.sequence,
      },
      cookie,
    );
  await expect(
    "/api/sessions",
    "PATCH",
    {
      sessionId: session.id,
      complete: true,
    },
    cookie,
  );
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
  await expect("/api/bootstrap", "GET", undefined, undefined, 401);
  assert.equal(
    (await (await expect("/api/auth", "GET")).json()).authenticated,
    false,
  );
  const pass = "our shared account password",
    replacement = "replacement shared password";
  const a = {
    action: "signup",
    name: "Parent A",
    email: "ParentA@example.test",
    password: pass,
    confirmation: pass,
    childName: "Child A",
    ageMonths: 27,
    primaryLanguage: "EN",
  };
  const b = {
    ...a,
    name: "Parent B",
    email: "parentb@example.test",
    childName: "Child B",
    ageMonths: 48,
    role: "ADMIN",
  };
  await expect("/api/auth", "POST", { ...a, ageMonths: -1 }, undefined, 400);
  await expect(
    "/api/auth",
    "POST",
    { ...a, confirmation: "different" },
    undefined,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/auth",
        "POST",
        a,
        undefined,
        "https://other.example.test",
      )
    ).status,
    403,
  );
  const competing = await Promise.all([
    request("/api/auth", "POST", a),
    request("/api/auth", "POST", a),
  ]);
  assert.deepEqual(competing.map((r) => r.status).sort(), [200, 409]);
  let cookieA = cookieFrom(competing.find((r) => r.status === 200)),
    cookieB = cookieFrom(await expect("/api/auth", "POST", b));
  let dataA = await (
    await expect("/api/bootstrap", "GET", undefined, cookieA)
  ).json();
  let dataB = await (
    await expect("/api/bootstrap", "GET", undefined, cookieB)
  ).json();
  assert.equal(dataA.profile.ageMonths, 27);
  assert.equal(dataB.profile.ageMonths, 48);
  assert.equal(dataA.account.email, "parenta@example.test");
  assert.equal(dataB.account.role, "PARENT");
  assert.notEqual(dataA.profile.id, dataB.profile.id);
  assert.equal(dataA.concepts.length, 345);
  assert.ok(
    !JSON.stringify(dataA).includes("passwordHash") &&
      !JSON.stringify(dataA).includes("tokenHash"),
  );
  const userA = await db.user.findUnique({
    where: { email: "parenta@example.test" },
  });
  assert.ok(
    userA.passwordHash.startsWith("scrypt:") &&
      !userA.passwordHash.includes(pass),
  );
  const accountToken = cookieA
    .split("; ")
    .find((v) => v.startsWith("lw-account="))
    .split("=")[1];
  assert.equal(
    await db.accountSession.count({ where: { tokenHash: accountToken } }),
    0,
  );
  console.log(
    "Signup is immediate, email is normalized, child age is saved, passwords/session tokens are hashed, and role injection is rejected.",
  );
  const input = { childId: dataA.profile.id, language: "EN", numberOfCards: 5 };
  await expect("/api/sessions", "POST", input, undefined, 401);
  await expect("/api/sessions", "POST", input, cookieB, 404);
  await expect(
    "/api/vocabulary",
    "PATCH",
    { conceptId: "truck", status: "KNOWN" },
    cookieA,
  );
  assert.equal(
    (await (await expect("/api/bootstrap", "GET", undefined, cookieB)).json())
      .vocabulary.length,
    0,
  );
  await expect(
    "/api/profile",
    "PATCH",
    { ...dataA.profile, practiceLevel: 4 },
    cookieA,
  );
  const session = await (
    await expect("/api/sessions", "POST", input, cookieA)
  ).json();
  assert.ok(session.cards.every((c) => c.levelShown === 4));
  await expect(
    "/api/sessions",
    "PATCH",
    { sessionId: session.id, sequence: 0 },
    cookieB,
    404,
  );
  for (let i = 0; i < 2; i++)
    await expect(
      "/api/sessions",
      "PATCH",
      { sessionId: session.id, sequence: 0 },
      cookieA,
    );
  dataA = await (
    await expect("/api/bootstrap", "GET", undefined, cookieA)
  ).json();
  assert.equal(dataA.resumeSession.id, session.id);
  assert.equal(dataA.resumeSession.resumeSequence, 1);
  assert.equal(dataA.progressSummary.cardsSeen, 1);
  await exercise(session, cookieA);
  dataA = await (
    await expect("/api/bootstrap", "GET", undefined, cookieA)
  ).json();
  assert.equal(dataA.progressSummary.sessionsCompleted, 1);
  assert.equal(dataA.resumeSession, null);
  cookieA = cookieFrom(
    await expect("/api/gate", "DELETE", undefined, cookieA),
    cookieA,
  );
  await expect(
    "/api/vocabulary",
    "PATCH",
    { conceptId: "car", status: "KNOWN" },
    cookieA,
    401,
  );
  cookieA = cookieFrom(
    await expect("/api/gate", "POST", { password: pass }, cookieA),
    cookieA,
  );
  const bytes = await import("node:fs/promises").then((fs) =>
    fs.readFile("public/icons/icon-192.png"),
  );
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/png" }), "cup.png");
  const uploaded = await fetch(base + "/api/upload", {
    method: "POST",
    headers: { Origin: base, Cookie: cookieA },
    body: form,
  });
  assert.equal(uploaded.status, 200);
  const photoUrl = (await uploaded.json()).url;
  await expect(photoUrl, "GET", undefined, undefined, 401);
  await expect(photoUrl, "GET", undefined, cookieB, 404);
  const photo = await expect(photoUrl, "GET", undefined, cookieA);
  assert.ok(Buffer.from(await photo.arrayBuffer()).equals(bytes));
  assert.equal(photo.headers.get("cache-control"), "private, no-store");
  await expect(
    "/uploads/" + photoUrl.split("/").at(-1),
    "GET",
    undefined,
    cookieA,
    404,
  );
  const card = {
    slug: "my-cup",
    categoryId: "home",
    imageUrl: photoUrl,
    type: "OBJECT",
    difficulty: 1,
    active: true,
    custom: true,
    translations: dataA.concepts.find((c) => c.slug === "cup").translations,
  };
  const saved = await (
    await expect("/api/concepts", "POST", card, cookieA)
  ).json();
  await expect("/api/concepts", "POST", card, cookieB, 404);
  const other = await (
    await expect(
      "/api/concepts",
      "POST",
      { ...card, imageUrl: "/images/home/cup.svg" },
      cookieB,
    )
  ).json();
  assert.notEqual(saved.slug, other.slug);
  await expect(
    "/api/concepts",
    "POST",
    { ...card, id: saved.id },
    cookieB,
    404,
  );
  await expect(
    "/api/vocabulary",
    "PATCH",
    { conceptId: saved.id, status: "KNOWN" },
    cookieB,
    404,
  );
  await expect(
    "/api/concepts",
    "POST",
    { ...card, custom: false, imageUrl: "/images/home/cup.svg" },
    cookieB,
    403,
  );
  dataB = await (
    await expect("/api/bootstrap", "GET", undefined, cookieB)
  ).json();
  assert.ok(!dataB.concepts.some((c) => c.id === saved.id));
  assert.ok(dataB.concepts.some((c) => c.id === other.id));
  assert.equal(dataB.progressSummary.cardsSeen, 0);
  const first = await (
    await expect(
      "/api/sessions",
      "POST",
      { ...input, missionId: "name-vehicles" },
      cookieA,
    )
  ).json();
  assert.ok(first.cards.every((c) => c.levelShown === 1));
  await expect(
    "/api/track",
    "PATCH",
    { missionId: first.missionId, language: "EN", offlineDone: true },
    cookieA,
    409,
  );
  await expect(
    "/api/sessions",
    "PATCH",
    { sessionId: first.id, complete: true },
    cookieA,
    409,
  );
  await expect(
    "/api/sessions",
    "PATCH",
    { sessionId: first.id, sequence: 0 },
    cookieA,
  );
  const resumed = await (
    await expect(
      "/api/sessions",
      "POST",
      { ...input, missionId: first.missionId },
      cookieA,
    )
  ).json();
  assert.equal(resumed.id, first.id);
  assert.equal(resumed.resumeSequence, 1);
  await exercise(first, cookieA);
  await expect(
    "/api/track",
    "PATCH",
    { missionId: first.missionId, language: "EN", offlineDone: true },
    cookieA,
  );
  await expect(
    "/api/sessions",
    "POST",
    {
      childId: dataB.profile.id,
      language: "EN",
      numberOfCards: 5,
      missionId: "name-home",
    },
    cookieB,
    409,
  );
  console.log(
    "Two accounts cannot access each other's child/session/card/photo data; parent gates are retained and progress/resume are account-specific.",
  );
  const device2 = await login(a.email, pass);
  const oldGate = cookieA.split("; ").find((v) => v.startsWith("lw-parent="));
  cookieA = cookieFrom(
    await expect(
      "/api/gate",
      "PATCH",
      {
        currentPassword: pass,
        password: replacement,
        confirmation: replacement,
      },
      cookieA,
    ),
    cookieA,
  );
  await expect("/api/bootstrap", "GET", undefined, device2, 401);
  const stale = cookieA
    .split("; ")
    .filter((v) => !v.startsWith("lw-parent="))
    .concat(oldGate)
    .join("; ");
  await expect("/api/gate", "GET", undefined, stale, 401);
  await expect(
    "/api/auth",
    "POST",
    { action: "login", email: a.email, password: pass },
    undefined,
    401,
  );
  cookieA = await login(a.email, replacement);
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
    const mission = await (
      await expect("/api/sessions", "POST", { ...input, missionId }, cookieA)
    ).json();
    assert.ok(
      mission.cards.every((c) => c.levelShown === Math.floor((i + 1) / 3) + 1),
    );
    await exercise(mission, cookieA);
    await expect(
      "/api/track",
      "PATCH",
      { missionId, language: "EN", offlineDone: true },
      cookieA,
    );
  }
  const snapshot = async () =>
    JSON.stringify({
      users: await db.user.findMany({ orderBy: { id: "asc" } }),
      profiles: await db.childProfile.findMany({ orderBy: { id: "asc" } }),
      vocabulary: await db.childVocabulary.findMany({ orderBy: { id: "asc" } }),
      progress: await db.missionProgress.findMany({ orderBy: { id: "asc" } }),
    });
  const before = await snapshot();
  await prepareAgain();
  assert.ok(before === (await snapshot()));
  await stop();
  launch();
  await ready();
  dataA = await (
    await expect("/api/bootstrap", "GET", undefined, cookieA)
  ).json();
  assert.equal(dataA.missionProgress.filter((p) => p.completedAt).length, 12);
  assert.equal(dataA.profile.ageMonths, 27);
  const restored = await expect(photoUrl, "GET", undefined, cookieA);
  assert.ok(Buffer.from(await restored.arrayBuffer()).equals(bytes));
  await expect("/api/auth", "DELETE", undefined, cookieA);
  await expect("/api/bootstrap", "GET", undefined, cookieA, 401);
  cookieA = await login(a.email, replacement);
  dataA = await (
    await expect("/api/bootstrap", "GET", undefined, cookieA)
  ).json();
  assert.equal(dataA.missionProgress.filter((p) => p.completedAt).length, 12);
  console.log(
    "All 12 mission stages, private photos, age, vocabulary and progress survive reseeding, restart, logout and login; password changes revoke other devices.",
  );
  // Only the old household's password can attach its records; new signups cannot claim them.
  await db.parentCredential.create({
    data: { id: "household", passwordHash: userA.passwordHash },
  });
  await expect(
    "/api/auth",
    "POST",
    {
      ...a,
      action: "adopt",
      email: "legacy@example.test",
      legacyPassword: "wrong",
    },
    undefined,
    401,
  );
  const legacyCookie = cookieFrom(
    await expect("/api/auth", "POST", {
      ...a,
      action: "adopt",
      email: "legacy@example.test",
      legacyPassword: pass,
      ageMonths: 36,
    }),
  );
  const legacy = await (
    await expect("/api/bootstrap", "GET", undefined, legacyCookie)
  ).json();
  assert.equal(legacy.profile.id, "demo-child");
  assert.equal(legacy.account.role, "ADMIN");
  assert.equal(legacy.vocabulary.filter((v) => v.status === "KNOWN").length, 8);
  await expect(
    "/api/auth",
    "POST",
    {
      ...a,
      action: "adopt",
      email: "secondlegacy@example.test",
      legacyPassword: pass,
    },
    undefined,
    401,
  );
  for (let i = 0; i < 5; i++)
    await expect(
      "/api/auth",
      "POST",
      { action: "login", email: b.email, password: "wrong" },
      undefined,
      401,
    );
  await expect(
    "/api/auth",
    "POST",
    { action: "login", email: b.email, password: pass },
    undefined,
    429,
  );
  console.log(
    "Legacy adoption requires the old password, preserves known words, and cannot be repeated. Login throttling and all account integration checks passed.",
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
