import type { Command } from "commander";
import { palaceWriteMemory } from "@context-palace/core";
import { printJson } from "./format";

export function registerMemory(program: Command): void {
  const memory = program.command("memory").description("Read and write Context Palace memory");
  memory
    .command("write")
    .description("Write route memory")
    .requiredOption("-t, --task <task>", "Task summary")
    .requiredOption("-o, --outcome <outcome>", "success, failed, or partial")
    .option("-r, --root <path>", "Repository root")
    .option("--route-id <id>", "Route id")
    .option("--changed-file <path...>", "Changed files")
    .option("--decision <text...>", "Decision notes")
    .option("--failed-attempt <text...>", "Failed attempt notes")
    .option("--notes <text>", "Additional notes")
    .action(async (options) => {
      printJson(
        await palaceWriteMemory({
          root: options.root,
          task: options.task,
          routeId: options.routeId,
          outcome: options.outcome,
          changedFiles: options.changedFile,
          decisions: options.decision,
          failedAttempts: options.failedAttempt,
          notes: options.notes
        })
      );
    });
}
