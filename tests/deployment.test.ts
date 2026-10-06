import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  mkdir,
  writeFile,
  access,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deploymentConfig } from "../lib/deployment/config.mjs";
import { sameOrigin } from "../lib/http/origin";
import { migrateLegacyUploads } from "../lib/storage/migrate.mjs";
import { LocalStorage } from "../lib/storage";

const env = {
  DATABASE_URL: "postgresql://test:private-password@db:5432/littlewords",
  PARENT_SESSION_SECRET: "s".repeat(32),
  UPLOAD_DIR: "/app-data/uploads",
};

test("hosted startup accepts the platform port and rejects missing prerequisites without exposing values", () => {
  assert.equal(deploymentConfig({ ...env, PORT: "10000" }).port, 10000);
  assert.equal(deploymentConfig(env).port, 3000);
  for (const key of [
    "DATABASE_URL",
    "PARENT_SESSION_SECRET",
    "UPLOAD_DIR",
  ] as const) {
    assert.throws(
      () => deploymentConfig({ ...env, [key]: "" }),
      new RegExp(key),
    );
  }
  for (const value of ["0", "-1", "65536", "3000oops"])
    assert.throws(() => deploymentConfig({ ...env, PORT: value }), /PORT/);
  assert.throws(
    () =>
      deploymentConfig({ ...env, DATABASE_URL: "invalid-secret-connection" }),
    (error) => !String(error).includes("invalid-secret-connection"),
  );
  assert.throws(
    () => deploymentConfig({ ...env, UPLOAD_DIR: "public/uploads" }),
    /absolute path/,
  );
});

test("a canonical origin accepts a rewritten proxy Host and rejects other origins", () => {
  assert.equal(
    sameOrigin(
      "https://words.example.com",
      "internal:3000",
      "https://words.example.com",
    ),
    true,
  );
  assert.equal(
    sameOrigin(
      "https://other.example.com",
      "internal:3000",
      "https://words.example.com",
    ),
    false,
  );
  assert.equal(
    sameOrigin("not-an-origin", "internal:3000", "https://words.example.com"),
    false,
  );
  assert.equal(sameOrigin("http://localhost:3000", "localhost:3000", ""), true);
  assert.throws(
    () =>
      deploymentConfig({
        ...env,
        APP_ORIGIN: "https://words.example.com/parent",
      }),
    /APP_ORIGIN/,
  );
  assert.throws(
    () => deploymentConfig({ ...env, APP_ORIGIN: "http://words.example.com" }),
    /HTTPS/,
  );
});

test("uploaded files survive recreating the storage adapter on a configured external directory", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "littlewords-uploads-"),
  );
  const previous = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = directory;
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public/icons/icon-192.png"),
    );
    const url = await new LocalStorage().save(bytes, "png");
    const filename = url.split("/").at(-1)!;
    assert.ok(url.startsWith("/api/photos/"));
    assert.deepEqual(await new LocalStorage().read(filename), bytes);
    await assert.rejects(new LocalStorage().read("../.env"), /Invalid image/);
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("legacy photo migration removes public copies only after safe transfer and preserves conflicting originals", async () => {
  const previous = process.cwd();
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "littlewords-photo-move-"),
  );
  const source = path.join(directory, "public", "uploads");
  const target = path.join(directory, "var", "uploads");
  try {
    await mkdir(source, { recursive: true });
    process.chdir(directory);
    await writeFile(path.join(source, "aaaa.png"), "family photo");
    await migrateLegacyUploads(target);
    assert.equal(
      await readFile(path.join(target, "aaaa.png"), "utf8"),
      "family photo",
    );
    await assert.rejects(access(path.join(source, "aaaa.png")));
    await writeFile(path.join(source, "bbbb.png"), "original photo");
    await writeFile(path.join(target, "bbbb.png"), "different photo");
    await assert.rejects(migrateLegacyUploads(target), /conflict/);
    assert.equal(
      await readFile(path.join(source, "bbbb.png"), "utf8"),
      "original photo",
    );
    assert.equal(
      await readFile(path.join(target, "bbbb.png"), "utf8"),
      "different photo",
    );
    await assert.rejects(
      migrateLegacyUploads(path.join(directory, "public")),
      /outside public/,
    );
  } finally {
    process.chdir(previous);
    await rm(directory, { recursive: true, force: true });
  }
});
