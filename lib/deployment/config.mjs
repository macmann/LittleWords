import path from "node:path";

/**
 * Validate the hosted workflow without logging environment values.
 * @param {Record<string, string | undefined>} env
 */
export function deploymentConfig(env) {
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for deployment.");
  let database;
  try {
    database = new URL(env.DATABASE_URL);
  } catch {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL connection string.",
    );
  }
  if (
    !["postgresql:", "postgres:"].includes(database.protocol) ||
    !database.hostname
  )
    throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  if (!/^[0-9]{4,8}$/.test(env.PARENT_PIN ?? ""))
    throw new Error("PARENT_PIN must contain 4–8 digits.");
  if (!env.PARENT_SESSION_SECRET || env.PARENT_SESSION_SECRET.length < 32)
    throw new Error(
      "PARENT_SESSION_SECRET must contain at least 32 characters.",
    );
  if (env.STORAGE_PROVIDER && env.STORAGE_PROVIDER !== "local")
    throw new Error("This deployment supports STORAGE_PROVIDER=local.");
  if (!env.UPLOAD_DIR || !path.isAbsolute(env.UPLOAD_DIR))
    throw new Error(
      "UPLOAD_DIR must be an absolute path on a persistent disk or volume.",
    );
  const portText = env.PORT || "3000";
  const port = Number(portText);
  if (
    !/^\d+$/.test(portText) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw new Error("PORT must be an integer between 1 and 65535.");
  if (env.APP_ORIGIN) {
    let origin;
    try {
      origin = new URL(env.APP_ORIGIN);
    } catch {
      throw new Error("APP_ORIGIN must be a valid HTTP or HTTPS origin.");
    }
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw new Error(
        "APP_ORIGIN must contain only the scheme and hostname (and optional port).",
      );
    if (
      origin.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
    )
      throw new Error("APP_ORIGIN must use HTTPS outside local development.");
  }
  return { port, uploadDir: path.resolve(env.UPLOAD_DIR) };
}
