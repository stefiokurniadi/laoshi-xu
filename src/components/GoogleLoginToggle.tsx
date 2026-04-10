"use client";

import { useTransition } from "react";
import { disableGoogleLoginAction, enableGoogleLoginAction } from "@/app/actions/tiniwinibiti";

export function GoogleLoginToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(() => {
      void (enabled ? disableGoogleLoginAction() : enableGoogleLoginAction());
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3.5">
      <div className="min-w-0">
        <p id="google-login-toggle-label" className="text-sm font-medium text-zinc-900">
          Google login on /login
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {enabled ? "Button shown on the sign-in page" : "Hidden; email sign-in only"}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="google-login-toggle-label"
        aria-busy={pending}
        disabled={pending}
        onClick={toggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5156] focus-visible:ring-offset-2 ${
          enabled ? "bg-[#1a5156]" : "bg-zinc-300"
        } ${pending ? "cursor-wait opacity-70" : ""}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-1 left-1 block h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out ${
            enabled ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
