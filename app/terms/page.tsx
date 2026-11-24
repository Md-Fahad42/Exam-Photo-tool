import Link from "next/link";
import { TextPage, TextSection } from "@/components/TextPage";
import { LEGAL_UPDATED } from "@/lib/contact";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of Use",
  description:
    "The rules for using ExamPhoto: it is an independent tool, you must check your exam notification, and we cannot guarantee that a portal will accept your file.",
  path: "/terms/",
});

export default function TermsPage() {
  return (
    <TextPage
      title="Terms of Use"
      intro="Please read these terms before you use ExamPhoto. By using the site you agree to them."
      crumbs={[{ label: "Terms" }]}
      updated={LEGAL_UPDATED}
    >
      <TextSection id="what" heading="What the site is">
        <p>
          ExamPhoto offers free tools that run in your browser to resize and compress pictures for exam forms.
          It is an independent project and is not connected to any exam body, government department or
          recruitment agency.
        </p>
      </TextSection>

      <TextSection id="check" heading="Check the official notification">
        <p>
          The size rules shown on this site may be incomplete, out of date or marked Unverified. The only
          source that counts is the official notification for your exam. You are responsible for checking it
          before you submit your form.
        </p>
      </TextSection>

      <TextSection id="no-guarantee" heading="No guarantee">
        <p>
          A Pass mark on this site means the file matches the numbers you typed. It does not mean an exam
          portal will accept the file. Portals can have extra rules that we do not know about. We provide the
          tools as they are, without any promise that they are free of errors, always available, or suitable
          for your purpose.
        </p>
      </TextSection>

      <TextSection id="files" heading="Your files">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your files stay on your device and are not uploaded to us.</li>
          <li>You keep all rights to your pictures.</li>
          <li>Only use pictures you have the right to use. Keep your original files safe.</li>
        </ul>
        <p>
          More detail is in the{" "}
          <Link href="/privacy/" className="text-ink underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </TextSection>

      <TextSection id="use" heading="Using the site properly">
        <p>
          Please do not try to break, overload or misuse the site, and do not use it for anything unlawful.
        </p>
      </TextSection>

      <TextSection id="liability" heading="Limit of responsibility">
        <p>
          As far as the law allows, we are not responsible for losses that come from using the site, such as a
          rejected form, a missed deadline or a lost file. Your rights under any law that cannot be limited are
          not affected.
        </p>
      </TextSection>

      <TextSection id="content" heading="Our content">
        <p>
          The text, design and code of this site belong to the site owner. You may use the tools for your own
          exam forms. Please do not copy the site’s text or code and present it as your own.
        </p>
      </TextSection>

      <TextSection id="links" heading="Links, advertising and partners">
        <p>
          The site may link to other websites. We do not control them. If advertising or partner links are
          added in the future, we will say so on the Privacy page.
        </p>
      </TextSection>

      <TextSection id="changes" heading="Changes">
        <p>
          We may change the site or these terms. The date at the top shows when the terms were last updated.
          If you keep using the site after a change, you accept the new terms.
        </p>
      </TextSection>

      <TextSection id="contact" heading="Contact">
        <p>
          Questions about these terms? Use the{" "}
          <Link href="/contact/" className="text-ink underline underline-offset-4">
            Contact page
          </Link>
          .
        </p>
      </TextSection>
    </TextPage>
  );
}