/** Files this big can be slow on an older phone. Copy only, not an exam rule. */
export const LARGE_FILE_BYTES = 10 * 1024 * 1024;

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

export function largeFileWarning(bytes: number): string | null {
  return bytes >= LARGE_FILE_BYTES
    ? `This file is large (${formatSize(bytes)}). It may take longer to process on an older phone.`
    : null;
}

/** "My Photo (1).JPG" becomes "My-Photo-1". Falls back to "picture". */
export function baseName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "picture";
}