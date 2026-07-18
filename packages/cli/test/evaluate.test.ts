import { describe, expect, it } from "vitest";
import { collectChangedFile } from "../src/commands/evaluate";

describe("collectChangedFile", () => {
  it("keeps every repeated changed-file option", () => {
    const first = collectChangedFile("src/auth.ts", []);
    const second = collectChangedFile("tests/auth.test.ts", first);

    expect(second).toEqual(["src/auth.ts", "tests/auth.test.ts"]);
  });
});
