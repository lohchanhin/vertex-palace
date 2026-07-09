import path from "node:path";

const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".avif",
  ".bmp",
  ".br",
  ".bz2",
  ".class",
  ".db",
  ".dll",
  ".dmg",
  ".doc",
  ".docx",
  ".eot",
  ".exe",
  ".gif",
  ".gz",
  ".heic",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".ogg",
  ".otf",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rar",
  ".sqlite",
  ".tar",
  ".tgz",
  ".ttf",
  ".wasm",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".zip"
]);

const BINARY_LANGUAGES = new Set([...BINARY_EXTENSIONS].map((extension) => extension.slice(1)));

export function isBinaryLikePath(sourcePath: string, language?: string): boolean {
  const extension = path.extname(sourcePath).toLowerCase();
  return BINARY_EXTENSIONS.has(extension) || (language ? BINARY_LANGUAGES.has(language.toLowerCase()) : false);
}

export function binarySummary(sourcePath: string, language: string, size?: number): string {
  return [
    `Binary/media asset ${sourcePath}.`,
    `Type: ${language || path.extname(sourcePath).replace(/^\./, "") || "binary"}.`,
    size === undefined ? undefined : `Size: ${size} bytes.`,
    "Contents omitted from text parsing and context packs."
  ]
    .filter(Boolean)
    .join(" ");
}
