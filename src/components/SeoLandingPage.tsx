"use client";

import Link from "next/link";

export function SeoLandingPage({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  bullets,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  bullets: string[];
}) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700">{description}</p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={primaryCta.href}
          className="inline-flex items-center justify-center rounded-xl bg-[#1a5156] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#164448]"
        >
          {primaryCta.label}
        </Link>
        <Link
          href={secondaryCta.href}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          {secondaryCta.label}
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">What you can do here</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">How it works</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          <li>Pick a mode (Quiz Mode or Flashcard Mode).</li>
          <li>Practice daily: quick rounds, immediate feedback, and review for what you miss.</li>
          <li>Level up through HSK vocabulary as your score grows.</li>
        </ol>
      </section>
    </main>
  );
}

