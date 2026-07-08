import type { PalaceConfig, PalaceFloor } from "@context-palace/shared";

export const PALACE_SCHEMA_VERSION = 1;

export const PALACE_FLOORS: PalaceFloor[] = [
  "00-entrance",
  "01-business",
  "02-interface",
  "03-implementation",
  "04-data",
  "05-verification",
  "06-runtime",
  "07-memory"
];

export const DEFAULT_IGNORE = [
  ".git",
  ".git/**",
  "node_modules",
  "node_modules/**",
  "dist",
  "dist/**",
  "build",
  "build/**",
  "coverage",
  "coverage/**",
  ".next",
  ".next/**",
  ".turbo",
  ".turbo/**",
  ".cache",
  ".cache/**",
  ".palace",
  ".palace/**",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "*.log",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.cert",
  "*.p12",
  "*.pfx",
  "id_rsa",
  "id_ed25519",
  "*.sqlite",
  "*.db"
];

export const DEFAULT_BUDGET = {
  maxInputTokens: 12000,
  reservedOutputTokens: 4000,
  routeSummaryTokens: 2000,
  roomSummaryTokens: 4000,
  codeSnippetTokens: 8000,
  memoryTokens: 2000,
  bufferTokens: 1000
};

export function createDefaultConfig(projectName: string, now = new Date().toISOString()): PalaceConfig {
  return {
    schema_version: PALACE_SCHEMA_VERSION,
    project_name: projectName,
    created_at: now,
    updated_at: now,
    source_root: ".",
    palace_root: ".palace",
    ignore: DEFAULT_IGNORE,
    language: {
      primary: "auto",
      parsers: {
        typescript: true,
        javascript: true,
        markdown: true,
        json: true,
        fallback: true
      }
    },
    floors: PALACE_FLOORS
  };
}
