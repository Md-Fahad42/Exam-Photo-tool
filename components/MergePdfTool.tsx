"use client";

import { useRef, useState } from "react";
import { FilePicker, secondaryBtn } from "@/components/FilePicker";
import { JobProgress } from "@/components/JobProgress";
import { formatSize } from "@/lib/image-tools";
import { UserFacingError } from "@/lib/image-utils";
import {
  CancelledError,
  describePdfError,
  loadPdfLib,
  pdfSizeWarning,
  readPdfFile,
} from "@/lib/pdf-utils";
import { useUrlBag } from "@/lib/use-url-bag";

type Item = { id: number; file: File; name: string; bytes: number; pages: number };
type Status = "idle" | "loading" | "working" | "done" | "error";
type Result = { url: string; bytes: number; pages: number };

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
const TOTAL_WARN_BYTES = 50 * 1024 * 1024;

export function MergePdfTool() {
  const nextId = useRef(1);
  const cancelRef = useRef(false);
  const urls = useUrlBag();

  const [items, setItems] = useState<Item[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [announce, setAnnounce] = useState("");

  const busy = status === "working" || status === "loading";
  const totalBytes = items.reduce((s, i) => s + i.bytes, 0);
  const totalPages = items.reduce((s, i) => s + i.pages, 0);

  function resetOutput() {
    urls.clear();
    setResult(null);
    setError(null);
    setNotice(null);
    setStatus((s) => (s === "working" || s === "loading" ? s : "idle"));
  }

  async function addFiles(files: File[]) {
    setStatus("loading");
    resetOutput();
    setStatus("loading");
    const notes: string[] = [];
    try {
      const lib = await loadPdfLib();
      const room = Math.max(0, MAX_FILES - items.length);
      const take = files.slice(0, room);
      if (files.length > take.length) {
        notes.push(`Only ${MAX_FILES} files can be merged at once. ${files.length - take.length} were not added.`);
      }
      let running = totalBytes;
      const added: Item[] = [];
      for (const file of take) {
        try {
          if (running + file.size > MAX_TOTAL_BYTES) {
            notes.push(`${file.name}: not added, the total would be over ${formatSize(MAX_TOTAL_BYTES)}.`);
            continue;
          }
          const buf = await readPdfFile(file);
          const doc = await lib.PDFDocument.load(buf);
          added.push({
            id: nextId.current++,
            file,
            name: file.name,
            bytes: file.size,
            pages: doc.getPageCount(),
          });
          running += file.size;
        } catch (e) {
          notes.push(`${file.name}: ${describePdfError(e)}`);
        }
      }
      setItems((prev) => [...prev, ...added]);
    } catch (e) {
      setError(describePdfError(e));
    }
    setProblems(notes);
    setStatus("idle");
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setAnnounce(`${items[index].name} moved to position ${target + 1} of ${items.length}.`);
    resetOutput();
  }

  function remove(index: number) {
    setAnnounce(`${items[index].name} removed.`);
    setItems(items.filter((_, i) => i !== index));
    resetOutput();
  }

  async function merge() {
    if (items.length < 2) return;
    cancelRef.current = false;
    resetOutput();
    setStatus("working");
    setProgress(0.02);
    try {
      const lib = await loadPdfLib();
      const out = await lib.PDFDocument.create();
      for (let i = 0; i < items.length; i++) {
        if (cancelRef.current) throw new CancelledError();
        await new Promise((r) => setTimeout(r, 20)); // let the browser paint progress
        const item = items[i];
        try {
          const buf = await readPdfFile(item.file);
          const src = await lib.PDFDocument.load(buf);
          const copied = await out.copyPages(src, src.getPageIndices());
          copied.forEach((p) => out.addPage(p));
        } catch (e) {
          throw new UserFacingError(`${item.name}: ${describePdfError(e)}`);
        }
        setProgress(0.02 + 0.9 * ((i + 1) / items.length));
      }
      if (cancelRef.current) throw new CancelledError();
      const bytes = await out.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      setResult({ url: urls.add(blob), bytes: blob.size, pages: out.getPageCount() });
      setProgress(1);
      setStatus("done");
    } catch (e) {
      if (e instanceof CancelledError) {
        urls.clear();
        setStatus("idle");
        setNotice("Cancelled. Nothing was kept.");
      } else {
        setStatus("error");
        setError(describePdfError(e));
      }
    }
  }

  return (
    <div className="space-y-6">
      <FilePicker
        multiple
        accept="application/pdf,.pdf"
        noun="PDF"
        buttonLabel={items.length > 0 ? "Add more PDFs" : "Choose PDFs"}
        disabled={busy || items.length >= MAX_FILES}
        onFiles={(f) => void addFiles(f)}
      />

      <div aria-live="polite" className="space-y-3">
        {status === "loading" ? <p role="status">Opening your PDFs…</p> : null}
        {error ? (
          <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
            {error}
          </p>
        ) : null}
        {notice ? <p className="rounded-control border border-muted p-3">{notice}</p> : null}
        {problems.length > 0 ? (
          <div role="alert" className="rounded-control border border-muted p-3">
            <p className="font-semibold">Some files were not added:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {totalBytes > TOTAL_WARN_BYTES ? (
          <p className="rounded-control border border-dashed border-muted p-3 text-sm">
            Your files add up to {formatSize(totalBytes)}. Merging may be slow, or fail, on an older phone. Files
            over {formatSize(MAX_TOTAL_BYTES)} in total are not accepted.
          </p>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {items.length > 0 ? (
        <section aria-labelledby="merge-list-title">
          <h2 id="merge-list-title" className="text-lg font-semibold">
            Files ({items.length} of {MAX_FILES})
          </h2>
          <p className="mt-1 text-sm text-muted">
            {totalPages} {totalPages === 1 ? "page" : "pages"} in total · {formatSize(totalBytes)}. File 1 comes
            first in the merged PDF.
          </p>
          <ol className="mt-3 border-t border-line">
            {items.map((item, index) => {
              const warn = pdfSizeWarning(item.bytes);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="wrap-break-words font-semibold">
                      {index + 1}. {item.name}
                    </p>
                    <p className="text-sm text-muted">
                      {item.pages} {item.pages === 1 ? "page" : "pages"} · {formatSize(item.bytes)}
                    </p>
                    {warn ? <p className="text-sm text-muted">{warn}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${secondaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Move ${item.name} up`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className={`${secondaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                      disabled={busy || index === items.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Move ${item.name} down`}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className={`${secondaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                      disabled={busy}
                      onClick={() => remove(index)}
                      aria-label={`Remove ${item.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 space-y-3">
            {items.length < 2 ? <p className="text-sm text-muted">Add at least 2 PDFs to merge.</p> : null}
            <p className="text-sm text-muted">
              Bookmarks and some form fields may not be kept in the merged file.
            </p>
            {status === "working" ? (
              <JobProgress
                value={progress}
                label="Merging your PDFs"
                note="Putting your PDFs together. This can take a few seconds."
                onCancel={() => {
                  cancelRef.current = true;
                }}
              />
            ) : (
              <button
                type="button"
                className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={busy || items.length < 2}
                onClick={() => void merge()}
              >
                Merge PDFs
              </button>
            )}
          </div>
        </section>
      ) : null}

      {result ? (
        <section aria-labelledby="merge-result-title" className="space-y-4 border-t border-line pt-6">
          <h2 id="merge-result-title" className="text-xl font-bold">
            Your merged PDF
          </h2>
          <p>
            {result.pages} {result.pages === 1 ? "page" : "pages"}, {formatSize(result.bytes)}.
          </p>
          <a href={result.url} download="merged.pdf" className="btn w-full sm:w-auto">
            Download merged.pdf ({formatSize(result.bytes)})
          </a>
          <p className="text-sm text-muted">
            If the file is bigger than your form allows, use the PDF compressor on it next.
          </p>
        </section>
      ) : null}
    </div>
  );
}