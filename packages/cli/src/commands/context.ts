import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { palaceContext, serializePackOutput, type PalaceMode } from "@vertex-palace/core";

export function registerContext(program: Command): void {
  program
    .command("context")
    .alias("task")
    .description("Prepare task context in one call; use --auto for adaptive routing and packing")
    .argument("<task...>", "Task to prepare")
    .option("-r, --root <path>", "Repository root")
    .option("-b, --budget <tokens>", "Input token budget", parseInt)
    .option("-f, --format <format>", "markdown or json", "markdown")
    .option("-l, --route-limit <count>", "Maximum route steps", parseInt)
    .option("-d, --max-drawers <count>", "Maximum drawers to include", parseInt)
    .option("--auto", "Select bypass, route-lite, full-palace, or guarded-memory-palace automatically")
    .option(
      "--mode <mode>",
      "Force an adaptive mode for repeatable tests",
      parsePalaceMode
    )
    .option("--out <path>", "Write output to a file instead of stdout")
    .action(async (taskParts: string[], options) => {
      const output = await palaceContext({
        root: options.root,
        task: taskParts.join(" "),
        budget: options.budget,
        format: options.format === "json" ? "json" : "markdown",
        routeLimit: options.routeLimit,
        maxDrawers: options.maxDrawers,
        auto: options.auto,
        mode: options.mode
      });
      await writeOutput(serializePackOutput(output), options.out);
    });
}

function parsePalaceMode(value: string): PalaceMode {
  if (["bypass", "route-lite", "full-palace", "guarded-memory-palace"].includes(value)) {
    return value as PalaceMode;
  }
  throw new Error(`Unknown Palace mode: ${value}`);
}

async function writeOutput(content: string, outputPath?: string): Promise<void> {
  if (!outputPath) {
    process.stdout.write(content);
    return;
  }
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}
