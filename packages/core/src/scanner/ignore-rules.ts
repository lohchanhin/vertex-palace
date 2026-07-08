import { readFile } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { DEFAULT_IGNORE } from "../config/defaults";
import { normalizeRelativePath } from "../utils/path-utils";

export async function createIgnoreMatcher(root: string, extra: string[] = []) {
  const matcher = ignore();
  matcher.add(DEFAULT_IGNORE);
  matcher.add(extra);

  try {
    const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
    matcher.add(gitignore);
  } catch {
    // A repository does not need a .gitignore for Palace scanning.
  }

  return (relativePath: string): boolean => matcher.ignores(normalizeRelativePath(relativePath));
}

export function defaultIgnorePatterns(): string[] {
  return [...DEFAULT_IGNORE];
}
