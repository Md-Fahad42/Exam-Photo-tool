import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { UserFacingError, canvasToBlob } from "@/lib/image-utils";
import { formatSize } from "@/lib/image-tools";

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "CancelledError";
  }
}

/** Copy only: files this big can be slow on an older phone. Not an exam rule. */
export const LARGE_PDF_BYTES = 20 * 1024 * 1024;
/** Files over this are refused, so the phone does not run out of memory. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

const WORKER_SRC = "/pdf.worker.min.mjs"; // copied into /public by scripts/copy-pdf-worker.mjs

export function pdfSizeWarning(bytes: number): string | null {
  return bytes >= LARGE_PDF_BYTES
    ? `This file is large (${formatSize(bytes)}). On an older phone it may be slow or run out of memory. Files over ${formatSize(MAX_PDF_BYTES)} are not accepted.`
    : null;
}

/* ---------- Lazy loaders: heavy libraries are imported only when called ---------- */

export async function loadPdfLib() {
  const mod = await import("pdf-lib").catch(() => null);
  if (!mod) {
    throw new UserFacingError("Could not load the PDF engine. Check your internet connection and try again.");
  }
  return mod;
}
export type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

export async function loadPdfJs() {
  const mod = await import("pdfjs-dist").catch(() => null);
  if (!mod) {
    throw new UserFacingError("Could not load the PDF reader. Check your internet connection and try again.");
  }
  if (!mod.GlobalWorkerOptions.workerSrc) mod.GlobalWorkerOptions.workerSrc = WORKER_SRC;
  return mod;
}
export type PdfJs = Awaited<ReturnType<typeof loadPdfJs>>;

/** pdf.js can take over (detach) the bytes it is given, so it always gets a copy. */
export async function openWithPdfJs(pdfjs: PdfJs, buf: ArrayBuffer): Promise<PDFDocumentProxy> {
  return await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
}

/* ---------- Reading and errors ---------- */

export async function readPdfFile(file: File): Promise<ArrayBuffer> {
  const looksPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  if (!looksPdf) throw new UserFacingError("This is not a PDF file. Please choose a file that ends in .pdf.");
  if (file.size === 0) throw new UserFacingError("This file is empty. Please choose another PDF.");
  if (file.size > MAX_PDF_BYTES) {
    throw new UserFacingError(
      `This file is too big (${formatSize(file.size)}). Files over ${formatSize(MAX_PDF_BYTES)} are not accepted because a phone could run out of memory.`
    );
  }
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch {
    throw new UserFacingError("Could not read this file. If it is large, close other apps and try again.");
  }
  const head = new TextDecoder("latin1").decode(new Uint8Array(buf, 0, Math.min(1024, buf.byteLength)));
  if (!head.includes("%PDF-")) {
    throw new UserFacingError("This does not look like a valid PDF. It may be damaged or have the wrong file type.");
  }
  return buf;
}

/** Turns any error into a plain-language sentence. Never includes technical text. */
export function describePdfError(e: unknown): string {
  if (e instanceof UserFacingError) return e.message;
  const name = e instanceof Error ? e.name : "";
  const msg = e instanceof Error ? e.message : "";
  if (name === "PasswordException" || /encrypt|password/i.test(msg)) {
    return "This PDF is password-protected. Remove the password in the app that made it, then try again. We cannot open locked PDFs.";
  }
  if (name === "InvalidPDFException" || /invalid pdf|failed to parse|no pdf header|bad xref|corrupt/i.test(msg)) {
    return "This PDF looks damaged and cannot be opened. Try opening it in another app and saving a new copy.";
  }
  if (/worker/i.test(msg)) {
    return "The PDF reader file could not be loaded. Reload the page and try again.";
  }
  return "Something went wrong with this PDF. Try a smaller file, or another browser.";
}

/* ---------- Page ranges ---------- */

export type Range = { from: number; to: number };
export type RangeResult = { ok: true; ranges: Range[] } | { ok: false; error: string };

/** "1-3, 5, 7-9" with total pages. Returns ranges in the order typed. */
export function parseRanges(text: string, total: number): RangeResult {
  const cleaned = text.replace(/[–—]/g, "-").replace(/\s*-\s*/g, "-").trim();
  const tokens = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (tokens.length === 0) {
    return { ok: false, error: "Type the pages you want, for example 1-3, 5, 7-9." };
  }
  const ranges: Range[] = [];
  for (const t of tokens) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(t);
    if (!m) {
      return { ok: false, error: `“${t}” is not a page number or range. Use numbers like 5 or 1-3, separated by commas.` };
    }
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (from < 1 || from > total) {
      return { ok: false, error: `Page ${from} is not in this PDF. It has ${total} ${total === 1 ? "page" : "pages"}.` };
    }
    if (to < 1 || to > total) {
      return { ok: false, error: `Page ${to} is not in this PDF. It has ${total} ${total === 1 ? "page" : "pages"}.` };
    }
    if (from > to) {
      return { ok: false, error: `“${t}” goes backwards. Write it as ${to}-${from}.` };
    }
    ranges.push({ from, to });
  }
  return { ok: true, ranges };
}

export function seq(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** All pages in the ranges, each once, in ascending order. */
export function rangesToPages(ranges: Range[]): number[] {
  const set = new Set<number>();
  for (const r of ranges) for (let p = r.from; p <= r.to; p++) set.add(p);
  return Array.from(set).sort((a, b) => a - b);
}

/* ---------- Rendering (pdf.js) ---------- */

const MAX_CANVAS_SIDE = 4096;
const MAX_CANVAS_PIXELS = 16_000_000;

/** Draws one page onto `canvas` (reused between pages to keep memory low). Returns the page size in PDF points. */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNo: number,
  scale: number,
  canvas: HTMLCanvasElement
): Promise<{ widthPt: number; heightPt: number }> {
  const page = await doc.getPage(pageNo);
  try {
    const base = page.getViewport({ scale: 1 });
    const s = Math.min(
      scale,
      MAX_CANVAS_SIDE / Math.max(base.width, base.height),
      Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height))
    );
    const viewport = page.getViewport({ scale: s });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new UserFacingError("Your browser could not prepare the page. Please update your browser or try Chrome.");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // pdf.js versions differ on which of these parameters render() expects, so both are passed.
    const params = { canvasContext: ctx, canvas, viewport } as unknown as Parameters<PDFPageProxy["render"]>[0];
    await page.render(params).promise;
    return { widthPt: base.width, heightPt: base.height };
  } finally {
    page.cleanup();
  }
}

/** Renders one page and encodes it as JPEG bytes. */
export async function renderJpeg(
  doc: PDFDocumentProxy,
  pageNo: number,
  dpi: number,
  quality: number,
  canvas: HTMLCanvasElement
): Promise<{ bytes: Uint8Array; widthPt: number; heightPt: number }> {
  const dims = await renderPage(doc, pageNo, dpi / 72, canvas);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ...dims };
}

/**
 * Frees a pdf.js document. Different versions put cleanup in different places,
 * so this tries the ones that exist and never throws.
 */
export async function releasePdf(doc: PDFDocumentProxy | null): Promise<void> {
  if (!doc) return;
  const d = doc as unknown as {
    cleanup?: () => Promise<void> | void;
    destroy?: () => Promise<void> | void;
    loadingTask?: { destroy?: () => Promise<void> | void };
  };
  try {
    if (typeof d.loadingTask?.destroy === "function") await d.loadingTask.destroy();
    else if (typeof d.destroy === "function") await d.destroy();
    else if (typeof d.cleanup === "function") await d.cleanup();
  } catch {
    /* freeing memory must never break the tool */
  }
}