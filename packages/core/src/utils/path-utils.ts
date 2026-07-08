import path from "node:path";

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function normalizeRelativePath(value: string): string {
  return toPosixPath(value).replace(/^\.\//, "");
}

export function relativePath(root: string, absolutePath: string): string {
  return normalizeRelativePath(path.relative(root, absolutePath));
}

export function resolveRoot(root?: string): string {
  return path.resolve(root ?? process.cwd());
}

export function palacePath(...parts: Array<string | undefined>): string {
  return normalizeRelativePath(parts.filter(Boolean).join("/"));
}

export function stripExtension(filePath: string): string {
  return normalizeRelativePath(filePath).replace(/\.[^.]+$/, "");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-") || "unknown";
}
