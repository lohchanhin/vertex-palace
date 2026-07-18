import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { palaceContext } from "@vertex-palace/core";

export function registerContext(program: Command): void {
  program
    .command("context")
    .alias("task")
    .description("Prepare compact task context in one call (auto init, index, route, and pack)")
    .argument("<task...>", "Task to prepare")
    .option("-r, --root <path>", "Repository root")
    .option("-b, --budget <tokens>", "Input token budget", parseInt)
    .option("-f, --format <format>", "markdown or json", "markdown")
    .option("-l, --route-limit <count>", "Maximum route steps", parseInt)
    .option("-d, --max-drawers <count>", "Maximum drawers to include", parseInt)
    .option("--out <path>", "Write output to a file instead of stdout")
    .action(async (taskParts: string[], options) => {
      const output = await palaceContext({
        root: options.root,
        task: taskParts.join(" "),
        budget: options.budget,
        format: options.format === "json" ? "json" : "markdown",
        routeLimit: options.routeLimit,
        maxDrawers: options.maxDrawers
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
