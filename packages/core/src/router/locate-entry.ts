import type { PalaceFloor, TaskType } from "@vertex-palace/shared";
import type { TaskAnalysis } from "./analyze-task";

export function floorTemplate(taskType: TaskType): PalaceFloor[] {
  switch (taskType) {
    case "bugfix":
      return ["06-runtime", "03-implementation", "05-verification"];
    case "feature":
      return ["01-business", "02-interface", "03-implementation", "05-verification"];
    case "refactor":
      return ["03-implementation", "05-verification", "07-memory"];
    case "test":
      return ["05-verification", "03-implementation"];
    case "explain":
      return ["00-entrance", "03-implementation", "01-business"];
    case "review":
      return ["03-implementation", "05-verification", "07-memory"];
    default:
      return ["00-entrance", "03-implementation", "05-verification"];
  }
}

export function locateEntry(taskType: TaskType, analysis: TaskAnalysis): { floor: PalaceFloor; wing?: string; room?: string } {
  const floors = floorTemplate(taskType);
  return {
    floor: floors[0],
    wing: analysis.wingHints[0],
    room: analysis.roomHints[0]
  };
}
