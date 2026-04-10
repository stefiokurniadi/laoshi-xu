import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSuperadminEmail } from "@/lib/superadmin";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

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
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?authError=${encodeURIComponent(error.message)}`, requestUrl.origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dest = user && isSuperadminEmail(user.email) ? "/admin" : "/";
  return redirectWithAuthCookies(requestUrl, dest, pendingCookies);
}
