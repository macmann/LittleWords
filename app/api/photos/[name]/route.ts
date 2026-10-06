import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountContext } from "@/lib/security/account";
import { storage } from "@/lib/storage";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const context = await accountContext();
  if (context.response) return context.response;
  const { name } = await params;
  try {
    const owned = await db.photoAsset.findFirst({
      where: { filename: name, userId: context.account.user.id },
    });
    const legacy =
      !owned &&
      (await db.concept.findFirst({
        where: {
          childId: context.account.child.id,
          imageUrl: `/api/photos/${name}`,
        },
      }));
    if (!owned && !legacy)
      return new NextResponse("Photo not found", { status: 404 });
    const data = await storage().read(name);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": name.endsWith(".png")
          ? "image/png"
          : name.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Photo not found", { status: 404 });
  }
}
