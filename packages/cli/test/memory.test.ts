import { describe, expect, it } from "vitest";
import { parseTestRuns } from "../src/commands/memory";

describe("parseTestRuns", () => {
  it("parses status from the right so command pipes and colons stay intact", () => {
    const runs = parseTestRuns(["pnpm test | tee test.log: off|passed|all checks"]);

    expect(runs).toEqual([
      {
        command: "pnpm test | tee test.log: off",
        status: "passed",
        summary: "all checks"
      }
    ]);
  });
});
