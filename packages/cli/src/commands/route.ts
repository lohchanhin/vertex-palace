import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { palaceRoute } from "@context-palace/core";
import { printLines } from "./format";

export function registerRoute(program: Command): void {
  program
    .command("route")
    .description("Plan a Context Palace route for a task")
    .argument("<task...>", "Task to route")
    .option("-r, --root <path>", "Repository root")
    .option("-b, --budget <tokens>", "Input token budget", parseInt)
    .option("-l, --limit <count>", "Maximum route steps", parseInt)
    .option("--compact", "Hide excluded areas in text output")
    .option("--out <path>", "Write output to a file instead of stdout")
    .option("--json", "Print raw JSON")
    .action(async (taskParts: string[], options) => {
      const route = await palaceRoute({ root: options.root, task: taskParts.join(" "), budget: options.budget, routeLimit: options.limit });
      if (options.json) {
        await writeOutput(`${JSON.stringify(route, null, 2)}\n`, options.out);
        return;
      }
      const lines = [
        `Task type: ${route.taskType}`,
        `Entry: ${route.entry.floor}${route.entry.wing ? `/${route.entry.wing}` : ""}${route.entry.room ? `/${route.entry.room}` : ""}`,
        `Confidence: ${route.confidence}`,
        "",
        "Route:",
        ...route.route.map((step, index) => `${index + 1}. ${step.sourcePath}\n   Reason: ${step.reason}\n   Load: ${step.loadLevel}`),
        ...(options.compact
          ? []
          : ["", "Excluded:", ...(route.excluded.length ? route.excluded.map((item) => `- ${item.sourcePath}: ${item.reason}`) : ["- None"])])
      ];
      if (options.out) await writeOutput(`${lines.join("\n")}\n`, options.out);
      else printLines(lines);
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
