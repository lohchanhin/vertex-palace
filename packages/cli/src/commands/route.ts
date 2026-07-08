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
    .option("--json", "Print raw JSON")
    .action(async (taskParts: string[], options) => {
      const route = await palaceRoute({ root: options.root, task: taskParts.join(" "), budget: options.budget });
      if (options.json) {
        process.stdout.write(`${JSON.stringify(route, null, 2)}\n`);
        return;
      }
      printLines([
        `Task type: ${route.taskType}`,
        `Entry: ${route.entry.floor}${route.entry.wing ? `/${route.entry.wing}` : ""}${route.entry.room ? `/${route.entry.room}` : ""}`,
        `Confidence: ${route.confidence}`,
        "",
        "Route:",
        ...route.route.map((step, index) => `${index + 1}. ${step.sourcePath}\n   Reason: ${step.reason}\n   Load: ${step.loadLevel}`),
        "",
        "Excluded:",
        ...(route.excluded.length ? route.excluded.map((item) => `- ${item.sourcePath}: ${item.reason}`) : ["- None"])
      ]);
    });
}
