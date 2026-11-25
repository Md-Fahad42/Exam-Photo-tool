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
  { slug: "compress-image", name: "Image compressor", blurb: "Make a picture smaller to fit a KB limit. JPG or WebP output.", live: true },
  { slug: "convert-image", name: "Image format converter", blurb: "Convert a picture between JPG, PNG and WebP.", live: true },
  { slug: "image-to-pdf", name: "Image to PDF", blurb: "Put several pictures into one PDF. Reorder and remove pages.", live: true },
  { slug: "compress-pdf", name: "PDF compressor", blurb: "Make a PDF smaller to fit an upload limit.", live: false },
  { slug: "merge-pdf", name: "Merge PDFs", blurb: "Combine several PDFs into one file.", live: false },
];