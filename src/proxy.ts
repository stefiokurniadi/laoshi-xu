import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkApiWordRateLimit } from "@/lib/rateLimit";
import { createClient } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const limited = await checkApiWordRateLimit(request);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.message }, { status: 429 });
  }
  return createClient(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

