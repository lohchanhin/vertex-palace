import type { LoadLevel } from "@vertex-palace/shared";

export const LOAD_LEVEL_ORDER: LoadLevel[] = [
  "full_file",
  "full_symbol",
  "snippet",
  "signature",
  "summary",
  "defer"
];

export function downgradeLoadLevel(level: LoadLevel): LoadLevel {
  const index = LOAD_LEVEL_ORDER.indexOf(level);
  return LOAD_LEVEL_ORDER[Math.min(index + 1, LOAD_LEVEL_ORDER.length - 1)] ?? "defer";
}
