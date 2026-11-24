"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

export function LanguageSwitch() {
  const pathname = usePathname() ?? "/";
  const isHindi = pathname === "/hi" || pathname.startsWith("/hi/");

  // Phase 1: Hindi pages do not exist yet, so we do not link to a 404.
  if (!SITE.hindiEnabled) {
    return (
      <span lang="hi" className="inline-flex min-h-11 items-center px-1 text-sm text-muted">
        हिन्दी · जल्द
        <span lang="en" className="sr-only"> (Hindi version coming soon)</span>
      </span>
    );
  }

  if (isHindi) {
    const target = pathname.replace(/^\/hi/, "") || "/";
    return (
      <Link
        href={target}
        lang="en"
        hrefLang="en"
        className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4"
      >
        English
      </Link>
    );
  }

  return (
    <Link
      href={`/hi${pathname}`}
      lang="hi"
      hrefLang="hi"
      className="inline-flex min-h-11 items-center px-1 text-sm underline underline-offset-4"
    >
      हिन्दी
    </Link>
  );
}