"use client";

import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((m) => m.Analytics), { ssr: false });
const SpeedInsights = dynamic(() =>
  import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

/** Load after hydration so FCP/LCP are not competing with analytics script work on the main thread. */
export function DeferredVercelInstrumentation() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
