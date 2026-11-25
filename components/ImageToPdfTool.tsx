"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FilePicker, secondaryBtn } from "@/components/FilePicker";
import {
  UserFacingError,
  canvasToBlob,
  decodeImage,
  loadImageFromFile,
  renderToCanvas,
} from "@/lib/image-utils";
import { formatSize, largeFileWarning } from "@/lib/image-tools";

type Item = { id: number; url: string; name: string; bytes: number; width: number; height: number };
type PageMode = "a4" | "fit";
type QualityKey = "small" | "balanced" | "best";
type Status = "idle" | "loading" | "working" | "done" | "error";
type Result = { blob: Blob; url: string; pages: number };

const MAX_PAGES = 30;
const TOTAL_WARN_BYTES = 50 * 1024 * 1024;

const QUALITY: Record<QualityKey, { label: string; maxSide: number; q: number }> = {
  small: { label: "Smaller file", maxSide: 1600, q: 0.7 },
  balanced: { label: "Balanced", maxSide: 2000, q: 0.82 },
  best: { label: "Best quality", maxSide: 2800, q: 0.92 },
};

// A4 in PDF points (1 point = 1/72 inch).
const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 18;

function layoutFor(mode: PageMode, w: number, h: number) {
  if (mode === "a4") {
    const landscape = w > h;
    const pageW = landscape ? A4_H : A4_W;
    const pageH = landscape ? A4_W : A4_H;
    const s = Math.min((pageW - 2 * MARGIN) / w, (pageH - 2 * MARGIN) / h);
    const dw = w * s;
    const dh = h * s;
    return { pageW, pageH, x: (pageW - dw) / 2, y: (pageH - dh) / 2, dw, dh };
  }
  const s = A4_H / Math.max(w, h);
  const dw = w * s;
  const dh = h * s;
  return { pageW: dw, pageH: dh, x: 0, y: 0, dw, dh };
}

export function ImageToPdfTool() {
  const uid = useId();
  const nextId = useRef(1);
  const itemsRef = useRef<Item[]>([]);

  const [items, setItems] = useState<Item[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>("a4");
  const [quality, setQuality] = useState<QualityKey>("balanced");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [announce, setAnnounce] = useState("");

  // Warm up pdf-lib in the background as soon as this page opens. It is a separate
  // chunk, so other pages never download it.
  useEffect(() => {
    void import("pdf-lib").catch(() => {
      /* if this fails, makePdf() shows a clear message */
    });
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);
  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  const busy = status === "working" || status === "loading";
  const totalBytes = items.reduce((sum, i) => sum + i.bytes, 0);

  function touch() {
    setResult(null);
    setError(null);
    setStatus((s) => (s === "working" || s === "loading" ? s : "idle"));
  }

  async function addFiles(files: File[]) {
    setStatus("loading");
    setError(null);
    setResult(null);
    const room = Math.max(0, MAX_PAGES - items.length);
    const take = files.slice(0, room);
    const notes: string[] = [];
    if (files.length > take.length) {
      notes.push(`Only ${MAX_PAGES} pictures fit in one PDF. ${files.length - take.length} were not added.`);
    }
    const added: Item[] = [];
    for (const file of take) {
      try {
        const loaded = await loadImageFromFile(file);
        // Keep only the preview URL and the size. The decoded picture is dropped to save memory.
        added.push({
          id: nextId.current++,
          url: loaded.url,
          name: loaded.name,
          bytes: loaded.bytes,
          width: loaded.width,
          height: loaded.height,
        });
      } catch (e) {
        notes.push(`${file.name}: ${e instanceof UserFacingError ? e.message : "could not be opened."}`);
      }
    }
    setItems((prev) => [...prev, ...added]);
    setProblems(notes);
    setStatus("idle");
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setAnnounce(`${items[index].name} moved to page ${target + 1} of ${items.length}.`);
    touch();
  }

  function remove(index: number) {
    const gone = items[index];
    URL.revokeObjectURL(gone.url);
    setItems(items.filter((_, i) => i !== index));
    setAnnounce(`${gone.name} removed.`);
    touch();
  }

  async function makePdf() {
    if (items.length === 0) return;
    setStatus("working");
    setProgress(0.02);
    setError(null);
    setResult(null);
    try {
      const lib = await import("pdf-lib").catch(() => null);
      if (!lib) {
        throw new UserFacingError("Could not load the PDF maker. Check your internet connection and try again.");
      }
      const doc = await lib.PDFDocument.create();
      const preset = QUALITY[quality];

      for (let i = 0; i < items.length; i++) {
        await new Promise((r) => setTimeout(r, 30)); // let the browser paint progress
        const item = items[i];
        const img = await decodeImage(item.url);

        const longest = Math.max(item.width, item.height);
        const scale = Math.min(1, preset.maxSide / longest);
        const w = Math.max(1, Math.round(item.width * scale));
        const h = Math.max(1, Math.round(item.height * scale));

        const canvas = document.createElement("canvas");
        renderToCanvas(canvas, img, { x: 0, y: 0, w: item.width, h: item.height }, w, h, null, 0, true);
        const jpg = await canvasToBlob(canvas, "image/jpeg", preset.q);
        canvas.width = 0;
        canvas.height = 0;

        const embedded = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const L = layoutFor(pageMode, item.width, item.height);
        const page = doc.addPage([L.pageW, L.pageH]);
        page.drawImage(embedded, { x: L.x, y: L.y, width: L.dw, height: L.dh });

        setProgress(0.02 + 0.93 * ((i + 1) / items.length));
      }

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      setResult({ blob, url: URL.createObjectURL(blob), pages: items.length });
      setProgress(1);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof UserFacingError
          ? e.message
          : "Something went wrong while making the PDF. Try fewer or smaller pictures, or choose “Smaller file”."
      );
    }
  }

  const radioName = `${uid}-page`;
  const qualityId = `${uid}-quality`;

  return (
    <div className="space-y-6">
      <FilePicker
        multiple
        buttonLabel={items.length > 0 ? "Add more pictures" : "Choose pictures"}
        disabled={busy || items.length >= MAX_PAGES}
        onFiles={(f) => void addFiles(f)}
      />

      <div aria-live="polite" className="space-y-3">
        {status === "loading" ? <p role="status">Opening your pictures…</p> : null}
        {error ? (
          <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
            {error}
          </p>
        ) : null}
        {problems.length > 0 ? (
          <div role="alert" className="rounded-control border border-muted p-3">
            <p className="font-semibold">Some files were not added:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {totalBytes > TOTAL_WARN_BYTES ? (
          <p className="rounded-control border border-dashed border-muted p-3 text-sm">
            Your pictures add up to {formatSize(totalBytes)}. Making the PDF may be slow on an older phone.
            Choose “Smaller file”, or add fewer pictures.
          </p>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {items.length > 0 ? (
        <section aria-labelledby={`${uid}-pages`}>
          <h2 id={`${uid}-pages`} className="text-lg font-semibold">
            Pages ({items.length} of {MAX_PAGES})
          </h2>
          <p className="mt-1 text-sm text-muted">Page 1 comes first in the PDF. Use the buttons to change the order.</p>
          <ol className="mt-3 border-t border-line">
            {items.map((item, index) => {
              const warn = largeFileWarning(item.bytes);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-control border border-line object-cover"
                  />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="break-words font-semibold">
                      Page {index + 1}: {item.name}
                    </p>
                    <p className="text-sm text-muted">
                      {formatSize(item.bytes)} · {item.width} × {item.height} px
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
        </section>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-lg font-semibold">Page size</legend>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="radio"
                name={radioName}
                checked={pageMode === "a4"}
                onChange={() => {
                  setPageMode("a4");
                  touch();
                }}
                className="mt-1 h-6 w-6 shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold">A4</span>
                <span className="block text-sm text-muted">
                  Each picture sits on an A4 page with a small border. Wide pictures get a sideways page.
                </span>
              </span>
            </label>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="radio"
                name={radioName}
                checked={pageMode === "fit"}
                onChange={() => {
                  setPageMode("fit");
                  touch();
                }}
                className="mt-1 h-6 w-6 shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold">Fit to picture</span>
                <span className="block text-sm text-muted">
                  Each page has the same shape as its picture, with no border.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="max-w-xs">
            <label htmlFor={qualityId} className="block font-semibold">
              File size
            </label>
            <select
              id={qualityId}
              className="field mt-1"
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value as QualityKey);
                touch();
              }}
            >
              {(Object.keys(QUALITY) as QualityKey[]).map((k) => (
                <option key={k} value={k}>
                  {QUALITY[k].label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted">
              Choose “Smaller file” if your form has a size limit. We cannot promise an exact size.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={busy}
              onClick={() => void makePdf()}
            >
              {status === "working" ? "Making your PDF…" : "Make PDF"}
            </button>
            {status === "working" ? (
              <div role="status" aria-live="polite">
                <progress value={progress} max={1} aria-label="Making your PDF" className="h-3 w-full accent-accent" />
                <p className="text-sm text-muted">Putting your pictures into the PDF. This can take a few seconds.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {result ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Your PDF
          </h2>
          <p>
            {result.pages} {result.pages === 1 ? "page" : "pages"}, {formatSize(result.blob.size)}.
          </p>
          <p className="text-sm text-muted">
            The PDF holds pictures, so the text inside them cannot be selected or searched. If it is bigger than
            your form allows, choose “Smaller file” or add fewer pictures, then make it again.
          </p>
          <a href={result.url} download="images.pdf" className="btn w-full sm:w-auto">
            Download images.pdf ({formatSize(result.blob.size)})
          </a>
        </section>
      ) : null}
    </div>
  );
}