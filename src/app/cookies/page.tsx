import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "How Laoshi Xu uses cookies and similar technologies.",
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl flex-1 px-5 py-12 sm:py-16">
      <p className="mb-8">
        <Link href="/" className="text-sm font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]">
          ← Back to home
        </Link>
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Cookies and similar technologies</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 10, 2026</p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-zinc-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">1. What we use</h2>
          <p>
            We use cookies and similar technologies (e.g. local storage, pixels) where needed to run the site, keep you
            signed in, remember preferences, reduce abuse, and measure aggregate usage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">2. Types</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Strictly necessary:</strong> session and security cookies (including those set by our auth
              provider) so login and core features work.
            </li>
            <li>
              <strong>Functional:</strong> choices you make on the site (e.g. UI preferences) where implemented.
            </li>
            <li>
              <strong>Analytics:</strong> our hosting/analytics tools (e.g. Vercel Analytics, Speed Insights) may use
              cookies or similar identifiers to collect aggregated performance and usage data.
            </li>
            <li>
              <strong>Third parties:</strong> optional widgets (e.g. Cloudflare Turnstile for anti-spam) may set their
              own cookies subject to their policies.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">3. EEA/UK and consent</h2>
          <p>
            Where required by law, we rely on consent for non-essential cookies or provide a way to manage preferences.
            If we add a consent banner or preference center, we will link it from this page. Until then, you can use
            browser controls described below.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">4. How to control cookies</h2>
          <p>
            Most browsers let you block or delete cookies via settings. Blocking strictly necessary cookies may break
            sign-in or core features. Guides:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                className="font-medium text-[#1a5156] underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer"
                className="font-medium text-[#1a5156] underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                className="font-medium text-[#1a5156] underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Safari
              </a>
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">5. More detail</h2>
          <p>
            See our{" "}
            <Link href="/privacy" className="font-medium text-[#1a5156] underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            for how we process personal data. For questions:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#1a5156] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <p className="border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          Template notice—not legal advice. Align with your analytics setup and regional requirements.
        </p>
      </div>
    </main>
  );
}
