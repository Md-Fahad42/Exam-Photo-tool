import Link from "next/link";
import type { ReactNode } from "react";

export type RuledItem = {
  /** No href = shown as plain text (for "Coming soon" rows). */
  href?: string;
  title: string;
  sub?: string;
  badge?: ReactNode;
};

function Chevron() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-muted"
    >
      <path
        d="M7 4l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RuledList({ items }: { items: readonly RuledItem[] }) {
  return (
    <ul className="grid border-t border-line lg:grid-cols-2 lg:gap-x-10">
      {items.map((item) => (
        <li key={item.href ?? item.title} className="border-b border-line">
          {item.href ? (
            <Link
              href={item.href}
              className="group flex min-h-14 items-center justify-between gap-4 py-3 text-ink"
            >
              <span>
                <span className="block font-semibold underline-offset-4 group-hover:underline">
                  {item.title}
                </span>
                {item.sub ? <span className="block text-sm text-muted">{item.sub}</span> : null}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {item.badge}
                <Chevron />
              </span>
            </Link>
          ) : (
            <div className="flex min-h-14 items-center justify-between gap-4 py-3 text-muted">
              <span>
                <span className="block font-semibold">{item.title}</span>
                {item.sub ? <span className="block text-sm">{item.sub}</span> : null}
              </span>
              {item.badge ? <span className="flex shrink-0 items-center">{item.badge}</span> : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}