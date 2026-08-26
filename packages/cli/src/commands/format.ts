export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function printLines(lines: string[]): void {
  process.stdout.write(`${lines.join("\n")}\n`);
}

export function parseReferencePolicy(value: string): "auto" | "off" {
  if (value === "auto" || value === "off") return value;
  throw new Error(`Unknown reference policy: ${value}`);
}
