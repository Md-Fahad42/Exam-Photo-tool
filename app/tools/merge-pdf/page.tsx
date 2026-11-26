import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { MergePdfTool } from "@/components/MergePdfTool";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/merge-pdf/";
const TITLE = "Merge PDF files into one PDF";
const DESCRIPTION =
  "Combine several PDF files into one. Reorder or remove files, see page counts and total size. Runs in your browser; nothing is uploaded.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "Is my PDF uploaded anywhere?",
    answer:
      "No. The files are opened and joined inside your browser, on your own phone or computer. You can check this in the Network tab of your browser’s developer tools while you use the tool.",
  },
  {
    question: "In what order are the files joined?",
    answer:
      "In the order of the list, with file 1 first. Use Up and Down to change the order and Remove to take a file out before you press Merge PDFs.",
  },
  {
    question: "Why was one of my files not added?",
    answer:
      "The tool names every file it could not add and gives the reason. The usual causes are a password-protected PDF, a damaged PDF, a file that is not a PDF, or a limit of 20 files and 150 MB in total.",
  },
  {
    question: "Are bookmarks and form fields kept?",
    answer:
      "Not reliably. The pages are copied, but bookmarks and some form fields may be lost. If your document depends on them, check the merged file before you upload it.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function MergePdfPage() {
  return (
    <ToolShell
      title="Merge PDF files into one PDF"
      intro="Add your PDFs, put them in order, and download one file. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Merge PDF" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto merge PDF", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to merge PDF files
            </h2>
            <p className="mt-3">
              If you have been searching for “do pdf ko ek kaise kare”, this is it. Add the PDFs you want, check
              the page counts and the total size, set the order, and press Merge PDFs. The tool copies the pages
              of each file, one file at a time, into a new PDF.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Choose two or more PDFs. You can add more later.</li>
              <li>Use Up and Down so the first file is the one that should come first.</li>
              <li>Remove any file you added by mistake.</li>
              <li>Press Merge PDFs and download the result.</li>
            </ol>
          </section>

          <section aria-labelledby="when-title">
            <h2 id="when-title" className="text-xl font-bold">
              When one PDF is easier than many
            </h2>
            <p className="mt-3">
              Some application forms give you a single upload box for supporting documents, so a mark sheet and
              a certificate that exist as separate files have to be joined first. Your official notification says
              whether a form wants one file or several, and what the size limit is. Never assume it.
            </p>
            <p className="mt-3">
              If your documents are photos or scans rather than PDFs, turn them into pages first with{" "}
              <Link href="/tools/image-to-pdf/" className={link}>JPG to PDF</Link>, then merge. Joined files can
              get large, so the{" "}
              <Link href="/tools/compress-pdf/" className={link}>PDF compressor</Link> may be your next step. If
              you only need some pages of a bigger file, use{" "}
              <Link href="/tools/split-pdf/" className={link}>split PDF by page range</Link> first. You can find
              your exam on the <Link href="/exams/" className={link}>exams page</Link>.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Common problems on exam forms and job portals
            </h2>
            <h3 className="mt-4 font-semibold">The merged PDF is over the size limit</h3>
            <p className="mt-1 text-muted">
              Joining files adds their sizes together. Compress the merged file, or compress the biggest source
              files before you merge.
            </p>
            <h3 className="mt-4 font-semibold">A file is password-protected</h3>
            <p className="mt-1 text-muted">
              We cannot open locked PDFs. Remove the password in the app that made the file, save a new copy,
              and add that copy.
            </p>
            <h3 className="mt-4 font-semibold">Pages have different sizes or directions</h3>
            <p className="mt-1 text-muted">
              Each page keeps its own size, so a sideways scan stays sideways. Check the result in your PDF
              viewer before you upload it.
            </p>
            <h3 className="mt-4 font-semibold">The order is wrong</h3>
            <p className="mt-1 text-muted">
              Fix the order in the list before merging. The page numbers shown in the list are file numbers, not
              page numbers inside the PDF.
            </p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="merge-pdf" />
        </>
      }
    >
      <ToolNoscript />
      <MergePdfTool />
    </ToolShell>
  );
}