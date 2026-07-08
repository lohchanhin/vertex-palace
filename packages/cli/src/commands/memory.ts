import type { Command } from "commander";
import { palaceWriteMemory } from "@vertex-palace/core";
import { printJson } from "./format";

export function registerMemory(program: Command): void {
  const memory = program.command("memory").description("Read and write Vertex Palace memory");
  memory
    .command("write")
    .description("Write route memory")
    .requiredOption("-t, --task <task>", "Task summary")
    .requiredOption("-o, --outcome <outcome>", "success, failed, or partial")
    .option("-r, --root <path>", "Repository root")
    .option("-c, --client <client>", "Client or tenant label for multi-client memory")
    .option("--route-id <id>", "Route id")
    .option("--changed-file <path...>", "Changed files")
    .option("--decision <text...>", "Decision notes")
    .option("--failed-attempt <text...>", "Failed attempt notes")
    .option("--test <entry...>", "Test run as command|passed|summary, command|failed|summary, or command|skipped|summary")
    .option("--tag <tag...>", "Memory tags")
    .option("--notes <text>", "Additional notes")
    .action(async (options) => {
      printJson(
        await palaceWriteMemory({
          root: options.root,
          client: options.client,
          task: options.task,
          routeId: options.routeId,
          outcome: options.outcome,
          changedFiles: options.changedFile,
          testsRun: parseTestRuns(options.test),
          decisions: options.decision,
          failedAttempts: options.failedAttempt,
          tags: options.tag,
          notes: options.notes
        })
      );
    });
}

function parseTestRuns(entries?: string[]): Array<{ command: string; status: "passed" | "failed" | "skipped"; summary?: string }> | undefined {
  if (!entries?.length) return undefined;
  return entries.map((entry) => {
    const [command = entry, rawStatus = "passed", ...summaryParts] = entry.split("|");
    const status = rawStatus === "failed" || rawStatus === "skipped" ? rawStatus : "passed";
    return {
      command: command.trim(),
      status,
      summary: summaryParts.join("|").trim() || undefined
    };
  });
}
