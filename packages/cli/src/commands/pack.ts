import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { palacePack } from "@vertex-palace/core";

export function registerPack(program: Command): void {
  program
    .command("pack")
    .description("Build a Markdown or JSON context pack for a task")
    .argument("<task...>", "Task to pack")
    .option("-r, --root <path>", "Repository root")
    .option("-b, --budget <tokens>", "Input token budget", parseInt)
    .option("-f, --format <format>", "markdown or json", "markdown")
    .option("-l, --route-limit <count>", "Maximum route steps", parseInt)
    .option("-d, --max-drawers <count>", "Maximum drawers to include in the pack", parseInt)
    .option("--compact", "Omit excluded areas from Markdown packs")
    .option("--out <path>", "Write output to a file instead of stdout")
    .action(async (taskParts: string[], options) => {
      const output = await palacePack({
        root: options.root,
        task: taskParts.join(" "),
        budget: options.budget,
        format: options.format === "json" ? "json" : "markdown",
        routeLimit: options.routeLimit,
        maxDrawers: options.maxDrawers,
        includeExcluded: !options.compact
      });
      await writeOutput(output.markdown ?? `${JSON.stringify(output.json, null, 2)}\n`, options.out);
    });
}

async function writeOutput(content: string, outputPath?: string): Promise<void> {
  if (!outputPath) {
    process.stdout.write(content);
    return;
  }
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}
