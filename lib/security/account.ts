import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireDatabase } from "@/lib/db/http";
import { sameOrigin } from "@/lib/http/origin";
export const accountCookie = "lw-account";
export const sessionDays = 30;
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function currentAccount() {
  const value = (await cookies()).get(accountCookie)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const session = await db.accountSession.findUnique({
    where: { tokenHash: tokenHash(value) },
    include: {
      user: {
        include: { children: { orderBy: { createdAt: "asc" }, take: 1 } },
      },
    },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.user.passwordHash ||
    !session.user.children[0]
  )
    return null;
  return { user: session.user, session, child: session.user.children[0] };
}
export async function accountContext(write = false) {
  const unavailable = requireDatabase();
  if (unavailable) return { response: unavailable };
  const h = await headers();
  if (write && !sameOrigin(h.get("origin"), h.get("host")))
    return {
      response: NextResponse.json(
        { error: "Please use the app." },
        { status: 403 },
      ),
    };
  let account;
  try {
    account = await currentAccount();
  } catch (e) {
    return { response: apiError(e) };
  }
  if (!account)
    return {
      response: NextResponse.json(
        { error: "Sign in to continue.", signInRequired: true },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  return { account };
}
export async function createAccountSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionDays * 86400000);
  const session = await db.accountSession.create({
    data: { userId, tokenHash: tokenHash(token), expiresAt },
  });
  return { token, session };
}
export const privateHeaders = { "Cache-Control": "private, no-store" };
export function secureCookie() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
