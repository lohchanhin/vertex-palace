import type { PalaceFloor } from "@vertex-palace/shared";
import { palacePath, slugify } from "../utils/path-utils";

export function makePalaceAddress(input: {
  floor: PalaceFloor;
  wing?: string;
  room?: string;
  cabinet?: string;
  drawer?: string;
}): string {
  return palacePath(
    input.floor,
    input.wing ? slugify(input.wing) : undefined,
    input.room ? slugify(input.room) : undefined,
    input.cabinet ? slugify(input.cabinet) : undefined,
    input.drawer ? slugify(input.drawer) : undefined
  );
}
