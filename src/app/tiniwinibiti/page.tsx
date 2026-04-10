import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isTiniwinibitiUnlocked, unlockTiniwinibitiGate } from "@/app/actions/tiniwinibiti";
import { GoogleLoginToggle } from "@/components/GoogleLoginToggle";
import { getGoogleLoginEnabled } from "@/lib/appSettings.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Gate",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TiniwinibitiPage(props: PageProps) {
  const searchParams = (await props.searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?authError=" + encodeURIComponent("Sign in to open this page."));
  }

  const unlocked = await isTiniwinibitiUnlocked();
  const googleOn = await getGoogleLoginEnabled();
  const errorRaw = typeof searchParams.error === "string" ? searchParams.error : null;
  const saved = searchParams.saved === "1";

  return (
    <main id="main-content" className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Gate</h1>
        <p className="mt-1 text-sm text-zinc-600">Signed in as {user.email ?? user.id}</p>

        {saved ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Saved.
          </p>
        ) : null}

        {errorRaw === "bad_pin" ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            Incorrect PIN.
          </p>
        ) : null}
        {errorRaw === "locked" ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            Enter your PIN first.
          </p>
        ) : null}
        {errorRaw && errorRaw !== "bad_pin" && errorRaw !== "locked" ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {errorRaw}
          </p>
        ) : null}

        {!unlocked ? (
          <form action={unlockTiniwinibitiGate} className="mt-6 space-y-3">
            <label className="block text-xs font-semibold text-zinc-500">PIN</label>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-[#1a5156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#164448]"
            >
              Unlock
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <GoogleLoginToggle enabled={googleOn} />
          </div>
        )}
      </div>
    </main>
  );
}
