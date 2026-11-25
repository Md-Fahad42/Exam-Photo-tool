import Link from "next/link";
import { ConvertTool } from "@/components/ConvertTool";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/convert-image/";
const TITLE = "Convert JPG, PNG and WebP images";
const DESCRIPTION =
  "Convert a picture between JPG, PNG and WebP in your browser. Nothing is uploaded. Notes on transparency and file size included.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "Which file types can I convert?",
    answer:
      "You can save a picture as JPG, PNG or WebP. As input, the tool accepts any picture your browser can open, which usually includes JPG, PNG and WebP.",
  },
  {
    question: "What happens to transparent areas?",
    answer:
      "PNG and WebP can be see-through. JPG cannot, so when you save as JPG, see-through areas are filled with white. PNG and WebP outputs keep the transparency.",
  },
  {
    question: "Why is my PNG so much bigger than the JPG?",
    answer:
      "PNG stores every detail without loss, which suits logos and screenshots but makes photos large. A JPG of the same photo is usually much smaller.",
  },
  {
    question: "Does converting change the width and height?",
    answer:
      "No. The new file has the same width and height as your original. To change the pixels or the KB size, use the photo and signature resizer or the image compressor.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function ConvertImagePage() {
  return (
    <ToolShell
      title="Convert JPG, PNG and WebP images"
      intro="Choose a picture, pick the file type your form needs, and download the converted file. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Image format converter" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto image format converter", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to convert between JPG, PNG and WebP
            </h2>
            <p className="mt-3">
              The picture is redrawn in your browser at its original width and height, so it is not made smaller
              in pixels. To change the pixels, use the{" "}
              <Link href="/tools/resize-photo/" className={link}>photo and signature resizer</Link>.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Choose a picture.</li>
              <li>Choose JPG, PNG or WebP.</li>
              <li>For JPG and WebP, keep the default quality unless you need a smaller file.</li>
              <li>Press Convert and download.</li>
            </ol>
          </section>

          <section aria-labelledby="when-title">
            <h2 id="when-title" className="text-xl font-bold">
              When a different file type helps
            </h2>
            <p className="mt-3">
              Some upload pages accept only JPG, others also allow PNG, and WebP is often refused even though
              modern browsers open it. Pictures saved from websites or chat apps are sometimes WebP, which is
              why a form may reject them. Students who search “jpg ko png me kaise convert kare” are usually
              facing exactly this. Check which types your official notification allows.
            </p>
            <p className="mt-3">
              After converting, you may still need to meet a size limit: use the{" "}
              <Link href="/tools/compress-image/" className={link}>image compressor</Link>. If the documents
              must go as one file, use{" "}
              <Link href="/tools/image-to-pdf/" className={link}>JPG to PDF</Link>. For a signature scan, the{" "}
              <Link href="/tools/resize-signature/" className={link}>signature resizer</Link> sets the exact
              size. You can find your exam on the{" "}
              <Link href="/exams/" className={link}>exams page</Link>.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Common problems on exam forms
            </h2>
            <h3 className="mt-4 font-semibold">A see-through PNG turns white as a JPG</h3>
            <p className="mt-1 text-muted">
              This is expected. JPG has no transparency, so the tool paints a white background first. Check the
              After picture before you download.
            </p>
            <h3 className="mt-4 font-semibold">The PNG came out bigger than the original JPG</h3>
            <p className="mt-1 text-muted">
              Saving a photo as PNG keeps all detail and makes it large. For a photo with a size limit, save as
              JPG instead.
            </p>
            <h3 className="mt-4 font-semibold">The file will not open</h3>
            <p className="mt-1 text-muted">
              Some browsers cannot open HEIC photos from certain phones. Take the photo again, or save it as
              JPG on your phone first.
            </p>
            <h3 className="mt-4 font-semibold">WebP is not available</h3>
            <p className="mt-1 text-muted">
              Some older browsers cannot save WebP. The tool tells you, and you can choose JPG or PNG.
            </p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="convert-image" />
        </>
      }
    >
      <ToolNoscript />
      <ConvertTool />
    </ToolShell>
  );
}