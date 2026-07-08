import { slugify } from "../utils/path-utils";

export type TaskAnalysis = {
  raw: string;
  keywords: string[];
  wingHints: string[];
  roomHints: string[];
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "for",
  "and",
  "or",
  "of",
  "in",
  "on",
  "this",
  "that",
  "with",
  "before",
  "after",
  "fix",
  "bug",
  "issue",
  "problem",
  "error",
  "errors",
  "required",
  "requires",
  "rule",
  "rules",
  "should",
  "need",
  "needs"
]);
const WING_HINTS = new Set(["auth", "billing", "payment", "admin", "user", "users", "profile", "checkout", "token", "session"]);
const ROOM_HINTS = new Set(["login", "logout", "token", "refresh", "password", "session", "profile", "checkout", "general"]);

export function analyzeTask(task: string): TaskAnalysis {
  const keywords = [
    ...new Set(
      task
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map(slugify)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    )
  ];
  return {
    raw: task,
    keywords,
    wingHints: keywords.filter((keyword) => WING_HINTS.has(keyword)),
    roomHints: keywords.filter((keyword) => ROOM_HINTS.has(keyword))
  };
}
