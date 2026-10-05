import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { migrateLegacyUploads } from "../lib/storage/migrate.mjs";
import { deploymentConfig } from "../lib/deployment/config.mjs";

process.env.NODE_ENV = "production";
dotenv.config({
  path: [".env.production.local", ".env.local", ".env.production", ".env"],
  quiet: true,
});
const require = createRequire(import.meta.url);
let child;
let stopping = false;
let stopSignal;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    stopping = true;
    stopSignal = signal;
    child?.kill(signal);
  });
}

/** @param {string[]} args @param {string} label */
function run(args, label) {
  return new Promise((resolve, reject) => {
    if (stopping) {
      resolve(undefined);
      return;
    }
    child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", () => reject(new Error(`${label} could not start.`)));
    child.once("exit", (code, signal) => {
      child = undefined;
      if (stopping) {
        resolve(undefined);
        return;
      }
      if (code !== 0)
        reject(new Error(`${label} exited with ${signal || code}.`));
      else resolve(undefined);
    });
  });
}

try {
  const config = deploymentConfig(process.env);
  // Fail before migration/startup if the persistent mount is not writable.
  await mkdir(config.uploadDir, { recursive: true });
  const probe = path.join(
    config.uploadDir,
    `.littlewords-write-${randomUUID()}`,
  );
  try {
    await writeFile(probe, "", { flag: "wx", mode: 0o600 });
  } finally {
    await unlink(probe).catch(() => {});
  }
  console.log("[deploy] Upload directory is writable.");
  await migrateLegacyUploads(config.uploadDir);
  await run(
    [require.resolve("prisma/build/index.js"), "migrate", "deploy"],
    "Database migration",
  );
  await run([require.resolve("tsx/cli"), "prisma/seed.ts"], "Content seed");
  if (!stopping && !process.argv.includes("--prepare-only")) {
    await run(
      [
        require.resolve("next/dist/bin/next"),
        "start",
        "--hostname",
        "0.0.0.0",
        "--port",
        String(config.port),
      ],
      "Next.js server",
    );
  }
} catch (error) {
  console.error(
    "[deploy]",
    error instanceof Error ? error.message : "Deployment startup failed.",
  );
  process.exitCode = 1;
}
if (stopping) process.exitCode = stopSignal === "SIGINT" ? 130 : 143;
