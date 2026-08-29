import { parseEnvelopeHeader } from "./envelope-parser";
import { legacyEnvelopeDefaults } from "./legacy-envelope";

export function compileEnvelope(header: string): string {
  const parsed = parseEnvelopeHeader(header);
  return `${legacyEnvelopeDefaults().prefix}:${parsed}`;
}
