import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RuledList } from "@/components/RuledList";
import { StatusBadge } from "@/components/StatusBadge";
import { EXAMS } from "@/data/exams";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Exams: photo and signature tools by exam",
  description:
    "Pick your exam to open the photo and signature resizer for it. Each exam shows whether its size rules have been checked against the official notification.",
  path: "/exams/",
});

export default function ExamsHubPage() {
  const exams = EXAMS.filter((e) => e.live);

  return (
    <div className="wrap pb-12">
      <Breadcrumbs items={[{ label: "Exams" }]} />
      <h1 className="mt-1 text-display font-bold">Exams</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">
        Choose your exam to open the photo and signature tool for it.
      </p>

      <div className="mt-6 max-w-2xl space-y-2">
        <p>
          <strong>Verified</strong> means the size rules on that page were checked against the official
          notification, on the date shown there.
        </p>
        <p>
          <strong>Unverified</strong> means they have not been checked yet. The tool still works, but you must
          type the sizes from your own notification.
        </p>
      </div>

      <div className="mt-8">
        <RuledList
          items={exams.map((e) => ({
            href: `/exams/${e.slug}/`,
            title: e.name,
            sub: e.description,
            badge: <StatusBadge kind={e.verified ? "verified" : "unverified"} />,
          }))}
        />
      </div>

      <p className="mt-8 max-w-2xl">
        Your exam is not here? Use the{" "}
        <Link href="/tools/resize-photo/" className="text-ink underline underline-offset-4">
          photo and signature resizer
        </Link>{" "}
        and type the sizes from your notification.
      </p>
    </div>
  );
}