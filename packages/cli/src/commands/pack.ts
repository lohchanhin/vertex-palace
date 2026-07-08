import type { Command } from "commander";
import { palacePack } from "@context-palace/core";

export function registerPack(program: Command): void {
  program
    .command("pack")
    .description("Build a Markdown or JSON context pack for a task")
    .argument("<task...>", "Task to pack")
    .option("-r, --root <path>", "Repository root")
    .option("-b, --budget <tokens>", "Input token budget", parseInt)
    .option("-f, --format <format>", "markdown or json", "markdown")
    .action(async (taskParts: string[], options) => {
      const output = await palacePack({
        root: options.root,
        task: taskParts.join(" "),
        budget: options.budget,
        format: options.format === "json" ? "json" : "markdown"
      });
      process.stdout.write(output.markdown ?? `${JSON.stringify(output.json, null, 2)}\n`);
    });
}
