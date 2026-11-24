import Link from "next/link";
import { TextPage, TextSection } from "@/components/TextPage";
import { LEGAL_UPDATED } from "@/lib/contact";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About ExamPhoto",
  description:
    "ExamPhoto is an independent, free tool for resizing photos and signatures for Indian exam forms. Learn what it does, what it is not, and how your files are handled.",
  path: "/about/",
});

export default function AboutPage() {
  return (
    <TextPage
      title="About ExamPhoto"
      intro="A free tool that helps students get a photo and signature into the size an exam form asks for."
      crumbs={[{ label: "About" }]}
      updated={LEGAL_UPDATED}
    >
      <TextSection id="what" heading="What this site does">
        <p>
          Many exam forms ask for a photo and signature with an exact width, height and file size. ExamPhoto
          lets you choose a picture, enter the sizes from your notification, crop it, and download a file that
          fits.
        </p>
      </TextSection>

      <TextSection id="not" heading="What this site is not">
        <p>
          ExamPhoto is an independent project. It is not connected to any exam body, government department or
          recruitment agency, and it is not an official website. It does not submit forms for you.
        </p>
      </TextSection>

      <TextSection id="files" heading="How your files are handled">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your pictures are processed inside your own browser, on your phone or computer.</li>
          <li>They are never uploaded to our servers.</li>
          <li>There are no accounts and no sign-up.</li>
        </ul>
        <p>
          You can check this yourself: open your browser’s developer tools, go to the Network tab, and watch
          while you use a tool. Read the{" "}
          <Link href="/privacy/" className="text-ink underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          for the details.
        </p>
      </TextSection>

      <TextSection id="rules" heading="Where the size rules come from">
        <p>
          The size rules for each exam must come from its official notification. Until we have checked an exam
          against its notification, its page is marked <strong>Unverified</strong>, and the unconfirmed values
          show a <strong>TO VERIFY</strong> label. In that case you type the sizes from your own notification.
        </p>
        <p>
          When an exam is checked, its page shows the date and a link to the notification we used. Rules can
          change between years, so always confirm them before you submit your form.
        </p>
      </TextSection>

      <TextSection id="support" heading="How the site is supported">
        <p>
          The tools are free to use. In the future the site may show advertising or links to partners. If that
          happens, we will say so on the{" "}
          <Link href="/privacy/" className="text-ink underline underline-offset-4">
            Privacy page
          </Link>{" "}
          before it starts.
        </p>
      </TextSection>

      <TextSection id="contact" heading="Contact">
        <p>
          Found a mistake, or want to tell us a rule has changed? Use the{" "}
          <Link href="/contact/" className="text-ink underline underline-offset-4">
            Contact page
          </Link>
          .
        </p>
      </TextSection>
    </TextPage>
  );
}