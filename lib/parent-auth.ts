import { cookies, headers } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
const devSecret = randomBytes(32).toString("hex");
function secret() {
  const value = process.env.PARENT_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32))
    throw new Error(
      "Set PARENT_SESSION_SECRET (32+ characters) before using parent tools in production.",
    );
  return value || devSecret;
}
function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export function parentToken() {
  const expiry = String(Date.now() + 30 * 60 * 1000);
  return `${expiry}.${signature(expiry)}`;
}
export function pinMatches(pin: string) {
  const correct =
    process.env.PARENT_PIN ||
    (process.env.NODE_ENV === "production" ? "" : "2468");
  const a = Buffer.from(pin),
    b = Buffer.from(correct);
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
export async function parentAuthorized() {
  const value = (await cookies()).get("lw-parent")?.value;
  if (!value) return false;
  const [expiry, sig] = value.split(".");
  if (!sig || Number(expiry) < Date.now()) return false;
  const a = Buffer.from(sig),
    b = Buffer.from(signature(expiry));
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function protectParent() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && new URL(origin).host !== h.get("host"))
    return NextResponse.json(
      { error: "Please use the app to make this change." },
      { status: 403 },
    );
  try {
    if (!(await parentAuthorized()))
      return NextResponse.json(
        { error: "Open the parent gate to make changes." },
        { status: 401 },
      );
  } catch {
    return NextResponse.json(
      {
        error:
          "Parent security is not configured. Set PARENT_PIN and PARENT_SESSION_SECRET.",
      },
      { status: 503 },
    );
  }
}
