export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const MAX_INPUT_BYTES = 30 * 1024 * 1024;
export const MAX_OUTPUT_DIMENSION = 4000;
const MIN_QUALITY = 0.05;

/** Longest side of the working copy used for the live preview. */
export const PREVIEW_SOURCE_MAX = 1600;
/** Very mild sharpening strength (0 = off). */
export const SHARPEN_AMOUNT = 0.2;
/** Sharpening is offered only when the crop is at least this many times bigger than the output. */
export const SHARPEN_MIN_RATIO = 2;

export type LoadedImage = {
  img: HTMLImageElement;
  url: string;
  width: number;
  height: number;
  name: string;
  bytes: number;
};

export type CropRect = { x: number; y: number; w: number; h: number };

export type Check = { id: string; label: string; ok: boolean; detail: string };

/** A smaller copy of the picture, made once, so the preview stays sharp and fast. */
export type WorkingCopy = { source: CanvasImageSource; scale: number };

/* ---------- Loading ---------- */

export function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
}

/**
 * EXIF orientation: this relies on the BROWSER applying it. Current Chrome,
 * Safari and Firefox do this for <img> and for canvas.drawImage, and
 * naturalWidth/naturalHeight are the rotated sizes. Test with a phone photo
 * taken in portrait mode.
 */
export async function loadImageFromFile(file: File): Promise<LoadedImage> {
  const looksHeic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);

  if (file.type && !file.type.startsWith("image/")) {
    throw new UserFacingError("This file is not a picture. Please choose a JPG or PNG photo.");
  }
  if (file.size === 0) {
    throw new UserFacingError("This file is empty. Please choose another picture.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new UserFacingError("This picture is very large (over 30 MB). Please choose a smaller one or take a new photo.");
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await decodeImage(url);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) throw new Error("empty image");
    return { img, url, width, height, name: file.name, bytes: file.size };
  } catch {
    URL.revokeObjectURL(url);
    throw new UserFacingError(
      looksHeic
        ? "This browser cannot open HEIC photos. Take a new photo with the camera button, or save the photo as JPG first."
        : "We could not open this picture. It may be damaged. Try another picture or take a new photo."
    );
  }
}

/* ---------- Crop and draw ---------- */

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** cx, cy = centre of the crop as a fraction (0..1) of the image. zoom >= 1. */
export function cropRect(
  imgW: number,
  imgH: number,
  aspect: number,
  zoom: number,
  cx: number,
  cy: number
): CropRect {
  let baseW: number;
  let baseH: number;
  if (imgW / imgH > aspect) {
    baseH = imgH;
    baseW = imgH * aspect;
  } else {
    baseW = imgW;
    baseH = imgW / aspect;
  }
  const w = baseW / zoom;
  const h = baseH / zoom;
  const x = clamp(cx * imgW - w / 2, 0, imgW - w);
  const y = clamp(cy * imgH - h / 2, 0, imgH - h);
  return { x, y, w, h };
}

/**
 * Downscale in steps: halve repeatedly while the source is more than twice
 * the target, then do one final draw (the last step is a ratio of 2 or less).
 * Much sharper than one big shrink.
 */
function drawHighQuality(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  rect: CropRect,
  outW: number,
  outH: number
) {
  let src: CanvasImageSource = img;
  let sx = rect.x;
  let sy = rect.y;
  let sw = rect.w;
  let sh = rect.h;
  while (sw / 2 > outW && sh / 2 > outH) {
    const w = Math.ceil(sw / 2);
    const h = Math.ceil(sh / 2);
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext("2d");
    if (!tctx) break;
    tctx.imageSmoothingQuality = "high";
    tctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    src = tmp;
    sx = 0;
    sy = 0;
    sw = w;
    sh = h;
  }
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, outW, outH);
}

/**
 * Make a smaller copy once (at most maxSide on the longest side) using the
 * stepped method. Returns the original image when it is already small enough
 * or when the canvas is not available.
 */
export function makeWorkingCopy(img: HTMLImageElement, maxSide: number): WorkingCopy {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const longest = Math.max(nw, nh);
  if (longest <= maxSide) return { source: img, scale: 1 };

  const scale = maxSide / longest;
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { source: img, scale: 1 };
  ctx.imageSmoothingQuality = "high";
  drawHighQuality(ctx, img, { x: 0, y: 0, w: nw, h: nh }, w, h);
  return { source: canvas, scale: w / nw };
}

/** Very mild sharpening: 3x3 kernel, centre 1 + 4a, four neighbours -a. */
function sharpenCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0 || w < 3 || h < 3) return;
  const image = ctx.getImageData(0, 0, w, h);
  const src = image.data;
  const out = new Uint8ClampedArray(src); // copy; assignments below are clamped to 0..255
  const centre = 1 + 4 * amount;
  const row = w * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const k = i + c;
        out[k] = centre * src[k] - amount * (src[k - 4] + src[k + 4] + src[k - row] + src[k + row]);
      }
    }
  }
  image.data.set(out);
  ctx.putImageData(image, 0, 0);
}

/** Simple threshold: any pixel lighter than `threshold` (0-255) becomes pure white. */
function whitenBackground(ctx: CanvasRenderingContext2D, w: number, h: number, threshold: number) {
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const luma = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    if (luma >= threshold) {
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
}

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  rect: CropRect,
  outW: number,
  outH: number,
  whiteThreshold: number | null,
  sharpenAmount: number,
  highQuality: boolean
) {
  canvas.width = outW;
  canvas.height = outH;
  const needsPixels = whiteThreshold !== null || sharpenAmount > 0;
  const ctx = canvas.getContext("2d", { willReadFrequently: needsPixels });
  if (!ctx) {
    throw new UserFacingError("Your browser could not prepare the picture. Please update your browser or try Chrome.");
  }
  // JPEG has no transparency: paint white first so see-through PNGs do not turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingQuality = "high";
  if (highQuality) {
    drawHighQuality(ctx, source, rect, outW, outH);
  } else {
    ctx.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, outW, outH);
  }
  if (sharpenAmount > 0) sharpenCanvas(ctx, outW, outH, sharpenAmount);
  if (whiteThreshold !== null) whitenBackground(ctx, outW, outH, whiteThreshold);
}

/* ---------- Encoding ---------- */

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      type,
      quality
    );
  });
}

/**
 * Binary search for the highest JPEG quality whose file is <= maxBytes.
 * About 11 encodes. If maxBytes is null, one encode at 92%.
 */
export async function encodeJpeg(
  canvas: HTMLCanvasElement,
  maxBytes: number | null,
  onProgress?: (fraction: number) => void
): Promise<{ blob: Blob; quality: number; tooBig: boolean }> {
  if (maxBytes === null) {
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    onProgress?.(1);
    return { blob, quality: 0.92, tooBig: false };
  }

  const top = await canvasToBlob(canvas, "image/jpeg", 1);
  onProgress?.(0.1);
  if (top.size <= maxBytes) {
    onProgress?.(1);
    return { blob: top, quality: 1, tooBig: false };
  }

  const floor = await canvasToBlob(canvas, "image/jpeg", MIN_QUALITY);
  onProgress?.(0.2);
  if (floor.size > maxBytes) {
    return { blob: floor, quality: MIN_QUALITY, tooBig: true };
  }

  const STEPS = 9;
  let lo = MIN_QUALITY;
  let hi = 1;
  let best = floor;
  let bestQ = MIN_QUALITY;
  for (let i = 0; i < STEPS; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, "image/jpeg", mid);
    if (blob.size <= maxBytes) {
      best = blob;
      bestQ = mid;
      lo = mid;
    } else {
      hi = mid;
    }
    onProgress?.(0.2 + (0.8 * (i + 1)) / STEPS);
  }
  return { blob: best, quality: bestQ, tooBig: false };
}

/**
 * Grow a JPEG to about targetBytes by inserting JPEG comment segments (FF FE)
 * after the header. The picture is unchanged. Never shrinks. May be a few
 * bytes short of the target (at most 4).
 */
export async function padJpegTo(blob: Blob, targetBytes: number): Promise<Blob> {
  let remaining = targetBytes - blob.size;
  if (remaining < 5) return blob;

  const head = new Uint8Array(await blob.slice(0, 6).arrayBuffer());
  if (head.length < 6 || head[0] !== 0xff || head[1] !== 0xd8) return blob;

  // JFIF says APP0 should come right after SOI, so insert after it if present.
  let insertAt = 2;
  if (head[2] === 0xff && head[3] === 0xe0) insertAt = 4 + ((head[4] << 8) | head[5]);

  const parts: BlobPart[] = [blob.slice(0, insertAt)];
  while (remaining >= 5) {
    const dataLen = Math.min(remaining - 4, 65533);
    const seg = new Uint8Array(4 + dataLen);
    seg.fill(0x20);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    seg[2] = (dataLen + 2) >> 8;
    seg[3] = (dataLen + 2) & 0xff;
    parts.push(seg);
    remaining -= seg.length;
  }
  parts.push(blob.slice(insertAt));
  return new Blob(parts, { type: "image/jpeg" });
}

/* ---------- Size rules and validation ---------- */

/**
 * Upload pages differ on what "1 KB" means (1000 or 1024 bytes).
 * Max uses 1000 and min uses 1024, so the file passes under either count.
 */
export function sizeLimits(minKB: number | null, maxKB: number | null) {
  const minBytes = minKB === null ? null : Math.round(minKB * 1024);
  let maxBytes = maxKB === null ? null : Math.floor(maxKB * 1000);
  if (minBytes !== null && maxKB !== null && maxBytes !== null && maxBytes < minBytes) {
    maxBytes = Math.floor(maxKB * 1024);
  }
  return { minBytes, maxBytes };
}

export function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function buildChecks(
  actual: { width: number; height: number; bytes: number; mime: string },
  want: {
    width: number;
    height: number;
    minKB: number | null;
    maxKB: number | null;
    format: "jpeg" | "png";
  }
): Check[] {
  const { minBytes, maxBytes } = sizeLimits(want.minKB, want.maxKB);
  const checks: Check[] = [];

  checks.push({
    id: "dimensions",
    label: "Width and height",
    ok: actual.width === want.width && actual.height === want.height,
    detail: `${actual.width} × ${actual.height} px (needed ${want.width} × ${want.height} px)`,
  });

  const wantMime = want.format === "png" ? "image/png" : "image/jpeg";
  checks.push({
    id: "type",
    label: "File type",
    ok: actual.mime === wantMime,
    detail: want.format === "png" ? "PNG" : "JPG",
  });

  if (minBytes !== null) {
    checks.push({
      id: "min",
      label: "Minimum size",
      ok: actual.bytes >= minBytes,
      detail: `${formatKB(actual.bytes)} (at least ${want.minKB} KB needed)`,
    });
  }
  if (maxBytes !== null) {
    checks.push({
      id: "max",
      label: "Maximum size",
      ok: actual.bytes <= maxBytes,
      detail: `${formatKB(actual.bytes)} (at most ${want.maxKB} KB allowed)`,
    });
  }
  return checks;
}