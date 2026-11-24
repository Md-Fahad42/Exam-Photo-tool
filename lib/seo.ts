import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/** Always returns a path that starts and ends with "/" (matches trailingSlash: true). */
export function normalizePath(path: string): string {
  const withLead = path.startsWith("/") ? path : `/${path}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}

export function absoluteUrl(path: string): string {
  return `${SITE.url}${normalizePath(path)}`;
}

type MetaOptions = {
  /** Page title WITHOUT the site name; the layout template appends " | ExamPhoto". */
  title: string;
  description: string;
  /** Path of this page, e.g. "/exams/ssc/". */
  path: string;
  noindex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  noindex = false,
}: MetaOptions): Metadata {
  const canonical = normalizePath(path);
  const images = SITE.ogImage
    ? [{ url: SITE.ogImage, width: 1200, height: 630 }]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: false } : undefined,
    // Page-level openGraph replaces the layout's entirely, so it is complete here.
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
      title,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}