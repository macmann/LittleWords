import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  parentToken,
  legacyPinMatches,
  protectParent,
} from "@/lib/parent-auth";
import { sameOrigin } from "@/lib/http/origin";
import { db } from "@/lib/db";
import { apiError, requireDatabase } from "@/lib/db/http";
import {
  hashPassword,
  verifyPassword,
  passwordSchema,
} from "@/lib/security/password";
export const runtime = "nodejs";
const attempts = new Map<string, { count: number; until: number }>();
const setupSchema = z
  .object({
    action: z.literal("setup"),
    password: passwordSchema,
    confirmation: z.string(),
    legacyPin: z.string().max(8).optional(),
  })
  .refine((v) => v.password === v.confirmation, {
    message: "Passwords do not match.",
  });
const changeSchema = z
  .object({
    currentPassword: z.string().max(128),
    password: passwordSchema,
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, {
    message: "Passwords do not match.",
  });
function preflight(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return NextResponse.json(
      { error: "Please open the gate in the app." },
      { status: 403 },
    );
  const record = attempts.get("household");
  if (record && record.count >= 5 && record.until > Date.now())
    return NextResponse.json(
      { error: "Please wait a minute before opening the parent gate." },
      { status: 429 },
    );
  return requireDatabase();
}
function rejected(message = "Please check your parent password.") {
  const record = attempts.get("household");
  attempts.set("household", {
    count: (record && record.until > Date.now() ? record.count : 0) + 1,
    until: Date.now() + 60000,
  });
  return NextResponse.json({ error: message }, { status: 401 });
}
async function opened(req: NextRequest, sessionVersion: string) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("lw-parent", parentToken(sessionVersion), {
    httpOnly: true,
    sameSite: "strict",
    secure:
      process.env.NODE_ENV === "production" ||
      req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 1800,
  });
  attempts.delete("household");
  return res;
}
export async function POST(req: NextRequest) {
  const denied = preflight(req);
  if (denied) return denied;
  try {
    // Validate server signing configuration before persisting a credential.
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.PARENT_SESSION_SECRET ||
        process.env.PARENT_SESSION_SECRET.length < 32)
    )
      return NextResponse.json(
        {
          error:
            "Parent security is unavailable. Check the server session secret.",
        },
        { status: 503 },
      );
    const body = z
      .object({ action: z.string().optional() })
      .passthrough()
      .parse(await req.json());
    const credential = await db.parentCredential.findUnique({
      where: { id: "household" },
    });
    let sessionVersion = credential?.sessionVersion;
    if (body.action === "setup") {
      if (credential)
        return NextResponse.json(
          { error: "A parent password is already set. Open the parent gate." },
          { status: 409 },
        );
      const input = setupSchema.parse(body);
      if (process.env.PARENT_PIN && !legacyPinMatches(input.legacyPin || ""))
        return rejected("Please check your previous parent PIN.");
      // Singleton primary key makes concurrent first-run claims atomic.
      const created = await db.parentCredential.create({
        data: {
          id: "household",
          passwordHash: await hashPassword(input.password),
        },
      });
      sessionVersion = created.sessionVersion;
    } else {
      const input = z.object({ password: z.string().max(128) }).parse(body);
      if (
        !credential ||
        !(await verifyPassword(input.password, credential.passwordHash))
      )
        return rejected();
    }
    return await opened(req, sessionVersion!);
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: NextRequest) {
  const denied = preflight(req) ?? (await protectParent());
  if (denied) return denied;
  try {
    const input = changeSchema.parse(await req.json());
    const credential = await db.parentCredential.findUnique({
      where: { id: "household" },
    });
    if (
      !credential ||
      !(await verifyPassword(input.currentPassword, credential.passwordHash))
    )
      return rejected();
    const sessionVersion = randomUUID();
    const updated = await db.parentCredential.updateMany({
      where: { id: credential.id, sessionVersion: credential.sessionVersion },
      data: {
        passwordHash: await hashPassword(input.password),
        sessionVersion,
      },
    });
    if (!updated.count)
      return NextResponse.json(
        {
          error:
            "Your password changed on another device. Open the gate again.",
        },
        { status: 409 },
      );
    return await opened(req, sessionVersion);
  } catch (e) {
    return apiError(e);
  }
}
export async function GET() {
  const denied = await protectParent();
  return denied ?? NextResponse.json({ ok: true });
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return NextResponse.json({ error: "Please use the app." }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("lw-parent", "", {
    httpOnly: true,
    sameSite: "strict",
    secure:
      process.env.NODE_ENV === "production" ||
      req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return res;
}
