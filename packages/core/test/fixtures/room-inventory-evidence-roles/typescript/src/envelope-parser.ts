export function parseEnvelopeHeader(header: string): string {
  if (!header.trim()) throw new Error("empty envelope header");
  return header.trim().toLowerCase();
}
