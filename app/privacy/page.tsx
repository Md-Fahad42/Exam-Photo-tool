import Link from "next/link";
import { TextPage, TextSection } from "@/components/TextPage";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/contact";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How ExamPhoto handles your files and data: pictures are processed in your browser and never uploaded. Also covers analytics and Google AdSense cookies if they are enabled.",
  path: "/privacy/",
});

const linkClass = "text-ink underline underline-offset-4";

export default function PrivacyPage() {
  return (
    <TextPage
      title="Privacy Policy"
      intro="What happens to your pictures and your data when you use ExamPhoto."
      crumbs={[{ label: "Privacy" }]}
      updated={LEGAL_UPDATED}
    >
      <TextSection id="short" heading="The short version">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your pictures are processed in your browser. They are never uploaded to us.</li>
          <li>There are no accounts, and we do not ask for your name, phone number or ID numbers.</li>
          <li>
            At the time of writing, this site does not run analytics or advertising. If that changes, this page
            will be updated before it starts.
          </li>
        </ul>
      </TextSection>

      <TextSection id="files" heading="Your files">
        <p>
          When you choose or take a picture, it is opened and changed by code running inside your own browser.
          It is held in your device’s memory while you use the tool, and the finished file is saved to your
          device only when you press Download. We do not receive a copy.
        </p>
        <p>
          If you use the Take a photo button, your browser asks for permission to use the camera. That
          permission is handled by your browser and the photo is processed the same way as any other picture.
        </p>
        <p>
          You can check this yourself: open your browser’s developer tools, go to the Network tab, and watch
          while you use a tool. You should see no request that carries your picture.
        </p>
      </TextSection>

      <TextSection id="collect" heading="What we collect">
        <p>
          We do not have accounts, forms or comment boxes, so we do not collect personal information through
          the tools.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Email you send us.</strong> If you write to us, we receive your email address and your
            message. We use them only to reply and to improve the site.
          </li>
          <li>
            <strong>Server logs.</strong> Like any website, the company that hosts this site may keep standard
            technical logs, such as IP address, browser type and the time of a request. We do not control those
            logs.
          </li>
        </ul>
      </TextSection>

      <TextSection id="cookies" heading="Cookies">
        <p>
          The site itself does not set cookies at the moment. Cookies may be set in the future by analytics or
          advertising services, as described below.
        </p>
      </TextSection>

      <TextSection id="analytics" heading="Analytics">
        <p>
          We may add an analytics service in the future, for example to count visits to pages. If we do, we
          will name the service on this page, say what it collects, and update this page before it is turned
          on. Your pictures will never be passed to an analytics service.
        </p>
      </TextSection>

      <TextSection id="ads" heading="Advertising and Google AdSense">
        <p>
          We may show advertising through Google AdSense in the future. If we do, Google and its partners may
          use cookies and similar identifiers to show and measure ads. Where this is allowed, that can include
          ads based on your earlier visits to this and other websites.
        </p>
        <p>
          Where the law requires your consent for this, we will ask for it before ads that use such
          identifiers are shown. We will update this page before ads are turned on.
        </p>
        <p>
          You can learn how Google uses information from sites that use its services on{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Google’s Privacy and Terms page
          </a>
          , and you can manage ad personalisation in{" "}
          <a href="https://adssettings.google.com" rel="noopener noreferrer" className={linkClass}>
            Google’s Ads Settings
          </a>
          .
        </p>
        <p>
          We cannot control what an advertising provider collects about your visit. We will not pass your
          pictures to any advertising service.
        </p>
      </TextSection>

      <TextSection id="links" heading="Links to other websites">
        <p>
          Some pages may link to official exam websites or other sites. Those sites have their own privacy
          policies, and we are not responsible for them.
        </p>
      </TextSection>

      <TextSection id="children" heading="Children">
        <p>
          Many exam candidates are young. We do not knowingly collect personal information from anyone, and the
          tools work without giving us any. If you think a child has emailed us personal information, write to
          us and we will delete it.
        </p>
      </TextSection>

      <TextSection id="changes" heading="Changes to this policy">
        <p>
          We will update this page when something changes, especially before analytics or advertising is
          turned on. The date at the top shows when it was last changed.
        </p>
      </TextSection>

      <TextSection id="contact" heading="Questions">
        <p>
          Write to <span className="break-all">{CONTACT_EMAIL}</span> or use the{" "}
          <Link href="/contact/" className={linkClass}>
            Contact page
          </Link>
          .
        </p>
      </TextSection>
    </TextPage>
  );
}