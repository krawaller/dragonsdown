import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type TtsRecord = Record<string, unknown>;

type PdfReference = {
  url: string;
  filename: string;
};

const SOURCE_FILE = path.join(
  process.cwd(),
  "data",
  "downloaded-tts",
  "dd_all_exp.json",
);
const OUT_DIR = path.join(process.cwd(), "data", "downloaded-pdf");

function isRecord(value: unknown): value is TtsRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^\.+/, "")
    .trim();
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const basename = sanitizeFilename(
      decodeURIComponent(path.posix.basename(parsed.pathname)),
    );
    if (/\.pdf$/i.test(basename)) return basename;
  } catch {
    // Fall through to fallback for malformed URLs.
  }

  return `${sanitizeFilename(fallback) || "tts-pdf"}.pdf`;
}

function uniqueFilename(filename: string, used: Set<string>): string {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }

  const extension = path.extname(filename) || ".pdf";
  const stem = filename.slice(0, filename.length - extension.length);
  let index = 2;
  while (used.has(`${stem}-${index}${extension}`)) index += 1;
  const unique = `${stem}-${index}${extension}`;
  used.add(unique);
  return unique;
}

function collectPdfReferences(value: unknown): PdfReference[] {
  const references: PdfReference[] = [];
  const seenUrls = new Set<string>();
  const usedFilenames = new Set<string>();

  function add(url: string, fallback: string): void {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    references.push({
      url,
      filename: uniqueFilename(filenameFromUrl(url, fallback), usedFilenames),
    });
  }

  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }

    if (!isRecord(node)) return;

    const customPdf = node.CustomPDF;
    if (isRecord(customPdf)) {
      const url = text(customPdf.PDFUrl);
      if (url) add(url, `tts-pdf-${references.length + 1}-${text(node.GUID)}`);
    }

    for (const child of Object.values(node)) visit(child);
  }

  visit(value);
  return references;
}

async function downloadPdf(reference: PdfReference): Promise<void> {
  const target = path.join(OUT_DIR, reference.filename);
  const response = await fetch(reference.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(target, buffer);
  console.log(`Downloaded ${reference.filename}`);
}

async function main(): Promise<void> {
  const save = JSON.parse(await readFile(SOURCE_FILE, "utf8")) as unknown;
  const references = collectPdfReferences(save);
  await mkdir(OUT_DIR, { recursive: true });

  console.log(
    `Found ${references.length} PDF URL${references.length === 1 ? "" : "s"}`,
  );
  for (const reference of references) {
    await downloadPdf(reference);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
