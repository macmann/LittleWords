import { NextRequest, NextResponse } from "next/server";
import { parentToken, pinMatches, protectParent } from "@/lib/parent-auth";
import { sameOrigin } from "@/lib/http/origin";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!sameOrigin(origin, req.headers.get("host")))
    return NextResponse.json(
      { error: "Please open the gate in the app." },
      { status: 403 },
    );
  // Household deployment: throttle globally; proxy IP headers are not trusted.
  const key = "household";
  const record = attempts.get(key);
  if (record && record.count >= 5 && record.until > Date.now())
    return NextResponse.json(
      { error: "Please wait a minute before opening the parent gate." },
      { status: 429 },
    );
  let pin: unknown;
  try {
    pin = (await req.json()).pin;
  } catch {
    return NextResponse.json(
      { error: "Enter your parent PIN." },
      { status: 400 },
    );
  }
  if (typeof pin !== "string" || !pinMatches(pin)) {
    attempts.set(key, {
      count: (record && record.until > Date.now() ? record.count : 0) + 1,
      until: Date.now() + 60000,
    });
    return NextResponse.json(
      { error: "Please enter your parent PIN." },
      { status: 401 },
    );
  }
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("lw-parent", parentToken(), {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV === "production" ||
        req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 1800,
    });
    attempts.delete(key);
    return res;
  } catch {
    return NextResponse.json(
      {
        error:
          "Set a 32-character PARENT_SESSION_SECRET to enable parent tools in production.",
      },
      { status: 503 },
    );
  }
}
export async function GET() {
  const denied = await protectParent();
  return denied ?? NextResponse.json({ ok: true });
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("lw-parent");
  return res;
}
