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
  it("does not let safely rejected stale memory force guarded mode", () => {
    const task = "Fix the stale v1 migration behavior in src/format-currency.mjs after the old memory expired.";
    const memoryPreflight = {
      decision: "stale_rejected",
      candidates: 2,
      included: 0,
      excluded: [
        { id: "old-1", reason: "expired" },
        { id: "old-2", reason: "expired" }
      ],
      candidateIds: ["old-1", "old-2"],
      includedIds: [],
      currentRelevantCount: 0,
      rejectedStaleCount: 2,
      rejectedScopeCount: 0,
      conflictCount: 0,
      requiresGuardedDelivery: false,
      items: [],
      estimatedTokens: 0
    };
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, {
      memoryPreflight
    } as unknown as Parameters<typeof selectPalaceMode>[3]);

    expect(selection.mode).toBe("bypass");
  });

  it("keeps current decision memory in a memory-bearing guarded mode", () => {
    const task = "Use the historical tenant decision for Aurora and keep shared behavior isolated.";
    const memoryPreflight = {
      decision: "current_memory_available",
      candidates: 1,
      included: 1,
      excluded: [],
      candidateIds: ["aurora-owner"],
      includedIds: ["aurora-owner"],
      currentRelevantCount: 1,
      rejectedStaleCount: 0,
      rejectedScopeCount: 0,
      conflictCount: 0,
      requiresGuardedDelivery: true,
      items: [{ id: "aurora-owner" }],
      estimatedTokens: 20
    };
    const selection = selectPalaceMode(smallIndex(120), focusedRoute(), task, {
      memoryPreflight
    } as unknown as Parameters<typeof selectPalaceMode>[3]);

    expect(selection.mode).toBe("guarded-memory-palace");
    expect(selection.memoryLevel).toBe("guarded-evidence");
  });

  it("does not silently narrow an explicit decision-memory task when no candidate exists", () => {
    const task = "Use the historical ownership decision to fix the tenant token without changing shared behavior.";
    const memoryPreflight = {
      decision: "none",
      candidates: 0,
      included: 0,
      excluded: [],
      candidateIds: [],
      includedIds: [],
      currentRelevantCount: 0,
      rejectedStaleCount: 0,
      rejectedScopeCount: 0,
      conflictCount: 0,
      requiresGuardedDelivery: true,
      items: [],
      estimatedTokens: 0
    };
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, {
      memoryPreflight
    } as unknown as Parameters<typeof selectPalaceMode>[3]);

    expect(selection.mode).toBe("guarded-memory-palace");
  });

  it("bypasses a high-confidence single-file task after memory is confirmed absent", () => {
    const task = "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, { relevantMemoryCount: 0 });

    expect(selection.mode).toBe("bypass");
    expect(selection.riskSignals.publicContractRisk).toBe(false);
    expect(selection.riskSignals.scopeRisk).toBe(false);
  });

  it("treats preserving a public response contract as a guard, not a contract change", () => {
    const task = "Fix currency formatting and preserve the public response contract.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, { relevantMemoryCount: 0 });

    expect(selection.mode).toBe("bypass");
    expect(selection.riskSignals.publicContractRisk).toBe(false);
  });

  it("does not bypass when relevant project memory exists", () => {
    const task = "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, { relevantMemoryCount: 1 });

    expect(selection.mode).toBe("full-palace");
    expect(selection.memoryLevel).toBe("scoped-summary");
    expect(selection.reasons).toContain("1 relevant memory item(s) require scoped delivery before narrowing context.");
  });

  it("does not bypass repository-wide work even when the route has one primary file", () => {
    const task = "Fix currency formatting across the repository and update all callers.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, { relevantMemoryCount: 0 });

    expect(selection.mode).toBe("full-palace");
    expect(selection.riskSignals.scopeRisk).toBe(true);
  });

  it("does not bypass an explicit verification-file change", () => {
    const task = "Fix redirect authorization handling and update the focused regression tests.";
    const selection = selectPalaceMode(smallIndex(123), focusedRoute(0.73), task, { relevantMemoryCount: 0 });

    expect(selection.mode).toBe("full-palace");
    expect(selection.riskSignals.verificationChangeRisk).toBe(true);
    expect(selection.reasons).toContain("The task explicitly requests verification-file changes.");
  });

  it("still bypasses when tests must pass without being changed", () => {
    const task = "Fix currency formatting and make the complete test suite pass without changing tests.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task, { relevantMemoryCount: 0 });

    expect(selection.mode).toBe("bypass");
    expect(selection.riskSignals.verificationChangeRisk).toBe(false);
  });

  it("keeps actual public contract changes in full-palace mode", () => {
    const task = "Update the public API contract for currency formatting while preserving backward compatibility.";
    const selection = selectPalaceMode(smallIndex(), focusedRoute(), task);

    expect(selection.mode).toBe("full-palace");
    expect(selection.riskSignals.publicContractRisk).toBe(true);
  });

  it("keeps scoped memory enabled when a large repository selects full-palace", () => {
    const task = "Fix the Aurora article hero contrast regression while preserving the appearance of every other tenant.";
    const selection = selectPalaceMode(smallIndex(120), focusedRoute(), task);

    expect(selection.mode).toBe("full-palace");
    expect(selection.memoryLevel).toBe("scoped-summary");
    expect(selection.disabledSections).not.toContain("memory");
  });
});
