import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Please check the fields." },
      { status: 400 },
    );
  const code = (error as { code?: string })?.code;
  if (code === "P2002")
    return NextResponse.json(
      { error: "That title is already in use. Please choose another." },
      { status: 409 },
    );
  if (code === "P2025" || code === "P2003")
    return NextResponse.json(
      { error: "This item is no longer available. Please refresh." },
      { status: 404 },
    );
  console.error(
    "Database operation failed:",
    code ?? (error instanceof Error ? error.name : "Unknown"),
  );
  return NextResponse.json(
    {
      error:
        "Could not save right now. Check the database connection and try again.",
    },
    { status: 503 },
  );
}
export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}
export function requireDatabase() {
  if (!hasDatabase())
    return NextResponse.json(
      {
        error:
          "This is a read-only demo. Configure PostgreSQL and seed the database to save changes.",
      },
      { status: 503 },
    );
}
