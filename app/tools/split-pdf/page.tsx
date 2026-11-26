import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { RelatedTools } from "@/components/RelatedTools";
import { SplitPdfTool } from "@/components/SplitPdfTool";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/split-pdf/";
const TITLE = "Split a PDF by page range";
const DESCRIPTION =
  "Split a PDF by page range such as 1-3, 5, 7-9, extract chosen pages, or save every page as its own file. Works in your browser, no upload.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "How do I write the page range?",
    answer:
      "Type page numbers and ranges separated by commas, for example 1-3, 5, 7-9. A single number is one page, and two numbers with a dash are a range. Every page must exist in your PDF.",
  },
  {
    question: "What is the difference between splitting and extracting?",
    answer:
      "Splitting by range makes one new PDF for each range you type. Extracting puts all the pages you type into one new PDF, in page order.",
  },
  {
    question: "Can I download all the files at once?",
    answer:
      "When there is more than one file, you get a ZIP with all of them, and you can also download them one by one. Some phones need a file manager app to open a ZIP.",
  },
  {
    question: "Is my PDF uploaded anywhere?",
    answer:
      "No. The PDF is opened and cut inside your browser, on your own device. The pages are copied as they are, so text stays selectable.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function SplitPdfPage() {
  return (
    <ToolShell
      title="Split a PDF by page range"
      intro="Choose a PDF, type the pages you need, and download the new files. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Split PDF" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto split PDF", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="modes-title">
            <h2 id="modes-title" className="text-xl font-bold">
              Three ways to split a PDF
            </h2>
            <p className="mt-3">
              Searching for “pdf ke pages alag kaise kare”? Choose one of these ways. The pages are copied
              without being redrawn, so text stays selectable and the quality does not change.
            </p>
            <h3 className="mt-4 font-semibold">By page range</h3>
            <p className="mt-1 text-muted">
              Type ranges such as 1-3, 5, 7-9. Each range becomes its own PDF, so this example makes three files.
            </p>
            <h3 className="mt-4 font-semibold">Extract selected pages</h3>
            <p className="mt-1 text-muted">
              Type the pages you want. They are put together in one new PDF, in page order, even if you typed
              them in another order.
            </p>
            <h3 className="mt-4 font-semibold">Every page as a separate file</h3>
            <p className="mt-1 text-muted">
              One PDF per page, up to 300 pages. You get a ZIP, or you can download the files one by one.
            </p>
          </section>

          <section aria-labelledby="when-title">
            <h2 id="when-title" className="text-xl font-bold">
              Why you might split a PDF
            </h2>
            <p className="mt-3">
              A scan of a whole booklet may contain pages a form does not need. Pulling out only the certificate
              page keeps the upload small. Some portals accept several files, so splitting a big PDF into parts
              can be another way to stay under a limit. Check your notification before you rely on that.
            </p>
            <p className="mt-3">
              To join pieces again, use{" "}
              <Link href="/tools/merge-pdf/" className={link}>merge PDF files</Link>. If a part is still too big,
              try the <Link href="/tools/compress-pdf/" className={link}>PDF compressor</Link>. A form that wants
              a picture of one page can use{" "}
              <Link href="/tools/pdf-to-jpg/" className={link}>PDF to JPG</Link>. Your exam is on the{" "}
              <Link href="/exams/" className={link}>exams page</Link>.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Common problems with page ranges
            </h2>
            <h3 className="mt-4 font-semibold">“Page 12 is not in this PDF”</h3>
            <p className="mt-1 text-muted">
              The tool shows how many pages your PDF has. A range cannot go past that number.
            </p>
            <h3 className="mt-4 font-semibold">The range goes backwards</h3>
            <p className="mt-1 text-muted">Write the smaller page first: 3-5, not 5-3.</p>
            <h3 className="mt-4 font-semibold">A part is still over the size limit</h3>
            <p className="mt-1 text-muted">
              Splitting does not shrink the pages themselves. Split into smaller ranges, or compress the part.
            </p>
            <h3 className="mt-4 font-semibold">The PDF will not open</h3>
            <p className="mt-1 text-muted">
              A password-protected or damaged PDF cannot be split. The tool tells you which one it is.
            </p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="split-pdf" />
        </>
      }
    >
      <ToolNoscript />
      <SplitPdfTool />
    </ToolShell>
  );
}