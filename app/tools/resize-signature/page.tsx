import Link from "next/link";
import { PhotoTool } from "@/components/PhotoTool";
import { ToolShell } from "@/components/ToolShell";
import { COMMON_FAQS } from "@/data/exams";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Resize signature for exam forms (pixels and KB)",
  description:
    "Resize and compress a scanned or photographed signature to the width, height and KB your exam form asks for. Free, in your browser, nothing is uploaded.",
  path: "/tools/resize-signature/",
});

const SIGNATURE_FAQS = [
  {
    question: "Why does my signature look faint after resizing?",
    answer:
      "A thin pen line becomes even thinner when the picture is made smaller. Sign with a dark pen, press firmly, and fill most of the frame by zooming in before you make the file.",
  },
  {
    question: "Should I turn on the white background option?",
    answer:
      "It helps when the signature is on plain white or light paper and the background looks grey in the preview. Check the preview and the result. If the signature gets thin or broken, lower the strength or turn it off.",
  },
];

export default function ResizeSignaturePage() {
  return (
    <ToolShell
      title="Signature resizer"
      intro="Set the size your form asks for, choose a picture of your signature, and download the result. Your files stay on your device."
      crumbs={[{ label: "Tools", href: "/tools/" }, { label: "Signature resizer" }]}
      below={
        <>
          <section aria-labelledby="sig-how-title">
            <h2 id="sig-how-title" className="text-xl font-bold">
              How to get a good signature picture
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Sign with a dark pen on plain white paper.</li>
              <li>Take the photo in good light, holding the phone straight above the paper. Avoid shadows.</li>
              <li>Read the signature rules in your official exam notification.</li>
              <li>Type the width, height and KB limits into the boxes above.</li>
              <li>Choose the picture, zoom in so the signature fills the frame, then press Make my file.</li>
              <li>Check the Pass marks and download.</li>
            </ol>
          </section>

          <section aria-labelledby="sig-faq-title">
            <h2 id="sig-faq-title" className="text-xl font-bold">
              Questions
            </h2>
            <div className="mt-3 space-y-5">
              {[...SIGNATURE_FAQS, ...COMMON_FAQS].map((f) => (
                <div key={f.question}>
                  <h3 className="font-semibold">{f.question}</h3>
                  <p className="mt-1 text-muted">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <p>
            Need to resize a passport-style photo instead? Open the{" "}
            <Link href="/tools/resize-photo/" className="text-ink underline underline-offset-4">
              photo and signature resizer
            </Link>
            , or{" "}
            <Link href="/exams/" className="text-ink underline underline-offset-4">
              pick your exam
            </Link>
            .
          </p>
        </>
      }
    >
      <PhotoTool kind="signature" hideKindSwitch />
    </ToolShell>
  );
}