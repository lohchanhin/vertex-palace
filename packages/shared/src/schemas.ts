import { z } from "zod";

export const RootInputSchema = z.object({
  root: z.string().optional()
});

export const TaskInputSchema = RootInputSchema.extend({
  task: z.string().min(1),
  budget: z.number().int().positive().optional(),
  format: z.enum(["markdown", "json"]).optional()
});

export const MemoryInputSchema = RootInputSchema.extend({
  client: z.string().optional(),
  task: z.string().min(1),
  routeId: z.string().optional(),
  outcome: z.enum(["success", "failed", "partial"]),
  changedFiles: z.array(z.string()).optional(),
  testsRun: z
    .array(
      z.object({
        command: z.string(),
        status: z.enum(["passed", "failed", "skipped"]),
        summary: z.string().optional()
      })
    )
    .optional(),
  decisions: z.array(z.string()).optional(),
  failedAttempts: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export const OpenInputSchema = RootInputSchema.extend({
  nodeId: z.string().optional(),
  palacePath: z.string().optional(),
  loadLevel: z
    .enum(["summary", "signature", "snippet", "full_symbol", "full_file", "defer"])
    .optional()
});
