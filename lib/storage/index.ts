import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export interface PhotoStorage {
  save(data: Buffer, extension: string): Promise<string>;
  read(name: string): Promise<Buffer>;
  remove(name: string): Promise<void>;
}
export function uploadDirectory() {
  return path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), "var", "uploads"),
  );
}
export class LocalStorage implements PhotoStorage {
  private root = uploadDirectory();
  async save(data: Buffer, extension: string) {
    await mkdir(this.root, { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    await writeFile(path.join(this.root, name), data, { flag: "wx" });
    return `/api/photos/${name}`;
  }
  async remove(name: string) {
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name))
      throw new Error("Invalid image");
    await unlink(path.join(this.root, name));
  }
  async read(name: string) {
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name))
      throw new Error("Invalid image");
    return readFile(path.join(this.root, name));
  }
}
export function storage(): PhotoStorage {
  if (process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== "local")
    throw new Error("Unsupported storage provider");
  return new LocalStorage();
}
