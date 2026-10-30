import { NextRequest, NextResponse } from "next/server";
import { accountContext } from "@/lib/security/account";
import { sameOrigin } from "@/lib/http/origin";
export async function learningAccess(req: NextRequest, write = true) {
  const context = await accountContext(write);
  if (context.response) return { response: context.response };
  if (process.env.GENERATIVE_UI_ENABLED !== "true")
    return {
      response: NextResponse.json(
        { error: "Learning adventures are unavailable." },
        { status: 404 },
      ),
    };
  if (write && !sameOrigin(req.headers.get("origin"), req.headers.get("host")))
    return {
      response: NextResponse.json(
        { error: "Please use the app." },
        { status: 403 },
      ),
    };
  return { child: context.account.child };
}
