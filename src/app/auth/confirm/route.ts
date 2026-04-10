import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isSuperadminEmail } from "@/lib/superadmin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const { error } = await supabase.auth.verifyOtp({ type: type as never, token_hash });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?authError=${encodeURIComponent(error.message)}`, requestUrl.origin),
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const dest =
      user && isSuperadminEmail(user.email) ? "/admin" : next;
    return NextResponse.redirect(new URL(dest, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

