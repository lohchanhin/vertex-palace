import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { palaceEvaluate } from "@vertex-palace/core";
import { parseReferencePolicy } from "./format";

export function registerEvaluate(program: Command): void {
  program
    .command("evaluate")
    .alias("eval")
    .description("Measure context savings, changed-file coverage, and route confidence calibration")
    .argument("<task...>", "Task to evaluate")
    .option("-r, --root <path>", "Repository root")
    .option("--route-id <id>", "Evaluate an existing route instead of planning a new one")
    .option("-c, --changed-file <path>", "Actual changed file; repeat for each file", collectChangedFile, [])
    .option("--core-file <path>", "Core implementation or focused test truth; repeat for each file", collectChangedFile)
    .option("--declared-auxiliary-file <path>", "Auxiliary truth explicitly required by the task; repeat for each file", collectChangedFile)
    .option("--latent-auxiliary-file <path>", "Hidden-diff or convention-only auxiliary truth; repeat for each file", collectChangedFile)
    .option("-b, --budget <tokens>", "Input token budget", parseInt)
    .option("-l, --route-limit <count>", "Maximum route steps", parseInt)
    .option("-d, --max-drawers <count>", "Maximum drawers in the measured pack", parseInt)
    .option("--references <policy>", "Resolve opaque GitHub references: auto or off", parseReferencePolicy, "auto")
    .option("--json", "Print raw JSON instead of Markdown")
    .option("--out <path>", "Write output to a file instead of stdout")
    .action(async (taskParts: string[], options) => {
      const evaluation = await palaceEvaluate({
        root: options.root,
        task: taskParts.join(" "),
        routeId: options.routeId,
        changedFiles: options.changedFile,
        coreFiles: options.coreFile,
        declaredAuxiliaryFiles: options.declaredAuxiliaryFile,
        latentAuxiliaryFiles: options.latentAuxiliaryFile,
        budget: options.budget,
        routeLimit: options.routeLimit,
        maxDrawers: options.maxDrawers,
        referencePolicy: options.references
      });
      const output = options.json ? `${JSON.stringify(evaluation, null, 2)}\n` : evaluation.markdown;
      await writeOutput(output, options.out);
    });
}

export function collectChangedFile(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

async function writeOutput(content: string, outputPath?: string): Promise<void> {
  if (!outputPath) {
    process.stdout.write(content.endsWith("\n") ? content : `${content}\n`);
    return;
  }
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}
