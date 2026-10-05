import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountContext } from "@/lib/security/account";
import { protectParent } from "@/lib/parent-auth";
import { storage } from "@/lib/storage";
export async function POST(req: NextRequest) {
  const context = await accountContext(true);
  if (context.response) return context.response;
  const denied = await protectParent();
  if (denied) return denied;
  const length = Number(req.headers.get("content-length"));
  if (length > 6 * 1024 * 1024)
    return NextResponse.json(
      { error: "Choose a photo under 5 MB." },
      { status: 413 },
    );
  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size)
      return NextResponse.json(
        { error: "Choose a JPG, PNG, or WebP photo under 5 MB." },
        { status: 400 },
      );
    const data = Buffer.from(await file.arrayBuffer());
    const extension = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "jpg"
        : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
    if (!extension)
      return NextResponse.json(
        { error: "Please use a JPG, PNG, or WebP image." },
        { status: 400 },
      );
    const adapter = storage();
    const url = await adapter.save(data, extension);
    const filename = url.split("/").at(-1)!;
    try {
      await db.photoAsset.create({
        data: { filename, userId: context.account.user.id },
      });
    } catch (e) {
      await adapter.remove(filename).catch(() => {});
      throw e;
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Photo could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
