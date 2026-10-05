import {
  readdir,
  mkdir,
  copyFile,
  readFile,
  unlink,
  lstat,
} from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
/** Copy legacy photo files, verify bytes, then remove their public copies. */
export async function migrateLegacyUploads(target) {
  const source = path.join(process.cwd(), "public", "uploads");
  if (
    path.resolve(target) === path.join(process.cwd(), "public") ||
    path
      .resolve(target)
      .startsWith(path.join(process.cwd(), "public") + path.sep)
  )
    throw new Error("UPLOAD_DIR must be outside public/.");
  let names;
  try {
    names = await readdir(source);
  } catch (e) {
    if (e.code === "ENOENT") return;
    throw e;
  }
  await mkdir(target, { recursive: true });
  for (const name of names) {
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name)) continue;
    const from = path.join(source, name),
      to = path.join(target, name);
    if (!(await lstat(from)).isFile()) continue;
    try {
      await copyFile(from, to, constants.COPYFILE_EXCL);
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    if (!(await readFile(from)).equals(await readFile(to)))
      throw new Error(
        "An upload migration conflict needs administrator review.",
      );
    await unlink(from);
  }
}
