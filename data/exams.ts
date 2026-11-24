// RULE: never type a number into a spec until you have checked it against the
// official notification. null = "TO VERIFY" (the UI shows a dashed badge).
// To verify an exam: fill photo/signature, set sourceUrl, lastVerified
// ("YYYY-MM-DD") and verified: true. That also makes the page indexable
// and adds it to the sitemap.

export type ImageFormat = "jpeg" | "png";
export type Background = "white" | "any";

export interface ImageSpec {
  minKB: number | null;
  maxKB: number | null;
  widthPx: number | null;
  heightPx: number | null;
  format: ImageFormat | null;
  background: Background | null;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Exam {
  slug: string;
  name: string;
  description: string;
  /** Post applied for. null = TO VERIFY. */
  post: string | null;
  /** Notification year. null = TO VERIFY. */
  year: number | null;
  photo: ImageSpec;
  signature: ImageSpec;
  /** Other documents (e.g. thumb impression). null = TO VERIFY. */
  extraDocs: string[] | null;
  /** Official notification URL. null until you add a real one. */
  sourceUrl: string | null;
  /** "YYYY-MM-DD" of your last check against the notification. */
  lastVerified: string | null;
  verified: boolean;
  /** true only when /exams/[slug]/ really exists. */
  live: boolean;
  commonErrors: string[];
  faqs: Faq[];
}

export function blankSpec(): ImageSpec {
  return {
    minKB: null,
    maxKB: null,
    widthPx: null,
    heightPx: null,
    format: null,
    background: null,
  };
}

// Generic text only. No numbers, so nothing here needs verification.
export const COMMON_ERRORS: string[] = [
  "The file is bigger or smaller (in KB) than the form allows. Check the limits in the official notification.",
  "The picture is sideways or upside down. Check the preview before you download.",
  "The face is cut off at the edge. Use zoom and move so the whole face is inside the frame.",
  "The signature is too faint. Sign with a dark pen on plain white paper and take the photo in good light.",
  "The file type is wrong. Some forms accept only certain types, so check the notification.",
];

export const COMMON_FAQS: Faq[] = [
  {
    question: "Is my picture uploaded anywhere?",
    answer:
      "No. The picture is processed inside your browser, on your own phone or computer. You can check this: open your browser's developer tools, go to the Network tab, and watch while you use the tool.",
  },
  {
    question: "Where do the size rules come from?",
    answer:
      "They must come from the official notification of your exam. Until a page says Verified, with a date and a link, treat the numbers as unconfirmed and type the values from your notification.",
  },
  {
    question: "My file is smaller than the minimum size. What happens?",
    answer:
      "For JPG files, the tool adds harmless filler data (a JPEG comment) so the file reaches the minimum size. The picture itself does not change. The result page tells you when this was done.",
  },
];

function pending(slug: string, name: string, description: string): Exam {
  return {
    slug,
    name,
    description,
    post: null,
    year: null,
    photo: blankSpec(),
    signature: blankSpec(),
    extraDocs: null,
    sourceUrl: null,
    lastVerified: null,
    verified: false,
    live: true,
    commonErrors: COMMON_ERRORS,
    faqs: COMMON_FAQS,
  };
}

export const EXAMS: readonly Exam[] = [
  // Your existing exams (same slugs, names, descriptions)
  pending("jee-main", "JEE Main", "Joint Entrance Examination"),
  pending("jee-advanced", "JEE Advanced", "JEE Advanced Examination"),
  pending("neet-ug", "NEET UG", "National Eligibility cum Entrance Test"),
  pending("cuet-ug", "CUET UG", "Common University Entrance Test"),
  pending("upsc-cse", "UPSC CSE", "Civil Services Examination"),
  // New in Phase 2 (descriptions are from my memory, please skim them)
  pending("ssc-cgl", "SSC CGL", "Staff Selection Commission, Combined Graduate Level"),
  pending("uppsc", "UPPSC (UPPCS)", "Uttar Pradesh Public Service Commission"),
  pending("upsssc-pet", "UPSSSC PET", "UPSSSC Preliminary Eligibility Test"),
  pending("up-police", "UP Police", "Uttar Pradesh Police recruitment"),
  pending("ibps-po", "IBPS PO", "IBPS Probationary Officer"),
  pending("rrb-ntpc", "RRB NTPC", "Railway Recruitment Boards, Non-Technical Popular Categories"),
];

export function getExam(slug: string): Exam | undefined {
  return EXAMS.find((e) => e.slug === slug);
}