import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    const data = await storage().read(name);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": name.endsWith(".png")
          ? "image/png"
          : name.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Photo not found", { status: 404 });
  }
}
