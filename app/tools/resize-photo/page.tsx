import { PhotoTool } from "@/components/PhotoTool";
import { RuledList } from "@/components/RuledList";
import { ToolShell } from "@/components/ToolShell";
import { COMMON_FAQS, EXAMS } from "@/data/exams";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Resize photo and signature for exam forms",
  description:
    "Resize, crop and compress a photo or signature to the width, height and KB your exam form asks for. Free, works in your browser, nothing is uploaded.",
  path: "/tools/resize-photo/",
});

export default function ResizePhotoPage() {
  return (
    <ToolShell
      title="Photo and signature resizer"
      intro="Set the size your form asks for, choose a picture, and download the result. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Photo and signature resizer" }]}
      below={
        <>
          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to use it
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Read the photo and signature rules in your official exam notification.</li>
              <li>Type the width, height and KB limits into the boxes above.</li>
              <li>Choose a picture, or take one with your camera.</li>
              <li>Drag and zoom so the face or signature fills the frame.</li>
              <li>Press Make my file, check the Pass marks, and download.</li>
            </ol>
          </section>

          <section aria-labelledby="exam-list-title">
            <h2 id="exam-list-title" className="text-xl font-bold">
              Making it for a specific exam?
            </h2>
            <p className="mb-4 mt-1 text-muted">Open your exam page for notes and common mistakes.</p>
            <RuledList
              items={EXAMS.filter((e) => e.live).map((e) => ({
                href: `/exams/${e.slug}/`,
                title: e.name,
                sub: e.description,
              }))}
            />
          </section>

          <section aria-labelledby="faq-title">
            <h2 id="faq-title" className="text-xl font-bold">
              Questions
            </h2>
            <div className="mt-3 space-y-5">
              {COMMON_FAQS.map((f) => (
                <div key={f.question}>
                  <h3 className="font-semibold">{f.question}</h3>
                  <p className="mt-1 text-muted">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      }
    >
      <PhotoTool />
    </ToolShell>
  );
}