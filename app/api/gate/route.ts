import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError } from "@/lib/db/http";
import {
  accountContext,
  secureCookie,
  privateHeaders,
} from "@/lib/security/account";
import { parentToken, protectParent } from "@/lib/parent-auth";
import {
  verifyPassword,
  hashPassword,
  passwordSchema,
} from "@/lib/security/password";
const attempts = new Map<string, { count: number; until: number }>();
function rejected(id: string) {
  const old = attempts.get(id);
  if (attempts.size > 2000) attempts.delete(attempts.keys().next().value!);
  attempts.set(id, {
    count: old && old.until > Date.now() ? old.count + 1 : 1,
    until: Date.now() + 60000,
  });
  return NextResponse.json(
    { error: "Please check your account password." },
    { status: 401 },
  );
}
export async function GET() {
  const context = await accountContext();
  if (context.response) return context.response;
  return (
    (await protectParent()) ??
    NextResponse.json({ ok: true }, { headers: privateHeaders })
  );
}
async function unlock(req: NextRequest, change: boolean) {
  try {
    const context = await accountContext(true);
    if (context.response) return context.response;
    const account = context.account;
    if (change) {
      const denied = await protectParent();
      if (denied) return denied;
    }
    const old = attempts.get(account.user.id);
    if (old && old.count >= 5 && old.until > Date.now())
      return NextResponse.json(
        { error: "Please wait a minute before trying again." },
        { status: 429 },
      );
    const body = await req.json();
    const input = change
      ? z
          .object({
            currentPassword: z.string().max(128),
            password: passwordSchema,
            confirmation: z.string().max(128),
          })
          .refine((v) => v.password === v.confirmation, {
            message: "Passwords do not match.",
          })
          .parse(body)
      : z.object({ password: z.string().max(128) }).parse(body);
    const password =
      "currentPassword" in input
        ? String(input.currentPassword)
        : input.password;
    if (!(await verifyPassword(password, account.user.passwordHash!)))
      return rejected(account.user.id);
    if (change) {
      const version = randomUUID();
      const changed = await db.$transaction(async (tx) => {
        const result = await tx.user.updateMany({
          where: {
            id: account.user.id,
            sessionVersion: account.user.sessionVersion,
          },
          data: {
            passwordHash: await hashPassword(input.password),
            sessionVersion: version,
          },
        });
        if (result.count)
          await tx.accountSession.deleteMany({
            where: { userId: account.user.id, id: { not: account.session.id } },
          });
        return result.count;
      });
      if (!changed)
        return NextResponse.json(
          { error: "Your password changed elsewhere. Sign in again." },
          { status: 409 },
        );
      account.user.sessionVersion = version;
    }
    const res = NextResponse.json({ ok: true }, { headers: privateHeaders });
    res.cookies.set("lw-parent", parentToken(account), {
      ...secureCookie(),
      maxAge: 1800,
    });
    attempts.delete(account.user.id);
    return res;
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: NextRequest) {
  return unlock(req, false);
}
export async function PATCH(req: NextRequest) {
  return unlock(req, true);
}
export async function DELETE() {
  const context = await accountContext(true);
  if (context.response) return context.response;
  const res = NextResponse.json({ ok: true }, { headers: privateHeaders });
  res.cookies.set("lw-parent", "", { ...secureCookie(), maxAge: 0 });
  return res;
}
