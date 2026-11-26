import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { PdfToJpgTool } from "@/components/PdfToJpgTool";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolNoscript } from "@/components/ToolNoscript";
import { ToolShell } from "@/components/ToolShell";
import type { Faq } from "@/data/exams";
import { faqPageLd, softwareApplicationLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

const PATH = "/tools/pdf-to-jpg/";
const TITLE = "Convert PDF pages to JPG";
const DESCRIPTION =
  "Turn PDF pages into JPG pictures. Pick the pages and the quality, then download them one by one or as a ZIP. Nothing is uploaded.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

const FAQS: Faq[] = [
  {
    question: "Does every page become a separate JPG?",
    answer:
      "Yes. Each page you choose becomes one JPG file. Leave the pages box empty to convert all pages, or type a range such as 1-3, 5.",
  },
  {
    question: "How many pages can I convert at once?",
    answer:
      "Up to 60 pages in one run, so a phone does not run out of memory. For a longer PDF, convert it in batches, for example 1-60 and then 61-120.",
  },
  {
    question: "Which quality should I choose?",
    answer:
      "Balanced suits most pages. Smaller files makes lighter JPGs that are fine for reading on a screen. Sharp keeps small print clearer but makes bigger files and takes longer.",
  },
  {
    question: "Is my PDF uploaded anywhere?",
    answer:
      "No. The pages are drawn and saved inside your browser, on your own device. The JPG files are created on your device and downloaded from there.",
  },
];

const link = "text-ink underline underline-offset-4";

export default function PdfToJpgPage() {
  return (
    <ToolShell
      title="Convert PDF pages to JPG"
      intro="Choose a PDF, pick the pages and the quality, and download the pictures. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "PDF to JPG" }]}
      below={
        <>
          <JsonLd data={softwareApplicationLd({ name: "ExamPhoto PDF to JPG", description: DESCRIPTION, path: PATH })} />
          <JsonLd data={faqPageLd(FAQS)} />

          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-bold">
              How to turn a PDF into JPG pictures
            </h2>
            <p className="mt-3">
              People often search “pdf ko jpg me kaise badle” because a form, or a chat app, wants a picture and
              not a PDF. The tool draws each page you choose on a canvas, one page at a time, and saves it as a
              JPG. Pages are white where the PDF has no background.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Choose your PDF. The tool shows how many pages it has.</li>
              <li>Leave Pages empty for all, or type the ones you need.</li>
              <li>Choose a quality, then press Convert to JPG.</li>
              <li>Download the pictures one by one, or use the ZIP.</li>
            </ol>
          </section>

          <section aria-labelledby="when-title">
            <h2 id="when-title" className="text-xl font-bold">
              When a JPG is what the form wants
            </h2>
            <p className="mt-3">
              Some upload boxes accept only pictures, such as a scanned certificate saved as a PDF by your
              college. Check the file type in your official notification. If the picture is then too big in KB,
              use the{" "}
              <Link href="/tools/compress-image/" className={link}>image compressor</Link>. A photo or signature
              field with exact pixels needs the{" "}
              <Link href="/tools/resize-photo/" className={link}>photo and signature resizer</Link>. To go back
              to one PDF, use <Link href="/tools/image-to-pdf/" className={link}>JPG to PDF</Link>. Your exam is
              on the <Link href="/exams/" className={link}>exams page</Link>.
            </p>
          </section>

          <section aria-labelledby="problems-title">
            <h2 id="problems-title" className="text-xl font-bold">
              Common problems
            </h2>
            <h3 className="mt-4 font-semibold">The text looks soft</h3>
            <p className="mt-1 text-muted">
              Choose Sharp, and convert only the pages you need. A JPG is a picture, so very small print can
              never be as clear as in the PDF.
            </p>
            <h3 className="mt-4 font-semibold">The phone slows down on a long PDF</h3>
            <p className="mt-1 text-muted">
              Convert fewer pages at a time, close other apps, and use Smaller files. You can press Cancel at
              any time and nothing is kept.
            </p>
            <h3 className="mt-4 font-semibold">The PDF is locked</h3>
            <p className="mt-1 text-muted">
              A password-protected PDF cannot be opened here. Remove the password in the app that made it and
              try again.
            </p>
            <h3 className="mt-4 font-semibold">Too many files to download</h3>
            <p className="mt-1 text-muted">
              With more than one page you also get a ZIP. Some phones need a file manager app to open it.
            </p>
          </section>

          <FaqList faqs={FAQS} />
          <RelatedTools current="pdf-to-jpg" />
        </>
      }
    >
      <ToolNoscript />
      <PdfToJpgTool />
    </ToolShell>
  );
}