import { ExamSelector } from "@/components/ExamSelector";
import { RuledList } from "@/components/RuledList";
import { EXAMS } from "@/data/exams";
import { TOOLS } from "@/data/tools";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free exam form photo, signature & PDF tools",
  description:
    "Resize photo and signature, compress images, and make PDFs for Indian government exam forms. Your files stay on your device.",
  path: "/",
});

// Only list pages that really exist, so nobody clicks into a 404.
const LIVE_EXAMS = EXAMS.filter((e) => e.live);
const LIVE_TOOLS = TOOLS.filter((t) => t.live);

export default function HomePage() {
  return (
    <div className="wrap pb-8 pt-6 sm:pt-10">
      <section aria-labelledby="hero-title" className="max-w-2xl">
        <h1 id="hero-title" className="text-display font-bold">
          Get your photo, signature and PDF ready for your exam form
        </h1>
        <p className="mt-3 text-lg text-muted">
          Choose your exam to find the right tool. Your files stay on your device. Nothing is uploaded.
        </p>
      </section>

      <div className="mt-6 max-w-2xl">
        <ExamSelector exams={LIVE_EXAMS} />
        <p className="mt-3 text-sm text-muted">
          Exam not in the list? Pick a tool directly from{" "}
          <a href="#tools" className="text-ink underline underline-offset-4">
            the tools below
          </a>
          .
        </p>
      </div>

      <section id="exams" aria-labelledby="exams-title" className="mt-14 scroll-mt-4">
        <h2 id="exams-title" className="text-xl font-bold">
          Exams
        </h2>
        <p className="mb-4 mt-1 max-w-2xl text-muted">We are starting with these exams and will add more.</p>
        <RuledList
          items={LIVE_EXAMS.map((e) => ({
            href: `/exams/${e.slug}/`,
            title: e.name,
            sub: e.description,
          }))}
        />
      </section>

      <section id="tools" aria-labelledby="tools-title" className="mt-14 scroll-mt-4">
        <h2 id="tools-title" className="text-xl font-bold">
          Tools
        </h2>
        <p className="mb-4 mt-1 max-w-2xl text-muted">Each tool works in your browser, on your phone or computer.</p>
        <RuledList
          items={LIVE_TOOLS.map((t) => ({
            href: `/tools/${t.slug}/`,
            title: t.name,
            sub: t.blurb,
          }))}
        />
      </section>

      <section aria-labelledby="check-title" className="mt-14 max-w-2xl">
        <h2 id="check-title" className="text-xl font-bold">
          Before you submit
        </h2>
        <p className="mt-2">
          Size rules change between exams and between years. Always confirm them in the official notification
          before you upload.
        </p>
      </section>
    </div>
  );
}