import { NextResponse } from "next/server";
import { access, constants } from "node:fs/promises";
import { db } from "@/lib/db";
import { hasDatabase } from "@/lib/db/http";
import { uploadDirectory } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  if (!hasDatabase())
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers },
    );
  try {
    await db.accountSession.findFirst({ select: { id: true } });
    const profile = await db.childProfile.findUnique({
      where: { id: "demo-child" },
      select: { id: true, aiPlanningEnabled: true },
    });
    await db.learningSession.findFirst({ select: { adventurePlan: true } });
    if (!profile)
      return NextResponse.json(
        { status: "unavailable" },
        { status: 503, headers },
      );
    await access(uploadDirectory(), constants.R_OK | constants.W_OK);
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    // A readiness response must never expose a connection string or child data.
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers },
    );
  }
}
