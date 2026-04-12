import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";

const linkClass =
  "text-white/95 underline decoration-white/45 underline-offset-2 transition-colors hover:text-white hover:decoration-white";

export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#164448] py-3.5 text-center text-[11px] text-white/90">
      <nav aria-label="Legal and site information" className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-1 sm:gap-y-1">
        <span className="text-white/85">© copyrights by Laoshi Xu</span>
        <span className="hidden text-white/40 sm:inline" aria-hidden>
          ·
        </span>
        <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:gap-x-3">
          <Link href="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          <span className="text-white/40" aria-hidden>
            ·
          </span>
          <Link href="/terms" className={linkClass}>
            Terms of Service
          </Link>
          <span className="text-white/40" aria-hidden>
            ·
          </span>
          <Link href="/cookies" className={linkClass}>
            Cookies
          </Link>
          <span className="text-white/40" aria-hidden>
            ·
          </span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            Support
          </a>
        </span>
      </nav>
    </footer>
  );
}
