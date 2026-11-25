import Link from "next/link";
import { RuledList } from "@/components/RuledList";
import { TOOLS } from "@/data/tools";

export function RelatedTools({ current }: { current: string }) {
  const items = TOOLS.filter((t) => t.live && t.slug !== current).map((t) => ({
    href: `/tools/${t.slug}/`,
    title: t.name,
    sub: t.blurb,
  }));
  return (
    <section aria-labelledby="related-title">
      <h2 id="related-title" className="text-xl font-bold">
        Related tools
      </h2>
      <div className="mt-3">
        <RuledList items={items} />
      </div>
      <p className="mt-4">
        Looking for your exam?{" "}
        <Link href="/exams/" className="text-ink underline underline-offset-4">
          See all exams and their size-rule status
        </Link>
        .
      </p>
    </section>
  );
}