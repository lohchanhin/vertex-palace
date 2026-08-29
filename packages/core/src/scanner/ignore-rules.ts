import { readFile } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { DEFAULT_IGNORE } from "../config/defaults";
import { normalizeRelativePath } from "../utils/path-utils";

export async function createIgnoreMatcher(
  root: string,
  extra: string[] = [],
  nestedGitignorePaths: string[] = []
) {
  const rootMatcher = ignore();
  rootMatcher.add(DEFAULT_IGNORE);
  rootMatcher.add(extra);

  try {
    const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
    rootMatcher.add(gitignore);
  } catch {
    // A repository does not need a .gitignore for Palace scanning.
  }

  const nestedMatchers = await Promise.all(
    nestedGitignorePaths
      .map(normalizeRelativePath)
      .filter((relativePath) => relativePath !== ".gitignore")
      .sort((left, right) => left.localeCompare(right))
      .map(async (relativePath) => {
        try {
          const matcher = ignore().add(await readFile(path.join(root, relativePath), "utf8"));
          return { base: path.posix.dirname(relativePath), matcher };
        } catch {
          return undefined;
        }
      })
  );

  return (relativePath: string): boolean => {
    const normalized = normalizeRelativePath(relativePath);
    if (rootMatcher.ignores(normalized)) return true;
    let ignored = false;
    for (const entry of nestedMatchers) {
      if (!entry || (normalized !== entry.base && !normalized.startsWith(`${entry.base}/`))) continue;
      const localPath = normalized.slice(entry.base.length).replace(/^\//, "");
      if (!localPath) continue;
      const result = entry.matcher.test(localPath);
      if (result.ignored) ignored = true;
      else if (result.unignored) ignored = false;
    }
    return ignored;
  };
}

export function defaultIgnorePatterns(): string[] {
  return [...DEFAULT_IGNORE];
}
