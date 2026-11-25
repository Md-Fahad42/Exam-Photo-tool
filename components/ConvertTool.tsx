"use client";

import { useEffect, useId, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import {
  UserFacingError,
  canvasToBlob,
  formatKB,
  loadImageFromFile,
  type LoadedImage,
} from "@/lib/image-utils";
import { baseName, largeFileWarning } from "@/lib/image-tools";

type Format = "jpeg" | "png" | "webp";
type Status = "idle" | "loading" | "working" | "done" | "error";
type Result = { blob: Blob; url: string; width: number; height: number; format: Format };

const MIME: Record<Format, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const LABEL: Record<Format, string> = { jpeg: "JPG", png: "PNG", webp: "WebP" };
const EXT: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp" };

/** Beyond this many pixels, canvases fail on many phones. */
const MAX_PIXELS = 50_000_000;

export function ConvertTool() {
  const uid = useId();
  const [src, setSrc] = useState<LoadedImage | null>(null);
  const [srcType, setSrcType] = useState("");
  const [format, setFormat] = useState<Format>("jpeg");
  const [quality, setQuality] = useState(92);
  const [status, setStatus] = useState<Status>("idle");
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

  const busy = status === "working" || status === "loading";
  const warn = src ? largeFileWarning(src.bytes) : null;
  const sameType = !!src && srcType === MIME[format];

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

  async function convert() {
    if (!src) return;
    if (src.width * src.height > MAX_PIXELS) {
      setStatus("error");
      setError(
        "This picture has too many pixels (over 50 million) for a browser to convert safely. Take a new photo at a lower resolution, or make it smaller first."
      );
      return;
    }
    setStatus("working");
    setError(null);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 30)); // let the browser paint "Converting…"
      const canvas = document.createElement("canvas");
      canvas.width = src.width;
      canvas.height = src.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new UserFacingError("Your browser could not prepare the picture. Please update your browser or try Chrome.");
      }
      if (format === "jpeg") {
        // JPG has no transparency: paint white first so see-through areas do not turn black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, src.width, src.height);
      }
      ctx.drawImage(src.img, 0, 0);

      const blob = await canvasToBlob(canvas, MIME[format], format === "png" ? undefined : quality / 100);
      canvas.width = 0;
      canvas.height = 0;

      // Browsers that cannot save WebP silently return a PNG instead.
      if (blob.type !== MIME[format]) {
        throw new UserFacingError(`This browser cannot save ${LABEL[format]} pictures. Please choose another type.`);
      }
      setResult({
        blob,
        url: URL.createObjectURL(blob),
        width: src.width,
        height: src.height,
        format,
      });
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof UserFacingError
          ? e.message
          : "Something went wrong while converting. Try a smaller picture or another browser."
      );
    }
  }

  const filename = src ? `${baseName(src.name)}.${EXT[format]}` : `converted.${EXT[format]}`;
  const idFormat = `${uid}-format`;
  const idQuality = `${uid}-quality`;

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
          <p className="wrap-break-words text-sm text-muted">
            Using: {src.name} · {formatKB(src.bytes)} · {src.width} × {src.height} px
          </p>
        ) : null}
        {warn ? <p className="rounded-control border border-dashed border-muted p-3 text-sm">{warn}</p> : null}
      </div>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Convert to</legend>
        <div className="max-w-xs">
          <label htmlFor={idFormat} className="block font-semibold">
            File type
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
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        {format === "jpeg" ? (
          <p className="text-sm text-muted">
            JPG cannot be see-through. A PNG or WebP with transparent areas gets a white background when saved
            as JPG.
          </p>
        ) : null}
        {format === "png" ? (
          <p className="text-sm text-muted">
            PNG keeps every detail, so photos saved as PNG are often much bigger than the same photo as JPG.
          </p>
        ) : null}
        {format === "webp" ? (
          <p className="text-sm text-muted">
            Many upload pages do not accept WebP. Check your notification before you use it.
          </p>
        ) : null}
        {sameType ? (
          <p className="text-sm text-muted">
            Your picture is already {LABEL[format]}. Converting saves it again, which can change its size.
          </p>
        ) : null}

        {format !== "png" ? (
          <div>
            <label htmlFor={idQuality} className="block font-semibold">
              Quality: {quality}%
            </label>
            <input
              id={idQuality}
              type="range"
              min={50}
              max={100}
              step={1}
              value={quality}
              onChange={(e) => {
                setQuality(Number(e.target.value));
                touch();
              }}
              className="h-11 w-full accent-accent"
            />
            <p className="text-sm text-muted">Lower quality makes a smaller file. 92% is a good starting point.</p>
          </div>
        ) : null}
      </fieldset>

      {src ? (
        <div className="space-y-3">
          <button
            type="button"
            className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={busy}
            onClick={() => void convert()}
          >
            {status === "working" ? "Converting…" : "Convert"}
          </button>
          {status === "working" ? (
            <div role="status" aria-live="polite">
              <progress aria-label="Converting" className="h-3 w-full accent-accent" />
              <p className="text-sm text-muted">Converting your picture. This is quick for most pictures.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {result && src ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Your file
          </h2>
          <p>
            Saved as <strong>{LABEL[result.format]}</strong>, {result.width} × {result.height} px (the same
            width and height as the original), {formatKB(result.blob.size)}.
          </p>
          {result.blob.size > src.bytes ? (
            <p className="text-sm text-muted">
              The new file is bigger than the original. That can happen, for example when a JPG is saved as
              PNG.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <figure>
              <figcaption className="mb-1 font-semibold">Before</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src.url} alt="Your original picture" className="max-h-64 w-full rounded-control border border-line object-contain" />
              <p className="mt-1 text-sm text-muted">{formatKB(src.bytes)}</p>
            </figure>
            <figure>
              <figcaption className="mb-1 font-semibold">After</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="Your converted picture" className="max-h-64 w-full rounded-control border border-line object-contain" />
              <p className="mt-1 text-sm text-muted">{formatKB(result.blob.size)}</p>
            </figure>
          </div>

          <a href={result.url} download={filename} className="btn w-full sm:w-auto">
            Download {filename} ({formatKB(result.blob.size)})
          </a>
        </section>
      ) : null}
    </div>
  );
}