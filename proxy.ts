import { NextResponse } from "next/server";
// Legacy uploads must never be served directly by Next's public-file handler.
export function proxy() {
  return new NextResponse("Photo not found", { status: 404 });
}
export const config = { matcher: ["/uploads/:path*"] };
