"use client";

import { useEffect, useId, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import {
  MAX_OUTPUT_DIMENSION,
  UserFacingError,
  encodeLossy,
  formatKB,
  loadImageFromFile,
  renderToCanvas,
  sizeLimits,
  type LoadedImage,
  type LossyType,
} from "@/lib/image-utils";
import { baseName, largeFileWarning } from "@/lib/image-tools";

type Format = "jpeg" | "webp";
type Status = "idle" | "loading" | "working" | "done" | "error";
type Result = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  quality: number;
  shrunk: boolean;
  limitBytes: number;
};

/** Size factors tried in order. The first one that fits wins, so quality stays as high as possible. */
const SHRINK_STEPS = [1, 0.85, 0.7, 0.55, 0.4, 0.3];

export function CompressTool() {
  const uid = useId();
  const [src, setSrc] = useState<LoadedImage | null>(null);
  const [srcType, setSrcType] = useState("");
  const [maxKB, setMaxKB] = useState("");
  const [format, setFormat] = useState<Format>("jpeg");
  const [allowShrink, setAllowShrink] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!src) return;
    return () => URL.revokeObjectURL(src.url);
  }, [src]);
  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  const maxNum = Number(maxKB);
  const maxBytes =
    maxKB.trim() !== "" && Number.isFinite(maxNum) && maxNum > 0 ? sizeLimits(null, maxNum).maxBytes : null;
  const busy = status === "working" || status === "loading";
  const warn = src ? largeFileWarning(src.bytes) : null;

  function touch() {
    setResult(null);
    setError(null);
    setStatus((s) => (s === "working" || s === "loading" ? s : "idle"));
  }

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setStatus("loading");
    setError(null);
    setResult(null);
    try {
      const loaded = await loadImageFromFile(file);
      setSrc(loaded);
      setSrcType(file.type);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof UserFacingError
          ? e.message
          : "Something went wrong while opening the picture. Please try again."
      );
    }
  }

  async function makeFile() {
    if (!src || maxBytes === null) return;
    setStatus("working");
    setProgress(0.02);
    setError(null);
    setResult(null);

    const mime: LossyType = format === "webp" ? "image/webp" : "image/jpeg";
    const base = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(src.width, src.height));
    const steps = allowShrink ? SHRINK_STEPS : [1];

    try {
      let found: { blob: Blob; quality: number; w: number; h: number; factor: number } | null = null;

      for (let i = 0; i < steps.length; i++) {
        await new Promise((r) => setTimeout(r, 30)); // let the browser paint the progress bar
        const scale = base * steps[i];
        const w = Math.max(1, Math.round(src.width * scale));
        const h = Math.max(1, Math.round(src.height * scale));

        const canvas = document.createElement("canvas");
        renderToCanvas(canvas, src.img, { x: 0, y: 0, w: src.width, h: src.height }, w, h, null, 0, true);
        const fit = await encodeLossy(canvas, mime, maxBytes, (p) =>
          setProgress(0.02 + 0.96 * ((i + p) / steps.length))
        );
        canvas.width = 0; // release memory early (helps older phones)
        canvas.height = 0;

        if (!fit.tooBig) {
          found = { blob: fit.blob, quality: fit.quality, w, h, factor: steps[i] };
          break;
        }
      }

      if (!found) {
        setStatus("error");
        setError(
          allowShrink
            ? "We could not get this picture under your limit, even after making it much smaller. Try a higher limit if your notification allows it, or a simpler picture."
            : "The picture is still over your limit at its full size. Turn on “Allow a smaller width and height”, or enter a higher limit if your notification allows it."
        );
        return;
      }

      setResult({
        blob: found.blob,
        url: URL.createObjectURL(found.blob),
        width: found.w,
        height: found.h,
        quality: found.quality,
        shrunk: found.w !== src.width || found.h !== src.height,
        limitBytes: maxBytes,
      });
      setProgress(1);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof UserFacingError
          ? e.message
          : "Something went wrong while making your file. Try a smaller picture or another browser."
      );
    }
  }

  const ext = format === "webp" ? "webp" : "jpg";
  const filename = src ? `${baseName(src.name)}-compressed.${ext}` : `compressed.${ext}`;
  const idMax = `${uid}-max`;
  const idFormat = `${uid}-format`;

  return (
    <div className="space-y-6">
      <FilePicker
        buttonLabel={src ? "Choose another picture" : "Choose a picture"}
        disabled={busy}
        onFiles={(f) => void handleFiles(f)}
      />

      <div aria-live="polite" className="space-y-3">
        {status === "loading" ? <p role="status">Opening your picture…</p> : null}
        {error ? (
          <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
            {error}
          </p>
        ) : null}
        {src ? (
          <p className="break-words text-sm text-muted">
            Using: {src.name} · {formatKB(src.bytes)} · {src.width} × {src.height} px
          </p>
        ) : null}
        {warn ? <p className="rounded-control border border-dashed border-muted p-3 text-sm">{warn}</p> : null}
        {src && srcType === "image/png" ? (
          <p className="text-sm text-muted">
            This is a PNG. PNG cannot be shrunk by lowering quality, so it will be saved as{" "}
            {format === "webp" ? "WebP" : "JPG"}. Transparent areas become white.
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Size limit</legend>
        <div className="max-w-xs">
          <label htmlFor={idMax} className="block font-semibold">
            Maximum size (KB)
          </label>
          <p id={`${idMax}-hint`} className="text-sm text-muted">
            Take this number from your official notification.
          </p>
          <input
            id={idMax}
            className="field mt-1"
            inputMode="decimal"
            autoComplete="off"
            value={maxKB}
            onChange={(e) => {
              setMaxKB(e.target.value.replace(/[^\d.]/g, ""));
              touch();
            }}
            aria-describedby={`${idMax}-hint`}
          />
        </div>

        <div className="max-w-xs">
          <label htmlFor={idFormat} className="block font-semibold">
            Save as
          </label>
          <select
            id={idFormat}
            className="field mt-1"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as Format);
              touch();
            }}
          >
            <option value="jpeg">JPG</option>
            <option value="webp">WebP (only if your form accepts it)</option>
          </select>
          <p className="mt-2 text-sm text-muted">
            PNG is not offered as an output. PNG cannot be made smaller by lowering quality, so a PNG is saved
            as JPG or WebP here.
          </p>
        </div>

        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            checked={allowShrink}
            onChange={(e) => {
              setAllowShrink(e.target.checked);
              touch();
            }}
            className="mt-1 h-6 w-6 shrink-0 accent-accent"
          />
          <span>
            <span className="block font-semibold">Allow a smaller width and height</span>
            <span className="block text-sm text-muted">
              Used only if lowering quality alone cannot reach your limit. Turn it off if your form needs
              exact pixels.
            </span>
          </span>
        </label>
      </fieldset>

      {src && maxBytes === null ? (
        <p className="rounded-control border border-muted p-3 font-semibold">
          Enter the maximum size in KB that your form allows.
        </p>
      ) : null}

      {src ? (
        <div className="space-y-3">
          <button
            type="button"
            className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={busy || maxBytes === null}
            onClick={() => void makeFile()}
          >
            {status === "working" ? "Making your file…" : "Make my file"}
          </button>
          {status === "working" ? (
            <div role="status" aria-live="polite">
              <progress value={progress} max={1} aria-label="Making your file" className="h-3 w-full accent-accent" />
              <p className="text-sm text-muted">Finding the best quality that fits. This can take a few seconds.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {result && src ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Your file
          </h2>

          <ul className="border-t border-line">
            <li className="flex items-start gap-3 border-b border-line py-3">
              <span aria-hidden="true" className="w-5 shrink-0 text-center font-bold">
                {result.blob.size <= result.limitBytes ? "✓" : "✗"}
              </span>
              <span>
                <span className="block font-semibold">
                  Maximum size: {result.blob.size <= result.limitBytes ? "Pass" : "Fail"}
                </span>
                <span className="block text-sm text-muted">
                  {formatKB(result.blob.size)} (at most {maxKB} KB allowed)
                </span>
              </span>
            </li>
            <li className="flex items-start gap-3 border-b border-line py-3">
              <span aria-hidden="true" className="w-5 shrink-0 text-center font-bold">
                i
              </span>
              <span>
                <span className="block font-semibold">Width and height</span>
                <span className="block text-sm text-muted">
                  {result.width} × {result.height} px
                  {result.shrunk ? " (made smaller than the original)" : " (same shape as the original)"}
                </span>
              </span>
            </li>
          </ul>

          <p className="text-sm text-muted">Picture quality used: {Math.round(result.quality * 100)}%.</p>
          {result.blob.size >= src.bytes ? (
            <p className="text-sm text-muted">
              The new file is not smaller than your original. Your original may already be under the limit.
            </p>
          ) : null}
          {result.shrunk ? (
            <p className="text-sm text-muted">
              The width and height were reduced because quality alone could not reach your limit. If your form
              needs exact pixels, turn off “Allow a smaller width and height” and use the photo and signature
              resizer.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <figure>
              <figcaption className="mb-1 font-semibold">Before</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src.url} alt="Your original picture" className="max-h-64 w-full rounded-control border border-line object-contain" />
              <p className="mt-1 text-sm text-muted">
                {formatKB(src.bytes)} · {src.width} × {src.height}
              </p>
            </figure>
            <figure>
              <figcaption className="mb-1 font-semibold">After</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="Your compressed picture" className="max-h-64 w-full rounded-control border border-line object-contain" />
              <p className="mt-1 text-sm text-muted">
                {formatKB(result.blob.size)} · {result.width} × {result.height}
              </p>
            </figure>
          </div>

          <a href={result.url} download={filename} className="btn w-full sm:w-auto">
            Download {filename} ({formatKB(result.blob.size)})
          </a>

          <p className="text-sm text-muted">
            We keep the file under the limit counting 1 KB as 1000 bytes, so it passes whichever way the upload
            page counts. Sizes shown here use 1 KB = 1024 bytes. Always confirm the rules in your official
            notification.
          </p>
        </section>
      ) : null}
    </div>
  );
}