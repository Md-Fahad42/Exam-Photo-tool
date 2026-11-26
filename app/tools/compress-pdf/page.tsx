import Link from "next/link";
import { CompressPdfTool } from "@/components/CompressPdfTool";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/compress-pdf/";
const TITLE = "Compress a PDF to a target size in KB or MB";
const DESCRIPTION =
  "Make a PDF smaller to fit an upload limit. Choose a light re-save or a strong rebuild, set a target in KB or MB. Runs in your browser.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "What is the difference between Light and Strong?",
    answer:
      "Light saves the PDF again and keeps the text selectable, but it often saves little or nothing. Strong draws every page as a picture and rebuilds the PDF, which can save a lot but makes the text impossible to select or search.",
  },
  {
    question: "Why could the tool not reach my target size?",
    answer:
      "Pages with photos or dense small print need more bytes to stay readable. The tool tries lower and lower quality, and if the smallest readable result is still over your target, it says so and shows the size it reached.",
  },
  {
    question: "Does this change my original file?",
    answer:
      "No. The tool makes a new file and leaves your original as it is. Keep the original, because a Strong file cannot be turned back into selectable text.",
  },
  {
    question: "Is my PDF uploaded anywhere?",
    answer:
      "No. The PDF is opened and rebuilt inside your browser, on your own device. You can check this in the Network tab of your browser’s developer tools while you use the tool.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function CompressPdfPage() {
  return (
    <ToolShell
      title="Compress a PDF to a target size"
      intro="Enter the size your form allows, choose a PDF, and see the before and after. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "PDF compressor" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto PDF compressor", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to make a PDF smaller
            </h2>
            <p className="mt-3">
              Many people search “pdf ka size kaise kam kare” when an upload page says the file is too big. Find
              the limit in your official notification or on the upload page, type it as KB or MB (200 KB or 1 MB
              are only examples of how to write it), choose a PDF, and press the button. You always see the size
              before and after, and the tool never claims a saving that did not happen.
            </p>
          </section>

          <section aria-labelledby="tradeoff-title">
            <h2 id="tradeoff-title" className="text-xl font-bold">
              Light or Strong: what you give up
            </h2>
            <h3 className="mt-4 font-semibold">Light</h3>
            <p className="mt-1 text-muted">
              Saves the PDF again without changing its pages. Text stays selectable. For a scanned PDF, which is
              already a set of pictures, the saving is usually small or none, and then there is no file to
              download.
            </p>
            <h3 className="mt-4 font-semibold">Strong</h3>
            <p className="mt-1 text-muted">
              In a browser, a real size reduction means drawing each page as a picture and building a new PDF.
              That is why text can no longer be selected, searched or copied, and links and bookmarks are lost.
              The tool tests quality settings from best to smallest, and stops at the best one that fits.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Why a PDF gets rejected for size
            </h2>
            <p className="mt-3">
              A scan from a phone camera or a printer can be several MB per page, which is the usual reason a
              certificate PDF is refused. A scan at lower resolution is often enough to read. If the PDF is still
              too big, try these in order:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                Remove pages you do not need with{" "}
                <Link href="/tools/split-pdf/" className={link}>split PDF by page range</Link>.
              </li>
              <li>
                Shrink the original pictures with the{" "}
                <Link href="/tools/compress-image/" className={link}>image compressor</Link>, then rebuild with{" "}
                <Link href="/tools/image-to-pdf/" className={link}>JPG to PDF</Link> and its Smaller file option.
              </li>
              <li>
                If several documents must go as one file, join them first with{" "}
                <Link href="/tools/merge-pdf/" className={link}>merge PDF files</Link>, then compress the result.
              </li>
              <li>
                For a photo or signature field, use the{" "}
                <Link href="/tools/resize-photo/" className={link}>photo and signature resizer</Link> instead.
              </li>
            </ol>
            <p className="mt-3">
              Check your exam on the <Link href="/exams/" className={link}>exams page</Link>. Always open the
              result and read every page before you upload it.
            </p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="compress-pdf" />
        </>
      }
    >
      <ToolNoscript />
      <CompressPdfTool />
    </ToolShell>
  );
}