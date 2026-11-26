// Copies the pdf.js worker into /public so it is served as a plain static file.
// Runs automatically before `npm run dev` and `npm run build` (see package.json).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const toDir = join(root, "public");
const to = join(toDir, "pdf.worker.min.mjs");

if (!existsSync(from)) {
  console.error(
    "[pdf worker] Could not find node_modules/pdfjs-dist/build/pdf.worker.min.mjs.\n" +
      "Run `npm install pdfjs-dist`. If it is installed, this version names the worker differently:\n" +
      "check the pdfjs-dist docs for the worker file and update this script."
  );
  process.exit(1);
}

mkdirSync(toDir, { recursive: true });
copyFileSync(from, to);
console.log("[pdf worker] Copied pdf.worker.min.mjs to public/");