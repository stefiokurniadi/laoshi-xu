import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Laoshi Xu collects, uses, and protects your personal information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl flex-1 px-5 py-12 sm:py-16">
      <p className="mb-8">
        <Link href="/" className="text-sm font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]">
          ← Back to home
        </Link>
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 10, 2026</p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-zinc-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">1. Who we are</h2>
          <p>
            Laoshi Xu (“we”, “us”) operates this website and learning service. This policy describes how we handle
            personal information when you use the site, create an account, or contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#1a5156] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">2. What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account data:</strong> email address and authentication details when you sign up or sign in
              (including optional sign-in with Google, if enabled).
            </li>
            <li>
              <strong>Learning activity:</strong> scores, review lists, flashcard usage, and related progress stored to
              provide the service (e.g. leaderboard, review features).
            </li>
            <li>
              <strong>Technical data:</strong> IP address and basic request data processed by our hosting, database, and
              security providers for operation, abuse prevention, and rate limiting.
            </li>
            <li>
              <strong>Analytics:</strong> aggregated usage metrics via our analytics provider to understand traffic and
              improve the product (see our{" "}
              <Link href="/cookies" className="font-medium text-[#1a5156] underline underline-offset-2">
                Cookies
              </Link>{" "}
              page).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">3. How we use information</h2>
          <p>We use personal information to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide, secure, and improve the service;</li>
            <li>Authenticate you and maintain your session;</li>
            <li>Send transactional emails (e.g. sign-up confirmation) where applicable;</li>
            <li>Detect abuse, spam, and protect users and infrastructure.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">4. Legal bases (EEA/UK)</h2>
          <p>
            Where GDPR/UK GDPR applies, we rely on contract (providing the service you request), legitimate interests
            (security, analytics, product improvement), and consent where required (e.g. non-essential cookies or
            marketing, if offered).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">5. Sharing and processors</h2>
          <p>
            We use trusted service providers (“processors”) to host the app and store data, including authentication and
            database services (e.g. Supabase), hosting/analytics (e.g. Vercel), and optional security or AI features as
            described in the product. They process data only on our instructions and under appropriate agreements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">6. Retention</h2>
          <p>
            We keep information as long as your account is active and as needed to operate the service, comply with law,
            and resolve disputes. You may request deletion of your account subject to legal exceptions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">7. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or export your personal data, or
            to object to or restrict certain processing. Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#1a5156] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>{" "}
            to exercise these rights. You may also lodge a
            complaint with your local data protection authority.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">8. Children</h2>
          <p>
            The service is not directed at children under the age required for lawful consent in your region without
            parental involvement. Do not provide personal information if you are not old enough to use the service under
            applicable law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">9. International transfers</h2>
          <p>
            Your information may be processed in countries other than your own. Where required, we use appropriate
            safeguards (such as standard contractual clauses) for transfers from the EEA/UK.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">10. Changes</h2>
          <p>
            We may update this policy from time to time. We will post the revised version on this page and update the
            “Last updated” date.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">11. Contact</h2>
          <p>
            For privacy questions or requests:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#1a5156] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <p className="border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          This page is a practical template for a small web app. It is not legal advice; have counsel review it for your
          jurisdiction and product.
        </p>
      </div>
    </main>
  );
}
