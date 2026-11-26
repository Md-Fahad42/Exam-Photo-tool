"use client";

import { useId, useRef, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { JobProgress } from "@/components/JobProgress";
import { baseName, formatSize } from "@/lib/image-tools";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  CancelledError,
  describePdfError,
  loadPdfJs,
  loadPdfLib,
  openWithPdfJs,
  pdfSizeWarning,
  readPdfFile,
  releasePdf,
  renderJpeg,
  type PdfLib,
} from "@/lib/pdf-utils";
import { useUrlBag } from "@/lib/use-url-bag";

type Mode = "light" | "strong";
type Unit = "KB" | "MB";
type Status = "idle" | "loading" | "working" | "done" | "error";
type Result = {
  url: string | null; // null = no file is offered
  mode: Mode;
  before: number;
  after: number;
  target: number | null;
  reached: boolean | null;
  smaller: boolean;
  skipped: boolean;
  detail: string;
  pages: number;
};

// Tried from best quality to smallest. These numbers are my own tuning, not from any spec.
const LADDER = [
  { dpi: 150, q: 0.75 },
  { dpi: 120, q: 0.65 },
  { dpi: 100, q: 0.6 },
  { dpi: 85, q: 0.5 },
  { dpi: 72, q: 0.45 },
  { dpi: 60, q: 0.4 },
  { dpi: 50, q: 0.35 },
  { dpi: 40, q: 0.3 },
] as const;

const MAX_ATTEMPTS = 4;

export function CompressPdfTool() {
  const uid = useId();
  const cancelRef = useRef(false);
  const urls = useUrlBag();

  const [src, setSrc] = useState<{ file: File; pages: number } | null>(null);
  const [mode, setMode] = useState<Mode>("strong");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState<Unit>("KB");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const busy = status === "working" || status === "loading";
  const warn = src ? pdfSizeWarning(src.file.size) : null;

  const tNum = Number(target);
  const targetBytes =
    target.trim() !== "" && Number.isFinite(tNum) && tNum > 0
      ? Math.floor(tNum * (unit === "MB" ? 1_000_000 : 1000))
      : null;

  function resetOutput() {
    urls.clear();
    setResult(null);
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

  async function buildAt(
    lib: PdfLib,
    doc: PDFDocumentProxy,
    canvas: HTMLCanvasElement,
    step: number
  ): Promise<Uint8Array> {
    const { dpi, q } = LADDER[step];
    const out = await lib.PDFDocument.create();
    for (let p = 1; p <= doc.numPages; p++) {
      if (cancelRef.current) throw new CancelledError();
      const r = await renderJpeg(doc, p, dpi, q, canvas);
      const img = await out.embedJpg(r.bytes);
      const page = out.addPage([r.widthPt, r.heightPt]);
      page.drawImage(img, { x: 0, y: 0, width: r.widthPt, height: r.heightPt });
      setProgress(0.15 + 0.83 * (p / doc.numPages));
    }
    return await out.save();
  }

  async function runLight(buf: ArrayBuffer, file: File) {
    const lib = await loadPdfLib();
    setNote("Saving the PDF again");
    setProgress(0.3);
    const doc = await lib.PDFDocument.load(buf);
    const bytes = await doc.save();
    const before = buf.byteLength;
    const smaller = bytes.length < before;
    const url = smaller ? urls.add(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })) : null;
    setResult({
      url,
      mode: "light",
      before,
      after: bytes.length,
      target: targetBytes,
      reached: targetBytes === null ? null : bytes.length <= targetBytes,
      smaller,
      skipped: false,
      detail: "Re-saved without changing the pages",
      pages: doc.getPageCount(),
    });
    void file;
  }

  async function runStrong(buf: ArrayBuffer) {
    if (targetBytes === null) return;
    const before = buf.byteLength;
    if (before <= targetBytes) {
      setResult({
        url: null,
        mode: "strong",
        before,
        after: before,
        target: targetBytes,
        reached: true,
        smaller: false,
        skipped: true,
        detail: "",
        pages: src?.pages ?? 0,
      });
      return;
    }

    const [lib, pdfjs] = await Promise.all([loadPdfLib(), loadPdfJs()]);
    const doc = await openWithPdfJs(pdfjs, buf);
    const canvas = document.createElement("canvas");
    try {
      const total = doc.numPages;

      // Step 1: estimate. Render a few sample pages at each setting and pick the first one that should fit.
      const samples = Array.from(new Set([1, Math.ceil(total / 2), total]));
      let start = LADDER.length - 1;
      for (let s = 0; s < LADDER.length; s++) {
        setNote("Testing quality settings");
        let sum = 0;
        for (const p of samples) {
          if (cancelRef.current) throw new CancelledError();
          sum += (await renderJpeg(doc, p, LADDER[s].dpi, LADDER[s].q, canvas)).bytes.length;
        }
        setProgress(0.02 + 0.13 * ((s + 1) / LADDER.length));
        const estimate = (sum / samples.length) * total * 1.03 + 2000;
        if (estimate <= targetBytes * 0.95) {
          start = s;
          break;
        }
      }

      // Step 2: build the whole PDF; if it is still too big, try a smaller setting.
      let best: { bytes: Uint8Array; step: number } | null = null;
      let step = start;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt === MAX_ATTEMPTS - 1) step = LADDER.length - 1;
        setNote(`Building the smaller PDF (try ${attempt + 1})`);
        const bytes = await buildAt(lib, doc, canvas, step);
        if (!best || bytes.length < best.bytes.length) best = { bytes, step };
        if (bytes.length <= targetBytes || step === LADDER.length - 1) break;
        step = Math.min(LADDER.length - 1, step + (bytes.length > targetBytes * 1.5 ? 3 : 1));
      }
      if (!best) throw new Error("no result");

      const smaller = best.bytes.length < before;
      const url = smaller ? urls.add(new Blob([new Uint8Array(best.bytes)], { type: "application/pdf" })) : null;
      const { dpi, q } = LADDER[best.step];
      setResult({
        url,
        mode: "strong",
        before,
        after: best.bytes.length,
        target: targetBytes,
        reached: best.bytes.length <= targetBytes,
        smaller,
        skipped: false,
        detail: `Pages rebuilt as pictures at about ${dpi} dpi, JPEG quality ${Math.round(q * 100)}%`,
        pages: total,
      });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      await releasePdf(doc);
    }
  }

  async function run() {
    if (!src) return;
    if (mode === "strong" && targetBytes === null) {
      setError("Enter the size you need, for example 200 KB or 1 MB, then press the button.");
      return;
    }
    cancelRef.current = false;
    resetOutput();
    setStatus("working");
    setProgress(0.02);
    setNote("");
    try {
      const buf = await readPdfFile(src.file);
      if (mode === "light") await runLight(buf, src.file);
      else await runStrong(buf);
      if (cancelRef.current) throw new CancelledError();
      setProgress(1);
      setStatus("done");
    } catch (e) {
      if (e instanceof CancelledError) {
        urls.clear();
        setResult(null);
        setStatus("idle");
        setNotice("Cancelled. Nothing was kept.");
      } else {
        setStatus("error");
        setError(describePdfError(e));
      }
    }
  }

  const modeName = `${uid}-mode`;
  const targetId = `${uid}-target`;
  const unitId = `${uid}-unit`;
  const filename = src ? `${baseName(src.file.name)}-compressed.pdf` : "compressed.pdf";
  const savedPct = result && result.smaller ? Math.round((1 - result.after / result.before) * 100) : 0;

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
        {src && mode === "strong" && src.pages > 50 ? (
          <p className="rounded-control border border-dashed border-muted p-3 text-sm">
            This PDF has {src.pages} pages. Strong compression draws every page, so it can take a few minutes on a
            phone. You can press Cancel at any time.
          </p>
        ) : null}
      </div>

      {src ? (
        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">How to compress</legend>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="radio"
                name={modeName}
                checked={mode === "strong"}
                onChange={() => {
                  setMode("strong");
                  resetOutput();
                }}
                className="mt-1 h-6 w-6 shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold">Strong: rebuild the pages as pictures</span>
                <span className="block text-sm text-muted">
                  Can make a PDF much smaller, and we search for the best quality that fits your target.
                </span>
              </span>
            </label>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="radio"
                name={modeName}
                checked={mode === "light"}
                onChange={() => {
                  setMode("light");
                  resetOutput();
                }}
                className="mt-1 h-6 w-6 shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold">Light: save the PDF again</span>
                <span className="block text-sm text-muted">
                  Keeps text selectable. The saving may be small, or zero. If there is no saving, we tell you.
                </span>
              </span>
            </label>
          </fieldset>

          {mode === "strong" ? (
            <div className="rounded-control border border-dashed border-muted p-3 text-sm">
              <p className="font-semibold">Before you run Strong</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Every page becomes a picture. Text can no longer be selected, searched or copied.</li>
                <li>Links, bookmarks and form fields are lost.</li>
                <li>Small print gets softer. Check the result before you upload it.</li>
                <li>Keep your original file. This does not change it.</li>
              </ul>
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="grid max-w-md grid-cols-[1fr_auto] gap-3">
              <div>
                <label htmlFor={targetId} className="block font-semibold">
                  {mode === "strong" ? "Target size" : "Target size (optional)"}
                </label>
                <input
                  id={targetId}
                  className="field mt-1"
                  inputMode="decimal"
                  autoComplete="off"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value.replace(/[^\d.]/g, ""));
                    resetOutput();
                  }}
                  aria-describedby={`${targetId}-hint`}
                />
              </div>
              <div>
                <label htmlFor={unitId} className="block font-semibold">
                  Unit
                </label>
                <select
                  id={unitId}
                  className="field mt-1"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value as Unit);
                    resetOutput();
                  }}
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
            <p id={`${targetId}-hint`} className="text-sm text-muted">
              Take the limit from your official notification or upload page. We count 1 KB as 1000 bytes and 1 MB as
              1,000,000 bytes, so the file also fits when a portal counts that way.
            </p>
          </div>

          {status === "working" ? (
            <JobProgress
              value={progress}
              label="Compressing your PDF"
              note={note || "Working on your PDF."}
              onCancel={() => {
                cancelRef.current = true;
              }}
            />
          ) : (
            <button
              type="button"
              className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={busy}
              onClick={() => void run()}
            >
              {mode === "strong" ? "Compress with Strong" : "Compress with Light"}
            </button>
          )}
        </div>
      ) : null}

      {result ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Result
          </h2>

          {result.skipped ? (
            <p className="rounded-control border border-muted p-3 font-semibold">
              Your PDF is already {formatSize(result.before)}, which is under your target of{" "}
              {formatSize(result.target ?? 0)}. No change is needed, so we did not make a new file.
            </p>
          ) : (
            <>
              <ul className="border-t border-line">
                <li className="border-b border-line py-3">
                  <span className="block font-semibold">Before: {formatSize(result.before)}</span>
                </li>
                <li className="border-b border-line py-3">
                  <span className="block font-semibold">After: {formatSize(result.after)}</span>
                  <span className="block text-sm text-muted">
                    {result.smaller ? `About ${savedPct}% smaller. ` : ""}
                    {result.detail}
                  </span>
                </li>
                {result.target !== null ? (
                  <li className="flex items-start gap-3 border-b border-line py-3">
                    <span aria-hidden="true" className="w-5 shrink-0 text-center font-bold">
                      {result.reached ? "✓" : "✗"}
                    </span>
                    <span>
                      <span className="block font-semibold">Target size: {result.reached ? "Reached" : "Not reached"}</span>
                      <span className="block text-sm text-muted">
                        {formatSize(result.after)} (target {formatSize(result.target)})
                      </span>
                    </span>
                  </li>
                ) : null}
              </ul>

              {!result.smaller ? (
                <p className="rounded-control border border-muted p-3 font-semibold">
                  {result.mode === "light"
                    ? "Saving the PDF again did not make it smaller, so there is no file to download. Try Strong, and read what it changes first."
                    : "The rebuilt PDF is not smaller than your original, so there is no file to download. Your original is the better file."}
                </p>
              ) : null}

              {result.mode === "strong" && result.reached === false && result.smaller ? (
                <p className="rounded-control border border-muted p-3">
                  We could not reach your target. This is the smallest we could make without the pages becoming
                  unreadable. You can check whether your form allows a larger size, split the PDF into parts if
                  it accepts several files, or remove pages you do not need.
                </p>
              ) : null}

              {result.mode === "strong" && result.smaller ? (
                <p className="text-sm text-muted">
                  Text in this file cannot be selected or searched. Open it and check that every page is readable
                  before you upload it.
                </p>
              ) : null}

              {result.url ? (
                <a href={result.url} download={filename} className="btn w-full sm:w-auto">
                  Download {filename} ({formatSize(result.after)})
                </a>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}