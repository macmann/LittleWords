import { cookies, headers } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/security/account";
import { sameOrigin } from "@/lib/http/origin";
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
export function parentToken(account: {
  user: { id: string; sessionVersion: string };
  session: { id: string };
}) {
  const expiry = String(Date.now() + 30 * 60 * 1000);
  return `${expiry}.${signature(`${expiry}.${account.user.id}.${account.session.id}.${account.user.sessionVersion}`)}`;
}
export function legacyPinMatches(pin: string) {
  const a = Buffer.from(pin),
    b = Buffer.from(process.env.PARENT_PIN || "");
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
export async function parentAuthorized() {
  const account = await currentAccount();
  if (!account) return false;
  const value = (await cookies()).get("lw-parent")?.value;
  if (!value) return false;
  const [expiry, sig, extra] = value.split(".");
  if (
    extra ||
    !/^\d+$/.test(expiry) ||
    !/^[a-f0-9]{64}$/.test(sig || "") ||
    Number(expiry) < Date.now()
  )
    return false;
  return timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(
      signature(
        `${expiry}.${account.user.id}.${account.session.id}.${account.user.sessionVersion}`,
      ),
    ),
  );
}
export async function protectParent() {
  const h = await headers();
  const origin = h.get("origin");
  if (!sameOrigin(origin, h.get("host")))
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
          "Parent security is not configured. Check PostgreSQL and PARENT_SESSION_SECRET.",
      },
      { status: 503 },
    );
  }
}
