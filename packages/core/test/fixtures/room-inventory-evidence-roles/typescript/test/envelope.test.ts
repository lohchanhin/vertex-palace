import { compileEnvelope } from "../src/envelope";

export function testCompileEnvelopeRejectsMalformedHeaders(): boolean {
  try {
    compileEnvelope("   ");
    return false;
  } catch {
    return true;
  }
}
