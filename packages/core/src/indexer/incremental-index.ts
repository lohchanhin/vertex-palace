export function changedFiles(previous: Record<string, string>, next: Record<string, string>): string[] {
  return Object.entries(next)
    .filter(([filePath, hash]) => previous[filePath] !== hash)
    .map(([filePath]) => filePath)
    .sort();
}
