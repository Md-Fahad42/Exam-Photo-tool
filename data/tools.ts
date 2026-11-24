export type Tool = {
  slug: string;
  name: string;
  blurb: string;
  /** true only when /tools/[slug]/ really exists and is ready to be indexed. */
  live: boolean;
};

export const TOOLS: readonly Tool[] = [
  { slug: "resize-photo", name: "Photo and signature resizer", blurb: "Resize, crop and compress a photo or signature to fit the form.", live: true },
  { slug: "resize-signature", name: "Signature resizer", blurb: "Crop and resize a signature scan for the upload box.", live: true },
  { slug: "compress-image", name: "Image compressor", blurb: "Make a JPG smaller to fit a KB limit.", live: false },
  { slug: "image-to-pdf", name: "Image to PDF", blurb: "Turn photos of documents into one PDF.", live: false },
  { slug: "compress-pdf", name: "PDF compressor", blurb: "Make a PDF smaller to fit an upload limit.", live: false },
  { slug: "merge-pdf", name: "Merge PDFs", blurb: "Combine several PDFs into one file.", live: false },
];