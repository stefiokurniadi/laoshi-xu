import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSuperadminEmail } from "@/lib/superadmin";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function loginRedirectForVerifyError(requestUrl: URL, error: { message: string; code?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  const expired =
    code === "otp_expired" ||
    msg.includes("expired") ||
    msg.includes("has expired") ||
    msg.includes("invalid or has expired");
  const friendly = expired
    ? "This confirmation link has expired. Use Sign up with the same email to get a new confirmation message."
    : error.message;
  const q = new URLSearchParams({ authError: friendly });
  if (expired) q.set("verifyExpired", "1");
  return NextResponse.redirect(new URL(`/login?${q}`, requestUrl.origin));
}

function redirectWithAuthCookies(
  requestUrl: URL,
  pathname: string,
  cookiesToSet: CookieToSet[],
): NextResponse {
  const res = NextResponse.redirect(new URL(pathname, requestUrl.origin));
  for (const { name, value, options } of cookiesToSet) {
    res.cookies.set(name, value, options);
  }
  return res;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const nextRaw = requestUrl.searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let pendingCookies: CookieToSet[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies = cookiesToSet;
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as never, token_hash });
    if (error) {
      return loginRedirectForVerifyError(requestUrl, error);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const dest = user && isSuperadminEmail(user.email) ? "/admin" : next;
    return redirectWithAuthCookies(requestUrl, dest, pendingCookies);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginRedirectForVerifyError(requestUrl, error);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const dest = user && isSuperadminEmail(user.email) ? "/admin" : next;
    return redirectWithAuthCookies(requestUrl, dest, pendingCookies);
  }

  return NextResponse.redirect(
    new URL(
      `/login?authError=${encodeURIComponent("This confirmation link is missing required details. Try signing in, or request a new link from Sign up.")}`,
      requestUrl.origin,
    ),
  );
}
