import { tokenizeLexical } from "./lexical-tokens";

export function expandedTaskAcronyms(task: string, candidate: string): Set<string> {
  const acronyms = (task.match(/\b[A-Z]{3,6}\b/g) ?? []).map((value) => value.toLowerCase());
  if (!acronyms.length) return new Set();
  const sequence = [...tokenizeLexical(candidate)].filter((token) => token.length > 1);
  return new Set(acronyms.filter((acronym) => {
    if (sequence.includes(acronym)) return false;
    return sequence.some((_, index) => sequence
      .slice(index, index + acronym.length)
      .map((token) => token[0])
      .join("") === acronym);
  }));
}
