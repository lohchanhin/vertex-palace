import { describe, expect, it } from "vitest";
import { normalizeLexicalToken, tokenizeLexical } from "../src/utils/lexical-tokens";

describe("lexical token normalization", () => {
  it("normalizes dropped-e and doubled-consonant inflections without changing unrelated nouns", () => {
    expect(normalizeLexicalToken("cloning")).toBe("clone");
    expect(normalizeLexicalToken("cloned")).toBe("cloned");
    expect(normalizeLexicalToken("running")).toBe("run");
    expect(normalizeLexicalToken("flagged")).toBe("flag");
    expect(normalizeLexicalToken("sorting")).toBe("sorting");
    expect(normalizeLexicalToken("formatting")).toBe("formatting");
    expect(normalizeLexicalToken("discriminated")).toBe("discriminated");
    expect(normalizeLexicalToken("missing")).toBe("missing");
    expect(normalizeLexicalToken("changing")).toBe("changing");
    expect(normalizeLexicalToken("parsing")).toBe("parsing");
    expect(normalizeLexicalToken("string")).toBe("string");
    expect(normalizeLexicalToken("status")).toBe("status");
    expect(normalizeLexicalToken("statuses")).toBe("status");
  });

  it("gives inflected task language the same token as a module stem", () => {
    expect([...tokenizeLexical("Fix cloning subclassed errors")]).toEqual(
      expect.arrayContaining(["fix", "clone", "subclassed", "error"])
    );
  });
});
