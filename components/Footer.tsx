import Link from "next/link";
import { FOOTER_LINKS, SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="wrap py-8">
        <nav aria-label="Footer">
          <ul className="-mx-3 flex flex-wrap">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center px-3 text-ink underline underline-offset-4"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          {SITE.name} is an independent tool. It is not connected to any exam
          body or government agency. Always check the official notification
          for your exam before you submit your form.
        </p>
        <p className="mt-2 text-sm text-muted">
          © {new Date().getFullYear()} {SITE.name}
        </p>
      </div>
    </footer>
  );
}