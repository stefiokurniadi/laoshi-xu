import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of Laoshi Xu.",
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl flex-1 px-5 py-12 sm:py-16">
      <p className="mb-8">
        <Link href="/" className="text-sm font-medium text-[#1a5156] underline underline-offset-2 hover:text-[#164448]">
          ← Back to home
        </Link>
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 10, 2026</p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-zinc-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">1. Agreement</h2>
          <p>
            By accessing or using Laoshi Xu (“Service”), you agree to these Terms. If you do not agree, do not use the
            Service. We may change these Terms; continued use after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">2. The Service</h2>
          <p>
            Laoshi Xu provides online Mandarin/HSK vocabulary practice (e.g. flashcards, modes, leaderboard, review
            features). We may modify, suspend, or discontinue features with reasonable notice where practicable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">3. Accounts</h2>
          <p>
            You are responsible for your account credentials and for activity under your account. Provide accurate
            information. You must not share accounts in ways that violate security or fair use. We may suspend or
            terminate accounts that breach these Terms or harm the Service or other users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the Service unlawfully or to harass, abuse, or harm others;</li>
            <li>Attempt to gain unauthorized access to systems, data, or accounts;</li>
            <li>Overload, scrape, or automate the Service in ways that impair stability or circumvent limits;</li>
            <li>Misrepresent identity or manipulate leaderboards or ratings dishonestly.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">5. Intellectual property</h2>
          <p>
            The Service, branding, and original content are owned by us or our licensors. You receive a limited,
            revocable license to use the Service for personal, non-commercial learning unless we agree otherwise.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">6. User content</h2>
          <p>
            If you submit content (e.g. feedback), you grant us a license to use it to operate and improve the Service.
            You represent you have the rights to submit that content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">7. Disclaimers</h2>
          <p>
            The Service is provided “as is” and “as available”. We do not guarantee uninterrupted or error-free
            operation. Educational content is for practice only; we are not responsible for exam outcomes or
            professional language certification.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or
            punitive damages, or for loss of profits, data, or goodwill. Our aggregate liability for claims relating to
            the Service is limited to the greater of amounts you paid us in the twelve months before the claim (if any)
            or fifty USD, except where liability cannot be limited by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">9. Governing law</h2>
          <p>
            These Terms are governed by the laws applicable to the operator’s jurisdiction, without regard to conflict of
            law rules, unless mandatory consumer protections in your country require otherwise.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900">10. Contact</h2>
          <p>
            For questions about these Terms:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[#1a5156] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <p className="border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          Template terms for a small web app—not legal advice. Have qualified counsel review for your situation.
        </p>
      </div>
    </main>
  );
}
