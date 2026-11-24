import { TextPage, TextSection } from "@/components/TextPage";
import { CONTACT_EMAIL } from "@/lib/contact";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact ExamPhoto",
  description:
    "Email ExamPhoto to report a mistake, say that an exam rule has changed, or ask a question about the tools.",
  path: "/contact/",
});

export default function ContactPage() {
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("ExamPhoto feedback")}`;

  return (
    <TextPage
      title="Contact"
      intro="Write to us about a mistake, a changed exam rule, or a problem with a tool."
      crumbs={[{ label: "Contact" }]}
    >
      <TextSection id="email" heading="Email">
        <p>
          <a href={href} className="btn">
            Email us
          </a>
        </p>
        <p className="text-muted">
          Or write to <span className="break-all text-ink">{CONTACT_EMAIL}</span>
        </p>
      </TextSection>

      <TextSection id="help" heading="What to include">
        <ul className="list-disc space-y-2 pl-5">
          <li>The page you were on, and what you expected to happen.</li>
          <li>Your phone or computer model, and the browser you used.</li>
          <li>
            If an exam rule is wrong, a link to the official notification that shows the correct rule.
          </li>
        </ul>
        <p>
          <strong>Please do not send your photo, signature or any ID document by email.</strong> We do not need
          them to fix a problem.
        </p>
      </TextSection>

      <TextSection id="not" heading="What we cannot help with">
        <p>
          We are not connected to any exam body, so we cannot help with your application, admit card, fees or
          result. For those, use the official website of your exam.
        </p>
      </TextSection>
    </TextPage>
  );
}