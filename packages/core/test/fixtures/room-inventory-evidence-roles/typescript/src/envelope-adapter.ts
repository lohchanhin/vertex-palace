import { compileEnvelope } from "./envelope";

export function handleEnvelope(header: string): string {
  return compileEnvelope(header);
}
