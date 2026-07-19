import type { PalaceIndex, PalaceRoute } from "@vertex-palace/shared";
import { describe, expect, it } from "vitest";
import { selectPalaceMode } from "../src/router/mode-selector";

function smallIndex(fileCount = 11): PalaceIndex {
  return {
    fileHashes: Object.fromEntries(
      Array.from({ length: fileCount }, (_, index) => [`src/file-${index}.ts`, `hash-${index}`])
    )
  } as unknown as PalaceIndex;
}

function focusedRoute(confidence = 0.53): PalaceRoute {
  return {
    confidence,
    taskType: "bugfix",
    route: [
      {
        sourcePath: "src/format-currency.mjs",
        priority: 1,
        tier: "primary"
      }
    ]
  } as unknown as PalaceRoute;
}

describe("selectPalaceMode", () => {
  it("uses route-lite for a small focused task that preserves the public API", () => {
    const task = "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task);

    expect(selection.mode).toBe("route-lite");
    expect(selection.riskSignals.publicContractRisk).toBe(false);
  });

  it("keeps actual public contract changes in full-palace mode", () => {
    const task = "Update the public API contract for currency formatting while preserving backward compatibility.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task);

    expect(selection.mode).toBe("full-palace");
    expect(selection.riskSignals.publicContractRisk).toBe(true);
  });
});
