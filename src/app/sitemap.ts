import type { MetadataRoute } from "next";
import { listTitles } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/catalog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/chat`, changeFrequency: "weekly", priority: 0.3 },
  ];
  try {
    const titles = await listTitles();
    return [...pages, ...titles.map((t) => ({ url: `${SITE_URL}/anime/${t.slug}`, changeFrequency: "weekly" as const, priority: 0.7 }))];
  } catch {
    return pages;
  }
}
