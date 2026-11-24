import type { MetadataRoute } from "next";
import { EXAMS } from "@/data/exams";
import { TOOLS } from "@/data/tools";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static"; // required for output: "export"

// Fixed pages that are indexable.
const STATIC_PATHS = ["/", "/tools/", "/exams/", "/about/", "/contact/", "/privacy/", "/terms/"];

// Exam pages are listed only when verified (unverified exam pages are noindex).
// `lastModified` is omitted on purpose: a fake date teaches Google to ignore it.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PATHS,
    ...TOOLS.filter((t) => t.live).map((t) => `/tools/${t.slug}/`),
    ...EXAMS.filter((e) => e.live && e.verified).map((e) => `/exams/${e.slug}/`),
  ];
  return paths.map((path) => ({ url: absoluteUrl(path) }));
}