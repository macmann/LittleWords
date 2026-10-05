import "dotenv/config";
import path from "node:path";
import { migrateLegacyUploads } from "../lib/storage/migrate.mjs";
await migrateLegacyUploads(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "var", "uploads"),
);
console.log("Legacy upload migration completed.");
