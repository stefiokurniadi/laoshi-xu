import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();
  return [
    {
      url: base,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    { url: `${base}/mandarin-practice`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/mandarin-lessons`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/mandarin-flashcards`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/mandarin-quiz`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/free-mandarin`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/chinese-practice`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/chinese-lessons`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/chinese-flashcards`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/chinese-quiz`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/free-chinese`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
