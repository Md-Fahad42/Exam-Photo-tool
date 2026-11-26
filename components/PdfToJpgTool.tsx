"use client";

import { useId, useRef, useState } from "react";
import { FilePicker, secondaryBtn } from "@/components/FilePicker";
import { JobProgress } from "@/components/JobProgress";
import { baseName, formatSize } from "@/lib/image-tools";
import { canvasToBlob } from "@/lib/image-utils";
import {
  CancelledError,
  describePdfError,
  loadPdfJs,
  openWithPdfJs,
  parseRanges,
  pdfSizeWarning,
  rangesToPages,
  readPdfFile,
  renderPage,
  releasePdf,
  seq,
} from "@/lib/pdf-utils";
import { makeZip } from "@/lib/zip";
import { useUrlBag } from "@/lib/use-url-bag";

type QualityKey = "small" | "balanced" | "sharp";
type Status = "idle" | "loading" | "working" | "done" | "error";
type Out = { page: number; name: string; url: string; bytes: number };

// Scale 1 = 72 dpi. These numbers are my own tuning, not an exam rule.
const QUALITY: Record<QualityKey, { label: string; text: string; scale: number; q: number }> = {
  small: { label: "Smaller files", text: "About 108 dpi. Good for reading on a screen.", scale: 1.5, q: 0.7 },
  balanced: { label: "Balanced", text: "About 144 dpi. A good starting point.", scale: 2, q: 0.85 },
  sharp: { label: "Sharp", text: "About 216 dpi. Bigger files, slower.", scale: 3, q: 0.92 },
};

/** At most this many pages per run, so a phone does not run out of memory. */
const MAX_PAGES = 60;

export function PdfToJpgTool() {
  const uid = useId();
  const cancelRef = useRef(false);
  const urls = useUrlBag();

  const [src, setSrc] = useState<{ file: File; pages: number } | null>(null);
  const [rangeText, setRangeText] = useState("");
  const [quality, setQuality] = useState<QualityKey>("balanced");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [outs, setOuts] = useState<Out[]>([]);
  const [zip, setZip] = useState<{ url: string; bytes: number } | null>(null);

  const busy = status === "working" || status === "loading";
  const warn = src ? pdfSizeWarning(src.file.size) : null;

  function resetOutput() {
    urls.clear();
    setOuts([]);
    setZip(null);
    setError(null);
    setNotice(null);
    setStatus((s) => (s === "working" || s === "loading" ? s : "idle"));
  }

  async function pick(files: File[]) {
    const file = files[0];
    if (!file) return;
    resetOutput();
    setStatus("loading");
    let doc: Awaited<ReturnType<typeof openWithPdfJs>> | null = null;
    try {
      const pdfjs = await loadPdfJs();
      const buf = await readPdfFile(file);
      doc = await openWithPdfJs(pdfjs, buf);
      setSrc({ file, pages: doc.numPages });
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(`${file.name}: ${describePdfError(e)}`);
    } finally {
       await releasePdf(doc);
    }
  }

  async function convert() {
    if (!src) return;
    resetOutput();

    let pages: number[];
    if (rangeText.trim() === "") {
      pages = seq(1, src.pages);
    } else {
      const parsed = parseRanges(rangeText, src.pages);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      pages = rangesToPages(parsed.ranges);
    }
    if (pages.length > MAX_PAGES) {
      setError(
        `You chose ${pages.length} pages. Choose up to ${MAX_PAGES} pages at a time, for example 1-${MAX_PAGES}, then do the next batch.`
      );
      return;
    }

    cancelRef.current = false;
    setStatus("working");
    setProgress(0.02);
    setNote("");
    const preset = QUALITY[quality];
    const base = baseName(src.file.name);
    const canvas = document.createElement("canvas");
    let doc: Awaited<ReturnType<typeof openWithPdfJs>> | null = null;
    try {
      const pdfjs = await loadPdfJs();
      const buf = await readPdfFile(src.file);
      doc = await openWithPdfJs(pdfjs, buf);

      const made: Out[] = [];
      const blobs: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < pages.length; i++) {
        if (cancelRef.current) throw new CancelledError();
        setNote(`Page ${pages[i]} (${i + 1} of ${pages.length})`);
        await renderPage(doc, pages[i], preset.scale, canvas);
        const blob = await canvasToBlob(canvas, "image/jpeg", preset.q);
        const name = `${base}-page-${pages[i]}.jpg`;
        made.push({ page: pages[i], name, url: urls.add(blob), bytes: blob.size });
        blobs.push({ name, blob });
        setProgress(0.02 + 0.88 * ((i + 1) / pages.length));
      }

      if (blobs.length > 1) {
        if (cancelRef.current) throw new CancelledError();
        setNote("Making the ZIP file");
        const zipBlob = await makeZip(blobs);
        setZip({ url: urls.add(zipBlob), bytes: zipBlob.size });
      }
      setOuts(made);
      setProgress(1);
      setStatus("done");
    } catch (e) {
      if (e instanceof CancelledError) {
        urls.clear();
        setOuts([]);
        setZip(null);
        setStatus("idle");
        setNotice("Cancelled. Nothing was kept.");
      } else {
        setStatus("error");
        setError(describePdfError(e));
      }
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      await releasePdf(doc);
    }
  }

  const rangeId = `${uid}-range`;
  const qualityId = `${uid}-quality`;

  return (
    <div className="space-y-6">
      <FilePicker
        accept="application/pdf,.pdf"
        noun="PDF"
        buttonLabel={src ? "Choose another PDF" : "Choose a PDF"}
        disabled={busy}
        onFiles={(f) => void pick(f)}
      />

      <div aria-live="polite" className="space-y-3">
        {status === "loading" ? <p role="status">Opening your PDF…</p> : null}
        {error ? (
          <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
            {error}
          </p>
        ) : null}
        {notice ? <p className="rounded-control border border-muted p-3">{notice}</p> : null}
        {src ? (
          <p className="wrap-break-words text-sm text-muted">
            Using: {src.file.name} · {formatSize(src.file.size)} · {src.pages} {src.pages === 1 ? "page" : "pages"}
          </p>
        ) : null}
        {warn ? <p className="rounded-control border border-dashed border-muted p-3 text-sm">{warn}</p> : null}
        {src && src.pages > MAX_PAGES ? (
          <p className="rounded-control border border-dashed border-muted p-3 text-sm">
            This PDF has many pages. You can turn up to {MAX_PAGES} pages into JPG at a time. Type a range such as
            1-{MAX_PAGES} below, then do the next batch.
          </p>
        ) : null}
      </div>

      {src ? (
        <div className="space-y-6">
          <div className="max-w-md">
            <label htmlFor={rangeId} className="block font-semibold">
              Pages (optional)
            </label>
            <p id={`${rangeId}-hint`} className="text-sm text-muted">
              Leave empty for all pages. Or type, for example, 1-3, 5.
            </p>
            <input
              id={rangeId}
              className="field mt-1"
              inputMode="text"
              autoComplete="off"
              value={rangeText}
              onChange={(e) => {
                setRangeText(e.target.value);
                resetOutput();
              }}
              aria-describedby={`${rangeId}-hint`}
            />
          </div>

          <div className="max-w-xs">
            <label htmlFor={qualityId} className="block font-semibold">
              Picture quality
            </label>
            <select
              id={qualityId}
              className="field mt-1"
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value as QualityKey);
                resetOutput();
              }}
            >
              {(Object.keys(QUALITY) as QualityKey[]).map((k) => (
                <option key={k} value={k}>
                  {QUALITY[k].label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted">{QUALITY[quality].text}</p>
          </div>

          {status === "working" ? (
            <JobProgress
              value={progress}
              label="Converting pages to JPG"
              note={note || "Converting your pages."}
              onCancel={() => {
                cancelRef.current = true;
              }}
            />
          ) : (
            <button
              type="button"
              className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={busy}
              onClick={() => void convert()}
            >
              Convert to JPG
            </button>
          )}
        </div>
      ) : null}

      {outs.length > 0 ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Your {outs.length === 1 ? "picture" : `${outs.length} pictures`}
          </h2>
          {outs.length > 5 ? (
            <p className="text-sm text-muted">
              There are {outs.length} files. Download them one by one below, or use the ZIP file.
            </p>
          ) : null}
          {zip ? (
            <>
              <a href={zip.url} download={`${baseName(src?.file.name ?? "pages")}-jpg.zip`} className="btn w-full sm:w-auto">
                Download all as ZIP ({formatSize(zip.bytes)})
              </a>
              <p className="text-sm text-muted">Some phones need a file manager app to open a ZIP.</p>
            </>
          ) : null}
          <ul className="border-t border-line">
            {outs.map((o) => (
              <li key={o.page} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
                <span className="min-w-0 basis-48">
                  <span className="block wrap-break-words font-semibold">{o.name}</span>
                  <span className="block text-sm text-muted">
                    Page {o.page} · {formatSize(o.bytes)}
                  </span>
                </span>
                <a href={o.url} download={o.name} className={secondaryBtn}>
                  Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}