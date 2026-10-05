import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, hasDatabase, requireDatabase } from "@/lib/db/http";
import {
  hashPassword,
  verifyPassword,
  passwordSchema,
} from "@/lib/security/password";
import {
  accountCookie,
  currentAccount,
  createAccountSession,
  secureCookie,
  sessionDays,
  tokenHash,
  privateHeaders,
} from "@/lib/security/account";
import { parentToken, legacyPinMatches } from "@/lib/parent-auth";
import { sameOrigin } from "@/lib/http/origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);
const signup = z
  .object({
    action: z.enum(["signup", "adopt"]),
    email,
    password: passwordSchema,
    confirmation: z.string().max(128),
    name: z.string().trim().min(1).max(60),
    childName: z.string().trim().max(50).default(""),
    ageMonths: z.number().int().min(0).max(95),
    primaryLanguage: z.enum(["EN", "MY", "DE"]).default("EN"),
    legacyPassword: z.string().max(128).optional(),
  })
  .refine((v) => v.password === v.confirmation, {
    message: "Passwords do not match.",
  });
const login = z.object({
  action: z.literal("login"),
  email,
  password: z.string().min(1).max(128),
});
const attempts = new Map<string, { count: number; until: number }>();
function failed(key: string) {
  const previous = attempts.get(key);
  if (attempts.size > 2000) attempts.delete(attempts.keys().next().value!);
  attempts.set(key, {
    count: previous && previous.until > Date.now() ? previous.count + 1 : 1,
    until: Date.now() + 60000,
  });
  return NextResponse.json(
    { error: "Please check your email and password." },
    { status: 401, headers: privateHeaders },
  );
}
async function legacyAvailable() {
  const user = await db.user.findUnique({
    where: { id: "demo-user" },
    select: { passwordHash: true },
  });
  if (!user || user.passwordHash) return false;
  return (
    !!process.env.PARENT_PIN ||
    !!(await db.parentCredential.findUnique({
      where: { id: "household" },
      select: { id: true },
    }))
  );
}
export async function GET() {
  try {
    if (!hasDatabase())
      return NextResponse.json(
        { authenticated: false, databaseReady: false, legacyAvailable: false },
        { headers: privateHeaders },
      );
    const account = await currentAccount();
    return NextResponse.json(
      {
        authenticated: !!account,
        databaseReady: true,
        legacyAvailable: !account && (await legacyAvailable()),
      },
      { headers: privateHeaders },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return NextResponse.json({ error: "Please use the app." }, { status: 403 });
  const unavailable = requireDatabase();
  if (unavailable) return unavailable;
  try {
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.PARENT_SESSION_SECRET ||
        process.env.PARENT_SESSION_SECRET.length < 32)
    )
      return NextResponse.json(
        {
          error:
            "Account security is unavailable. Check the server session secret.",
        },
        { status: 503 },
      );
    const body = z
      .object({ action: z.enum(["signup", "login", "adopt"]), email })
      .passthrough()
      .parse(await req.json());
    const key =
      body.action === "adopt" ? "legacy-adoption" : tokenHash(body.email);
    const throttle = attempts.get(key);
    if (throttle && throttle.count >= 5 && throttle.until > Date.now())
      return NextResponse.json(
        { error: "Please wait a minute before trying again." },
        { status: 429 },
      );
    let user;
    if (body.action === "login") {
      const input = login.parse(body);
      user = await db.user.findUnique({ where: { email: input.email } });
      const matches = await verifyPassword(
        input.password,
        user?.passwordHash || `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`,
      );
      if (!user?.passwordHash || !matches) return failed(key);
    } else {
      const input = signup.parse(body);
      const passwordHash = await hashPassword(input.password);
      if (input.action === "adopt") {
        const old = await db.parentCredential.findUnique({
          where: { id: "household" },
        });
        const verified = old
          ? await verifyPassword(input.legacyPassword || "", old.passwordHash)
          : legacyPinMatches(input.legacyPassword || "");
        if (!verified) return failed(key);
        user = await db.$transaction(async (tx) => {
          const changed = await tx.user.updateMany({
            where: { id: "demo-user", passwordHash: null, email: null },
            data: {
              name: input.name,
              email: input.email,
              passwordHash,
              role: "ADMIN",
              sessionVersion: randomUUID(),
            },
          });
          if (!changed.count) return null;
          await tx.childProfile.updateMany({
            where: { userId: "demo-user" },
            data: {
              ...(input.childName ? { name: input.childName } : {}),
              ageMonths: input.ageMonths,
              ageRecordedAt: new Date(),
            },
          });
          await tx.parentCredential.deleteMany({ where: { id: "household" } });
          return tx.user.findUnique({ where: { id: "demo-user" } });
        });
        if (!user)
          return NextResponse.json(
            {
              error:
                "These household records are already linked to an account. Sign in instead.",
            },
            { status: 409 },
          );
      } else {
        user = await db.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash,
            children: {
              create: {
                name: input.childName || "Little Learner",
                ageMonths: input.ageMonths,
                ageRecordedAt: new Date(),
                primaryLanguage: input.primaryLanguage,
              },
            },
          },
        });
      }
    }
    const previous = (await cookies()).get(accountCookie)?.value;
    if (previous && /^[a-f0-9]{64}$/.test(previous))
      await db.accountSession.deleteMany({
        where: { tokenHash: tokenHash(previous) },
      });
    await db.accountSession.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });
    const { token, session } = await createAccountSession(user.id);
    const res = NextResponse.json({ ok: true }, { headers: privateHeaders });
    res.cookies.set(accountCookie, token, {
      ...secureCookie(),
      maxAge: sessionDays * 86400,
    });
    res.cookies.set("lw-parent", parentToken({ user, session }), {
      ...secureCookie(),
      maxAge: 1800,
    });
    attempts.delete(key);
    return res;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "That email already has an account. Sign in instead." },
        { status: 409 },
      );
    return apiError(e);
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return NextResponse.json({ error: "Please use the app." }, { status: 403 });
  try {
    const token = (await cookies()).get(accountCookie)?.value;
    if (hasDatabase() && token && /^[a-f0-9]{64}$/.test(token))
      await db.accountSession.deleteMany({
        where: { tokenHash: tokenHash(token) },
      });
    const res = NextResponse.json({ ok: true }, { headers: privateHeaders });
    for (const name of [accountCookie, "lw-parent"])
      res.cookies.set(name, "", { ...secureCookie(), maxAge: 0 });
    return res;
  } catch (e) {
    return apiError(e);
  }
}
