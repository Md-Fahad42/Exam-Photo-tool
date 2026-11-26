"use client";

import { useId, useRef, useState } from "react";
import { FilePicker, secondaryBtn } from "@/components/FilePicker";
import { JobProgress } from "@/components/JobProgress";
import { baseName, formatSize } from "@/lib/image-tools";
import {
  CancelledError,
  describePdfError,
  loadPdfLib,
  parseRanges,
  pdfSizeWarning,
  rangesToPages,
  readPdfFile,
  seq,
} from "@/lib/pdf-utils";
import { makeZip } from "@/lib/zip";
import { useUrlBag } from "@/lib/use-url-bag";

type Mode = "ranges" | "extract" | "each";
type Status = "idle" | "loading" | "working" | "done" | "error";
type Part = { id: number; name: string; url: string; bytes: number; label: string };

const MAX_EACH = 300;

export function SplitPdfTool() {
  const uid = useId();
  const cancelRef = useRef(false);
  const urls = useUrlBag();

  const [src, setSrc] = useState<{ file: File; pages: number } | null>(null);
  const [mode, setMode] = useState<Mode>("ranges");
  const [rangeText, setRangeText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [zip, setZip] = useState<{ url: string; bytes: number } | null>(null);

  const busy = status === "working" || status === "loading";
  const warn = src ? pdfSizeWarning(src.file.size) : null;

  function resetOutput() {
    urls.clear();
    setParts([]);
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
    try {
      const lib = await loadPdfLib();
      const buf = await readPdfFile(file);
      const doc = await lib.PDFDocument.load(buf);
      setSrc({ file, pages: doc.getPageCount() });
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(`${file.name}: ${describePdfError(e)}`);
    }
  }

  async function split() {
    if (!src) return;
    resetOutput();

    // Decide the groups of pages before doing any work.
    let groups: number[][];
    let names: string[];
    let labels: string[];
    const base = baseName(src.file.name);

    if (mode === "each") {
      if (src.pages > MAX_EACH) {
        setError(
          `This PDF has ${src.pages} pages. “Every page as a separate file” works up to ${MAX_EACH} pages. Use page ranges instead.`
        );
        return;
      }
      groups = seq(1, src.pages).map((p) => [p]);
      names = groups.map((g) => `${base}-page-${g[0]}.pdf`);
      labels = groups.map((g) => `Page ${g[0]}`);
    } else {
      const parsed = parseRanges(rangeText, src.pages);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      if (mode === "extract") {
        const pages = rangesToPages(parsed.ranges);
        groups = [pages];
        names = [`${base}-selected-pages.pdf`];
        labels = [`${pages.length} selected ${pages.length === 1 ? "page" : "pages"}`];
      } else {
        groups = parsed.ranges.map((r) => seq(r.from, r.to));
        names = parsed.ranges.map((r, i) =>
          r.from === r.to ? `${base}-part-${i + 1}-page-${r.from}.pdf` : `${base}-part-${i + 1}-pages-${r.from}-${r.to}.pdf`
        );
        labels = parsed.ranges.map((r) => (r.from === r.to ? `Page ${r.from}` : `Pages ${r.from} to ${r.to}`));
      }
    }

    cancelRef.current = false;
    setStatus("working");
    setProgress(0.02);
    try {
      const lib = await loadPdfLib();
      const buf = await readPdfFile(src.file);
      const srcDoc = await lib.PDFDocument.load(buf);
      const made: Part[] = [];
      const blobs: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < groups.length; i++) {
        if (cancelRef.current) throw new CancelledError();
        await new Promise((r) => setTimeout(r, 0)); // let the browser paint progress
        const out = await lib.PDFDocument.create();
        const copied = await out.copyPages(srcDoc, groups[i].map((p) => p - 1));
        copied.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
        made.push({ id: i + 1, name: names[i], url: urls.add(blob), bytes: blob.size, label: labels[i] });
        blobs.push({ name: names[i], blob });
        setProgress(0.02 + 0.88 * ((i + 1) / groups.length));
      }

      if (blobs.length > 1) {
        if (cancelRef.current) throw new CancelledError();
        const zipBlob = await makeZip(blobs);
        setZip({ url: urls.add(zipBlob), bytes: zipBlob.size });
      }
      setParts(made);
      setProgress(1);
      setStatus("done");
    } catch (e) {
      if (e instanceof CancelledError) {
        urls.clear();
        setParts([]);
        setZip(null);
        setStatus("idle");
        setNotice("Cancelled. Nothing was kept.");
      } else {
        setStatus("error");
        setError(describePdfError(e));
      }
    }
  }

  const modeName = `${uid}-mode`;
  const rangeId = `${uid}-range`;

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
      </div>

      {src ? (
        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">How to split</legend>
            {(
              [
                ["ranges", "Split into files by page range", "Each range you type becomes its own PDF. For example 1-3, 5, 7-9 makes three files."],
                ["extract", "Extract selected pages into one file", "All the pages you type are put together in one new PDF, in page order."],
                ["each", "Every page as a separate file", `One PDF per page. Works up to ${MAX_EACH} pages.`],
              ] as const
            ).map(([value, title, text]) => (
              <label key={value} className="flex min-h-11 items-start gap-3">
                <input
                  type="radio"
                  name={modeName}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    resetOutput();
                  }}
                  className="mt-1 h-6 w-6 shrink-0 accent-accent"
                />
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {mode !== "each" ? (
            <div className="max-w-md">
              <label htmlFor={rangeId} className="block font-semibold">
                Pages
              </label>
              <p id={`${rangeId}-hint`} className="text-sm text-muted">
                Example: 1-3, 5, 7-9. This PDF has {src.pages} {src.pages === 1 ? "page" : "pages"}.
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
          ) : null}

          {status === "working" ? (
            <JobProgress
              value={progress}
              label="Splitting your PDF"
              note="Making your files. This can take a few seconds."
              onCancel={() => {
                cancelRef.current = true;
              }}
            />
          ) : (
            <button
              type="button"
              className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={busy}
              onClick={() => void split()}
            >
              Split PDF
            </button>
          )}
        </div>
      ) : null}

      {parts.length > 0 ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Your {parts.length === 1 ? "file" : `${parts.length} files`}
          </h2>
          {zip ? (
            <>
              <a href={zip.url} download={`${baseName(src?.file.name ?? "split")}-split.zip`} className="btn w-full sm:w-auto">
                Download all as ZIP ({formatSize(zip.bytes)})
              </a>
              <p className="text-sm text-muted">
                Or download the files one by one below. Some phones need a file manager app to open a ZIP.
              </p>
            </>
          ) : null}
          <ul className="border-t border-line">
            {parts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
                <span className="min-w-0 basis-48">
                  <span className="block wrap-break-words font-semibold">{p.name}</span>
                  <span className="block text-sm text-muted">
                    {p.label} · {formatSize(p.bytes)}
                  </span>
                </span>
                <a href={p.url} download={p.name} className={secondaryBtn}>
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