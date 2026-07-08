import type { TaskType } from "@context-palace/shared";

export function classifyTask(task: string): TaskType {
  const lower = task.toLowerCase();
  if (/\b(fix|error|failed|failing|bug|exception|stack|crash|broken)\b/.test(lower)) return "bugfix";
  if (/\b(add|create|implement|build|support|new)\b/.test(lower)) return "feature";
  if (/\b(refactor|cleanup|restructure|simplify|rename)\b/.test(lower)) return "refactor";
  if (/\b(test|spec|coverage|fixture)\b/.test(lower)) return "test";
  if (/\b(explain|how|why|what|describe|summarize)\b/.test(lower)) return "explain";
  if (/\b(review|audit|security|risk)\b/.test(lower)) return "review";
  return "unknown";
}
