import type { Faq } from "@/data/exams";
import { SITE } from "@/lib/site";
import { absoluteUrl } from "@/lib/seo";

export function softwareApplicationLd(opts: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    inLanguage: "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    publisher: { "@type": "Organization", name: SITE.name },
  };
}

/** Built from the same array that renders the visible FAQs, so the two always match. */
export function faqPageLd(faqs: readonly Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}