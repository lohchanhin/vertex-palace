export class PalaceError extends Error {
  constructor(message: string, readonly code = "PALACE_ERROR") {
    super(message);
    this.name = "PalaceError";
  }
}

export function assertPalace(condition: unknown, message: string, code?: string): asserts condition {
  if (!condition) {
    throw new PalaceError(message, code);
  }
}
