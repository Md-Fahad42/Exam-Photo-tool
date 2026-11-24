"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { VerifyBadge } from "@/components/VerifyBadge";
import { blankSpec, type Exam, type ImageFormat, type ImageSpec } from "@/data/exams";
import {
  MAX_OUTPUT_DIMENSION,
  PREVIEW_SOURCE_MAX,
  SHARPEN_AMOUNT,
  SHARPEN_MIN_RATIO,
  UserFacingError,
  buildChecks,
  canvasToBlob,
  cropRect,
  decodeImage,
  encodeJpeg,
  formatKB,
  loadImageFromFile,
  makeWorkingCopy,
  padJpegTo,
  renderToCanvas,
  sizeLimits,
  type Check,
  type LoadedImage,
  type WorkingCopy,
} from "@/lib/image-utils";

type ExamPreset = Pick<Exam, "slug" | "name" | "photo" | "signature" | "verified" | "lastVerified">;

type Kind = "photo" | "signature";
type Props = {
  exam?: ExamPreset;
  /** Which tab to start on. Default: photo. */
  kind?: Kind;
  /** Hide the Photo/Signature switch (used by the signature page). */
  hideKindSwitch?: boolean;
};

type Status = "idle" | "loading" | "working" | "done" | "error";
type Fields = { w: string; h: string; minKB: string; maxKB: string; format: ImageFormat };
type Result = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  quality: number | null;
  padded: boolean;
  tooBig: boolean;
  sharpened: boolean;
  checks: Check[];
};

/** Outputs this small look soft on a big screen. UI copy only, not an exam rule. */
const SMALL_OUTPUT_PX = 400;

const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-control border border-muted bg-surface px-5 text-base font-semibold text-ink";

function toFields(spec: ImageSpec): Fields {
  return {
    w: spec.widthPx === null ? "" : String(spec.widthPx),
    h: spec.heightPx === null ? "" : String(spec.heightPx),
    minKB: spec.minKB === null ? "" : String(spec.minKB),
    maxKB: spec.maxKB === null ? "" : String(spec.maxKB),
    format: spec.format ?? "jpeg",
  };
}

function toNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toInt(s: string): number | null {
  const n = toNum(s);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= 1 && r <= MAX_OUTPUT_DIMENSION ? r : null;
}

function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

function NumberField(props: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  inputMode: "numeric" | "decimal";
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const { id, label, hint, value, inputMode, onChange, inputRef } = props;
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        ref={inputRef}
        className="field mt-1"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
  );
}

export function PhotoTool({ exam, kind: initialKind = "photo", hideKindSwitch = false }: Props) {
  const uid = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const widthRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ x: number; y: number; cxPx: number; cyPx: number } | null>(null);

  const coarse = useCoarsePointer();

  const [kind, setKind] = useState<Kind>(initialKind);
  const [fields, setFields] = useState<Fields>(() => toFields(exam ? exam[initialKind] : blankSpec()));
  const [src, setSrc] = useState<LoadedImage | null>(null);
  const [work, setWork] = useState<WorkingCopy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [cx, setCx] = useState(0.5);
  const [cy, setCy] = useState(0.5);
  const [clean, setClean] = useState(false);
  const [strength, setStrength] = useState(4);
  const [sharpen, setSharpen] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);

  // Free blob URLs when they are replaced or the component goes away.
  useEffect(() => {
    if (!src) return;
    return () => URL.revokeObjectURL(src.url);
  }, [src]);
  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  /* ----- Derived values ----- */
  const wPx = toInt(fields.w);
  const hPx = toInt(fields.h);
  const minKB = toNum(fields.minKB);
  const maxKB = toNum(fields.maxKB);
  const threshold = 250 - (strength - 1) * 10;

  const sizeEmpty = fields.w.trim() === "" || fields.h.trim() === "";
  const kbEmpty = minKB === null && maxKB === null;

  let rulesError: string | null = null;
  if (!sizeEmpty && (wPx === null || hPx === null)) {
    rulesError = `Width and height must be whole numbers from 1 to ${MAX_OUTPUT_DIMENSION}.`;
  } else if (minKB !== null && maxKB !== null && minKB > maxKB) {
    rulesError = "The minimum size is bigger than the maximum size. Please check the numbers.";
  }

  const rect = useMemo(
    () => (src && wPx && hPx ? cropRect(src.width, src.height, wPx / hPx, zoom, cx, cy) : null),
    [src, wPx, hPx, zoom, cx, cy]
  );

  // Preview box (CSS pixels) and its backing store. The backing store is never
  // bigger than the real output, so the preview shows the true resolution.
  let pw = 0;
  let ph = 0;
  let bw = 0;
  let bh = 0;
  if (wPx && hPx) {
    const scale = Math.min(320 / wPx, 360 / hPx);
    pw = Math.max(1, Math.round(wPx * scale));
    ph = Math.max(1, Math.round(hPx * scale));
    const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    bw = Math.max(1, Math.min(Math.round(pw * dpr), wPx));
    bh = Math.max(1, Math.min(Math.round(ph * dpr), hPx));
  }

  const shrinkRatio = rect && wPx ? rect.w / wPx : 1;
  const canSharpen = shrinkRatio >= SHARPEN_MIN_RATIO;
  const sharpenAmount = sharpen && canSharpen ? SHARPEN_AMOUNT : 0;
  const smallOutput = !!wPx && !!hPx && Math.max(wPx, hPx) <= SMALL_OUTPUT_PX;

  const effCx = src && rect ? (rect.x + rect.w / 2) / src.width : 0.5;
  const effCy = src && rect ? (rect.y + rect.h / 2) / src.height : 0.5;
  const canPanX = !!(src && rect && rect.w < src.width - 0.5);
  const canPanY = !!(src && rect && rect.h < src.height - 0.5);

  // Live preview: drawn from the 1600 px working copy, at most once per frame.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !src || !work || !rect || !bw || !bh || rulesError) return;
    const id = requestAnimationFrame(() => {
      try {
        const s = work.scale;
        const r = { x: rect.x * s, y: rect.y * s, w: rect.w * s, h: rect.h * s };
        renderToCanvas(canvas, work.source, r, bw, bh, clean ? threshold : null, 0, true);
      } catch {
        /* preview only: errors surface when the real file is made */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [src, work, rect, bw, bh, clean, threshold, rulesError]);

  /* ----- Handlers ----- */
  function touch() {
    setResult(null);
    setError(null);
    setStatus((s) => (s === "working" || s === "loading" ? s : "idle"));
  }

  function updateField(key: keyof Fields, value: string) {
    const cleaned = key === "format" ? value : value.replace(/[^\d.]/g, "");
    setFields((f) => ({ ...f, [key]: cleaned }));
    touch();
  }

  function changeKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setFields(toFields(exam ? exam[next] : blankSpec()));
    touch();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus("loading");
    setError(null);
    setResult(null);
    try {
      const loaded = await loadImageFromFile(file);
      const copy = makeWorkingCopy(loaded.img, PREVIEW_SOURCE_MAX);
      setSrc(loaded);
      setWork(copy);
      setZoom(1);
      setCx(0.5);
      setCy(0.5);
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

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    void handleFile(e.target.files?.[0]);
    e.target.value = ""; // lets the same file be chosen again
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      cxPx: rect.x + rect.w / 2,
      cyPx: rect.y + rect.h / 2,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const s = dragStart.current;
    if (!s || !rect || !src) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const k = rect.w / box.width; // source pixels per screen pixel
    setCx((s.cxPx - (e.clientX - s.x) * k) / src.width);
    setCy((s.cyPx - (e.clientY - s.y) * k) / src.height);
    touch();
  }

  function endDrag() {
    dragStart.current = null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    if (!rect || !src) return;
    const stepX = (rect.w * 0.05) / src.width;
    const stepY = (rect.h * 0.05) / src.height;
    if (e.key === "ArrowLeft") setCx(effCx - stepX);
    else if (e.key === "ArrowRight") setCx(effCx + stepX);
    else if (e.key === "ArrowUp") setCy(effCy - stepY);
    else if (e.key === "ArrowDown") setCy(effCy + stepY);
    else return;
    e.preventDefault();
    touch();
  }

  async function makeFile() {
    if (!src || !rect || !wPx || !hPx || rulesError) return;
    setStatus("working");
    setProgress(0.02);
    setError(null);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 30)); // let the browser paint the progress bar

      // The real file always comes from the full-size picture, not the preview copy.
      const out = document.createElement("canvas");
      renderToCanvas(out, src.img, rect, wPx, hPx, clean ? threshold : null, sharpenAmount, true);

      const { minBytes, maxBytes } = sizeLimits(minKB, maxKB);
      let blob: Blob;
      let quality: number | null = null;
      let tooBig = false;
      let padded = false;

      if (fields.format === "png") {
        blob = await canvasToBlob(out, "image/png");
      } else {
        const fit = await encodeJpeg(out, maxBytes, (p) => setProgress(0.05 + p * 0.85));
        blob = fit.blob;
        quality = fit.quality;
        tooBig = fit.tooBig;
        if (!tooBig && minBytes !== null && blob.size < minBytes) {
          const target = Math.min(minBytes + 1024, maxBytes ?? Infinity);
          if (target > blob.size) {
            blob = await padJpegTo(blob, target);
            padded = true;
          }
        }
      }

      // Measure the real file instead of trusting our own numbers.
      const url = URL.createObjectURL(blob);
      let width: number;
      let height: number;
      try {
        const check = await decodeImage(url);
        width = check.naturalWidth;
        height = check.naturalHeight;
      } catch {
        URL.revokeObjectURL(url);
        throw new UserFacingError("The finished file could not be opened. Please try again.");
      }

      setResult({
        blob,
        url,
        width,
        height,
        quality,
        padded,
        tooBig,
        sharpened: sharpenAmount > 0,
        checks: buildChecks(
          { width, height, bytes: blob.size, mime: blob.type },
          { width: wPx, height: hPx, minKB, maxKB, format: fields.format }
        ),
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

  const ext = fields.format === "png" ? "png" : "jpg";
  const filename = `${exam?.slug ?? "exam"}-${kind}.${ext}`;
  const busy = status === "working" || status === "loading";
  const idW = `${uid}-w`;
  const idH = `${uid}-h`;
  const idMin = `${uid}-min`;
  const idMax = `${uid}-max`;
  const idType = `${uid}-type`;
  const idZoom = `${uid}-zoom`;
  const idX = `${uid}-x`;
  const idY = `${uid}-y`;
  const idStrength = `${uid}-strength`;

  return (
    <div className="space-y-6">
      {/* 1. Photo or signature */}
      {!hideKindSwitch ? (
        <div role="group" aria-label="What are you making?" className="grid grid-cols-2 gap-2">
          {(["photo", "signature"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => changeKind(k)}
              className={
                kind === k
                  ? "inline-flex min-h-12 items-center justify-center rounded-control bg-accent px-4 text-base font-semibold text-paper"
                  : secondaryBtn
              }
            >
              {k === "photo" ? "Photo" : "Signature"}
            </button>
          ))}
        </div>
      ) : null}

      {/* 2. Choose a picture (first action on screen) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-panel border-2 p-4 text-center ${
          dragging ? "border-accent" : "border-line"
        }`}
      >
        <p className="text-muted">
          {dragging ? "Drop the picture here" : "Drag a picture here, or choose one."}
        </p>
        <div className="mt-3 flex min-h-12 flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            {src ? "Choose another picture" : "Choose a picture"}
          </button>
          {coarse ? (
            <button type="button" className={secondaryBtn} onClick={() => cameraInput.current?.click()}>
              Take a photo
            </button>
          ) : null}
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPick} />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture={kind === "photo" ? "user" : "environment"}
          className="hidden"
          onChange={onPick}
        />
        {src ? (
          <p className="mt-3 break-words text-sm text-muted">
            Using: {src.name} · {formatKB(src.bytes)} · {src.width} × {src.height} px
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted">Your picture stays on this device. Nothing is uploaded.</p>
      </div>

      <div aria-live="polite" className="space-y-3">
        {status === "loading" ? <p role="status">Opening your picture…</p> : null}
        {error ? (
          <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
            {error}
          </p>
        ) : null}

        {/* Hint: picture chosen but the size boxes are empty */}
        {src && sizeEmpty && status !== "loading" ? (
          <div className="rounded-control border border-muted p-3">
            <p className="font-semibold">Enter the width and height your form asks for.</p>
            <p className="mt-1 text-sm text-muted">
              You will find them in your official exam notification. After that you can move and zoom the
              picture.
            </p>
            <button
              type="button"
              className={`${secondaryBtn} mt-3`}
              onClick={() => widthRef.current?.focus()}
            >
              Go to the size boxes
            </button>
          </div>
        ) : null}

        {/* Softer hint: size is set but no KB limit */}
        {src && !sizeEmpty && !rulesError && kbEmpty ? (
          <p className="text-sm text-muted">
            No KB limit entered. If your form has a minimum or maximum file size, enter it below so the file
            can match it.
          </p>
        ) : null}
      </div>

      {/* 3. Size rules */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          Size rules for your {kind === "photo" ? "photo" : "signature"}
        </legend>

        {exam && !exam.verified ? (
          <p className="rounded-control border border-dashed border-muted p-3 text-sm">
            <VerifyBadge /> The {exam.name} sizes are not confirmed yet. Type the numbers from your official
            notification.
          </p>
        ) : null}
        {exam && exam.verified ? (
          <p className="text-sm text-muted">
            Filled from the official notification, checked on {exam.lastVerified ?? "an unknown date"}. Please
            confirm they still match your notification.
          </p>
        ) : null}
        {!exam ? (
          <p className="text-sm text-muted">Type the sizes from your exam notification.</p>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <NumberField id={idW} label="Width (px)" inputMode="numeric" value={fields.w} onChange={(v) => updateField("w", v)} inputRef={widthRef} />
          <NumberField id={idH} label="Height (px)" inputMode="numeric" value={fields.h} onChange={(v) => updateField("h", v)} />
          <NumberField id={idMin} label="Min size (KB)" hint="Optional" inputMode="decimal" value={fields.minKB} onChange={(v) => updateField("minKB", v)} />
          <NumberField id={idMax} label="Max size (KB)" hint="Optional" inputMode="decimal" value={fields.maxKB} onChange={(v) => updateField("maxKB", v)} />
        </div>

        <div className="max-w-xs">
          <label htmlFor={idType} className="block font-semibold">
            File type
          </label>
          <select
            id={idType}
            className="field mt-1"
            value={fields.format}
            onChange={(e) => updateField("format", e.target.value)}
          >
            <option value="jpeg">JPG</option>
            <option value="png">PNG (size cannot be tuned)</option>
          </select>
        </div>
      </fieldset>

      {/* 4. Crop preview and controls */}
      {src && rulesError ? (
        <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
          {rulesError}
        </p>
      ) : null}

      {src && rect && !rulesError ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Adjust the picture</h2>
          <canvas
            ref={previewRef}
            width={bw}
            height={bh}
            tabIndex={0}
            role="img"
            aria-label="Crop preview. Drag to move the picture, or use the arrow keys."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
            style={{ width: "100%", maxWidth: `${pw}px`, height: "auto", touchAction: "none" }}
            className="mx-auto block cursor-grab rounded-control border border-muted"
          />
          <p className="text-center text-sm text-muted">Drag the picture to move it. Use the sliders to zoom.</p>
          {smallOutput ? (
            <p className="text-sm text-muted">
              Your form asks for a small picture ({wPx} × {hPx} px). Small pictures look soft when shown big
              on a screen. That is normal. Judge the downloaded file at its real size.
            </p>
          ) : null}

          <div>
            <label htmlFor={idZoom} className="block font-semibold">
              Zoom
            </label>
            <input id={idZoom} type="range" min={1} max={4} step={0.05} value={zoom}
              onChange={(e) => { setZoom(Number(e.target.value)); touch(); }}
              className="h-11 w-full accent-accent" />
          </div>
          <div>
            <label htmlFor={idX} className="block font-semibold">
              Move left or right
            </label>
            <input id={idX} type="range" min={0} max={1} step={0.005} value={effCx} disabled={!canPanX}
              onChange={(e) => { setCx(Number(e.target.value)); touch(); }}
              className="h-11 w-full accent-accent disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor={idY} className="block font-semibold">
              Move up or down
            </label>
            <input id={idY} type="range" min={0} max={1} step={0.005} value={effCy} disabled={!canPanY}
              onChange={(e) => { setCy(Number(e.target.value)); touch(); }}
              className="h-11 w-full accent-accent disabled:opacity-50" />
          </div>

          {/* Optional sharpening (only when the picture is shrunk a lot) */}
          {canSharpen ? (
            <div className="rounded-control border border-line p-3">
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  checked={sharpen}
                  onChange={(e) => { setSharpen(e.target.checked); touch(); }}
                  className="mt-1 h-6 w-6 shrink-0 accent-accent"
                />
                <span>
                  <span className="block font-semibold">Slight sharpening</span>
                  <span className="block text-sm text-muted">
                    Your picture is being made much smaller, which can soften it. This adds a very small
                    amount of sharpening. Compare the result with it on and off. The preview above does not
                    show it.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {/* Optional white-background cleanup */}
          <div className="rounded-control border border-line p-3">
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                checked={clean}
                onChange={(e) => { setClean(e.target.checked); touch(); }}
                className="mt-1 h-6 w-6 shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold">Make the background white (optional)</span>
                <span className="block text-sm text-muted">
                  A simple filter: every light pixel becomes pure white. It works for signatures on paper and
                  plain light walls. It can spoil photos with light clothes or a busy background, so check the
                  preview.
                </span>
              </span>
            </label>
            {clean ? (
              <div className="mt-2">
                <label htmlFor={idStrength} className="block font-semibold">
                  Strength: {strength} of 10
                </label>
                <input id={idStrength} type="range" min={1} max={10} step={1} value={strength}
                  onChange={(e) => { setStrength(Number(e.target.value)); touch(); }}
                  className="h-11 w-full accent-accent" />
                <p className="text-sm text-muted">Higher turns more of the picture white.</p>
              </div>
            ) : null}
          </div>

          <button type="button" className="btn w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            onClick={() => void makeFile()} disabled={busy}>
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

      {/* 5. Result */}
      {result && src ? (
        <section aria-labelledby={`${uid}-result`} className="space-y-4 border-t border-line pt-6">
          <h2 id={`${uid}-result`} className="text-xl font-bold">
            Your file
          </h2>

          {result.tooBig ? (
            <p role="alert" className="rounded-control border border-muted p-3 font-semibold">
              We could not make this file small enough without making it very blurry. Try a simpler picture
              with a plain background, or check that the width and height are right.
            </p>
          ) : null}

          <ul className="border-t border-line">
            {result.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-3 border-b border-line py-3">
                <span aria-hidden="true" className="w-5 shrink-0 text-center font-bold">
                  {c.ok ? "✓" : "✗"}
                </span>
                <span>
                  <span className="block font-semibold">
                    {c.label}: {c.ok ? "Pass" : "Fail"}
                  </span>
                  <span className="block text-sm text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          {result.padded ? (
            <p className="text-sm text-muted">
              The file was smaller than the minimum, so we added harmless filler data. The picture is unchanged.
            </p>
          ) : null}
          {result.quality !== null ? (
            <p className="text-sm text-muted">Picture quality used: {Math.round(result.quality * 100)}%.</p>
          ) : null}
          {result.sharpened ? (
            <p className="text-sm text-muted">Slight sharpening was applied.</p>
          ) : null}
          {fields.format === "png" ? (
            <p className="text-sm text-muted">PNG size cannot be tuned. Choose JPG if the file is too big.</p>
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
              <img
                src={result.url}
                alt="Your finished picture"
                style={{ maxWidth: `${result.width}px` }}
                className="max-h-64 w-full rounded-control border border-line object-contain"
              />
              <p className="mt-1 text-sm text-muted">
                {formatKB(result.blob.size)} · {result.width} × {result.height}
              </p>
            </figure>
          </div>

          <a href={result.url} download={filename} className="btn w-full sm:w-auto">
            Download {filename} ({formatKB(result.blob.size)})
          </a>

          <p className="text-sm text-muted">
            Size note: we keep the file under the maximum counting 1 KB as 1000 bytes, and over the minimum
            counting 1 KB as 1024 bytes, so it passes whichever way the upload page counts. Sizes shown here
            use 1 KB = 1024 bytes. Always confirm the rules in your official notification.
          </p>
        </section>
      ) : null}
    </div>
  );
}