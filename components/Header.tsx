import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { NAV_LINKS, SITE } from "@/lib/site";

function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="text-accent"
    >
      <rect x="3" y="2" width="22" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="11" r="3.5" fill="currentColor" />
      <path
        d="M7.5 22c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="wrap flex flex-wrap items-center gap-x-4 py-1">
        <Link
          href="/"
          aria-label={`${SITE.name} home`}
          className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold text-ink"
        >
          <LogoMark />
          {SITE.name}
        </Link>

        {/* Mobile: nav drops to its own row. Desktop: sits beside the logo. */}
        <nav
          aria-label="Main"
          className="order-last -mx-3 flex w-full sm:order-none sm:mx-0 sm:w-auto sm:flex-1"
        >
          <ul className="flex flex-wrap">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center px-3 text-ink underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto sm:ml-0">
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}