import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { ImageToPdfTool } from "@/components/ImageToPdfTool";
import { JsonLd } from "@/components/JsonLd";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/image-to-pdf/";
const TITLE = "JPG to PDF: combine images into one PDF";
const DESCRIPTION =
  "Put one or more photos or scans into a single PDF. Reorder or remove pages, choose A4 or fit-to-image. Runs in your browser, nothing uploaded.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "In what order do the pictures appear in the PDF?",
    answer:
      "In the order of the list, with page 1 first. Use the Up and Down buttons to change the order and Remove to delete a page before you press Make PDF.",
  },
  {
    question: "What is the difference between A4 and fit to picture?",
    answer:
      "A4 puts each picture on an A4 page with a small border and turns the page sideways for wide pictures. Fit to picture makes each page the same shape as its picture, with no border.",
  },
  {
    question: "Can I make the PDF smaller?",
    answer:
      "Choose “Smaller file” and add only the pages you need. This lowers the picture detail inside the PDF. We cannot promise an exact size, so check the result against your form’s limit.",
  },
  {
    question: "Can I select or search the text in the PDF?",
    answer:
      "No. Each page is a picture, so text in a scan stays part of the picture. The PDF is made in your browser and nothing is uploaded.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function ImageToPdfPage() {
  return (
    <ToolShell
      title="JPG to PDF: combine images into one PDF"
      intro="Add your photos or scans, put them in order, and download one PDF. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Image to PDF" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto image to PDF", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to put images into one PDF
            </h2>
            <p className="mt-3">
              Some exam forms ask for a document, such as a certificate and its back page, as one PDF. If you
              have searched “photo ko pdf kaise banaye”, the steps are below. Add the pictures, set the order,
              and make the PDF. Your notification tells you whether a PDF is needed.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Add your photos or scans. Up to 30 pictures fit in one PDF.</li>
              <li>Use Up and Down to set the order, and Remove to delete a page.</li>
              <li>Choose A4 or Fit to picture.</li>
              <li>Choose Smaller file if your form has a size limit.</li>
              <li>Press Make PDF and download.</li>
            </ol>
          </section>

          <section aria-labelledby="when-title">
            <h2 id="when-title" className="text-xl font-bold">
              A4 or fit to picture
            </h2>
            <p className="mt-3">
              A4 suits documents that will be printed or read as pages. Fit to picture suits scans that already
              cover the whole page, because nothing is added around them. Whichever you choose, the PDF is
              made in your browser from the pictures you add.
            </p>
            <p className="mt-3">
              If a picture is too big in KB, make it smaller first with the{" "}
              <Link href="/tools/compress-image/" className={link}>image compressor</Link>. If a portal rejects
              a file type, the{" "}
              <Link href="/tools/convert-image/" className={link}>JPG, PNG and WebP converter</Link> can help.
              For the photo and signature fields, use the{" "}
              <Link href="/tools/resize-photo/" className={link}>photo and signature resizer</Link>. Your exam
              is on the <Link href="/exams/" className={link}>exams page</Link>.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Common problems on exam forms
            </h2>
            <h3 className="mt-4 font-semibold">The PDF is over the size limit</h3>
            <p className="mt-1 text-muted">
              Choose “Smaller file”, add fewer pages, or shrink each picture before you add it.
            </p>
            <h3 className="mt-4 font-semibold">The pages are in the wrong order</h3>
            <p className="mt-1 text-muted">
              Fix the order in the list before pressing Make PDF. Each press of Up or Down moves a page one
              place.
            </p>
            <h3 className="mt-4 font-semibold">A page is dark, tilted or hard to read</h3>
            <p className="mt-1 text-muted">
              Retake the photo with the paper flat on a table, in daylight, holding the phone straight above it.
              Then remove the old page and add the new one.
            </p>
            <h3 className="mt-4 font-semibold">A file was not added</h3>
            <p className="mt-1 text-muted">
              The tool names every file it could not open. Photos in a format your browser cannot read, such as
              some HEIC files, need to be saved as JPG first.
            </p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="image-to-pdf" />
        </>
      }
    >
      <ToolNoscript />
      <ImageToPdfTool />
    </ToolShell>
  );
}