import { describe, expect, it } from "vitest";
import { collectChangedFile } from "../src/commands/evaluate";

describe("collectChangedFile", () => {
  it("starts a repeated option when Commander has no default array", () => {
    expect(collectChangedFile("src/auth.ts", undefined)).toEqual(["src/auth.ts"]);
  });

  it("keeps every repeated changed-file option", () => {
    const first = collectChangedFile("src/auth.ts", []);
    const second = collectChangedFile("tests/auth.test.ts", first);

    expect(second).toEqual(["src/auth.ts", "tests/auth.test.ts"]);
  });
});
