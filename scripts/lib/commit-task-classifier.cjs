const FEATURE_PREFIX = /^\s*(?:add(?:ed|ing|s)?|allow(?:ed|ing|s)?|creat(?:e|ed|ing|es)|implement(?:ed|ing|s)?|introduc(?:e|ed|ing|es)|support(?:ed|ing|s)?|enabl(?:e|ed|ing|es))\b/i;
const BUGFIX_PREFIX = /^\s*(?:fix(?:ed|es|ing)?|debug(?:ged|ging|s)?|repair(?:ed|ing|s)?|correct(?:ed|ing|s)?|resolv(?:e|ed|ing|es)|prevent(?:ed|ing|s)?|avoid(?:ed|ing|s)?)\b/i;

function classifyTaskType(subject) {
  const conventional = subject.match(/^\s*(fix|feat)(?:\([^)]*\))?!?:/i);
  if (conventional?.[1].toLowerCase() === "fix") return "bugfix";
  if (conventional?.[1].toLowerCase() === "feat") return "feature";
  if (FEATURE_PREFIX.test(subject)) return "feature";
  if (BUGFIX_PREFIX.test(subject)) return "bugfix";
  return null;
}

module.exports = { classifyTaskType };
