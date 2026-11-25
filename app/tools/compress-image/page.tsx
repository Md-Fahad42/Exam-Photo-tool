import Link from "next/link";
import { CompressTool } from "@/components/CompressTool";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/compress-image/";
const TITLE = "Compress image to a target size in KB";
const DESCRIPTION =
  "Make a photo or scan smaller to fit the KB limit on an exam form. Works in your browser, outputs JPG or WebP, and nothing is uploaded.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "Is my picture uploaded anywhere?",
    answer:
      "No. The picture is processed inside your browser, on your own phone or computer. You can check this in the Network tab of your browser’s developer tools while you use the tool.",
  },
  {
    question: "Why can I save as JPG or WebP but not PNG?",
    answer:
      "PNG is a lossless type, so it has no quality setting that can be lowered to reduce size. JPG and WebP are lossy and can be tuned to a size limit. A PNG you add is saved as JPG or WebP.",
  },
  {
    question: "Will the picture look worse after compressing?",
    answer:
      "Lossy compression removes some fine detail. The tool tries the highest quality first and lowers it only as far as your limit needs, so the loss is as small as it can be for that limit.",
  },
  {
    question: "Can I also set a minimum size?",
    answer:
      "No. This tool only makes files smaller. If your form needs both a minimum and a maximum size in KB, use the photo and signature resizer, which has both boxes.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function CompressImagePage() {
  return (
    <ToolShell
      title="Compress an image to a target size in KB"
      intro="Type the maximum size your form allows, choose a picture, and download a smaller file. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Image compressor" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto image compressor", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to compress an image to a target size
            </h2>
            <p className="mt-3">
              Many exam forms set a maximum file size, in KB, for each upload. This tool makes a picture smaller
              until it fits the number you type in. Find the limit in your official exam notification first, and
              never guess it.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Type the maximum size in KB.</li>
              <li>Choose JPG, or WebP only if your form accepts it.</li>
              <li>Choose your picture.</li>
              <li>Press Make my file, look for the Pass mark, and download.</li>
            </ol>
          </section>

          <section aria-labelledby="when-title">
            <h2 id="when-title" className="text-xl font-bold">
              When this helps with exam forms
            </h2>
            <p className="mt-3">
              A phone photo can be several MB, far more than a form accepts. If you have searched “photo ka size
              kaise kam kare”, this is the plain answer: the tool lowers the JPG quality as little as it can
              and, if you allow it, also reduces the width and height a little.
            </p>
            <p className="mt-3">
              Need exact pixels as well as a KB limit? Use the{" "}
              <Link href="/tools/resize-photo/" className={link}>photo and signature resizer</Link>, or the{" "}
              <Link href="/tools/resize-signature/" className={link}>signature resizer</Link> for a signature. If
              the form wants a different file type, try the{" "}
              <Link href="/tools/convert-image/" className={link}>JPG, PNG and WebP converter</Link>. To send
              several pages as one file, use{" "}
              <Link href="/tools/image-to-pdf/" className={link}>JPG to PDF</Link>. Your exam is listed on the{" "}
              <Link href="/exams/" className={link}>exams page</Link>, which shows whether its size rules have
              been checked.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Common problems on exam forms
            </h2>
            <h3 className="mt-4 font-semibold">A PNG will not shrink the way a JPG does</h3>
            <p className="mt-1 text-muted">
              PNG keeps every detail, so there is no quality dial to turn down. The tool saves a PNG as a JPG or
              WebP instead. Sharp text and thin lines can look a little softer afterwards.
            </p>
            <h3 className="mt-4 font-semibold">The picture became smaller in pixels</h3>
            <p className="mt-1 text-muted">
              With “Allow a smaller width and height” on, the tool reduces the pixels only when lowering quality
              cannot reach your limit. If your form fixes the pixel size, turn it off.
            </p>
            <h3 className="mt-4 font-semibold">The result is still over the limit</h3>
            <p className="mt-1 text-muted">
              Very detailed pictures need more bytes. Try a plainer background, or allow the smaller size.
            </p>
            <h3 className="mt-4 font-semibold">Transparent areas turned white</h3>
            <p className="mt-1 text-muted">JPG cannot be see-through, so see-through parts are filled with white.</p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="compress-image" />
        </>
      }
    >
      <ToolNoscript />
      <CompressTool />
    </ToolShell>
  );
}