import { describe, expect, it } from "vitest";
import { expandedTaskAcronyms } from "../src/utils/lexical-acronyms";

describe("expandedTaskAcronyms", () => {
  it("matches a task acronym to contiguous symbol words", () => {
    expect(expandedTaskAcronyms(
      "Support TSR when wildcard follows named param",
      "TestTreeTrailingSlashRedirect"
    )).toEqual(new Set(["tsr"]));
  });

  it("does not claim expansion when the acronym is already literal", () => {
    expect(expandedTaskAcronyms(
      "Expose the negotiated TLS version",
      "test_tls_info"
    )).toEqual(new Set());
  });

  it("ignores short and non-contiguous initialisms", () => {
    expect(expandedTaskAcronyms("Improve AI routing", "ArgumentIndexer")).toEqual(new Set());
    expect(expandedTaskAcronyms("Support TSR routing", "TrailingNamedSlashRedirect")).toEqual(new Set());
  });
});
