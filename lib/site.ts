const rawUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!rawUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "[site] NEXT_PUBLIC_SITE_URL is not set. Canonical URLs and the sitemap will use a placeholder domain."
  );
}

export type SiteConfig = {
  name: string;
  url: string;
  locale: string;
  description: string;
  /** Path to a 1200x630 image inside /public, e.g. "/og-default.png". null = no image yet. */
  ogImage: string | null;
  /** Flip to true only when real Hindi pages exist under /hi/. */
  hindiEnabled: boolean;
};

export const SITE: SiteConfig = {
  name: "ExamPhoto",
  // ".invalid" is a reserved TLD: if this ever ships by mistake, it is obviously wrong.
  url: (rawUrl ?? "https://example.invalid").replace(/\/+$/, ""),
  locale: "en_IN",
  description:
    "Resize photo and signature, compress images, and make PDFs for Indian government exam forms. Your files stay on your device.",
  ogImage: null,
  hindiEnabled: false,
};

// "Guides" is removed until Phase 4 (the pages do not exist yet).
export const NAV_LINKS = [
  { label: "Tools", href: "/tools/" },
  { label: "Exams", href: "/exams/" },
] as const;

export const FOOTER_LINKS = [
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
] as const;