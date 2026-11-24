import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";

export type Crumb = { label: string; href?: string };

/** "Home" is added automatically. Leave `href` off the last (current) item. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="py-1">
      <ol className="flex flex-wrap items-center text-sm text-muted">
        {all.map((crumb, i) => {
          const isLast = i === all.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-ink">
                  {crumb.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </nav>
  );
}