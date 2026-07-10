import type { TaskType } from "@vertex-palace/shared";

export function classifyTask(task: string): TaskType {
  const lower = task.toLowerCase();
  if (/(修复|修正|修補|修补|错误|錯誤|失敗|失败|异常|異常|崩溃|崩潰|破图|破圖|問題|问题|bug)/.test(lower)) return "bugfix";
  if (/(新增|增加|建立|创建|創建|实现|實作|支援|支持|功能|追加|加入)/.test(lower)) return "feature";
  if (/(重构|重構|整理|清理|简化|簡化|改名|优化|優化|提升|改善|改进|改進|减少|減少|降低|控制)/.test(lower)) return "refactor";
  if (/(测试|測試|规格|規格|覆盖率|覆蓋率|fixture|驗證|验证)/.test(lower)) return "test";
  if (/(解释|解釋|说明|說明|为什么|為什麼|如何|怎么|怎麼|总结|總結|差异|差異)/.test(lower)) return "explain";
  if (/(审核|審核|检查|檢查|审查|審查|风险|風險|安全|review|audit)/.test(lower)) return "review";
  if (/\b(fix|error|failed|failing|bug|exception|stack|crash|broken)\b/.test(lower)) return "bugfix";
  if (/\b(add|create|implement|build|support|new)\b/.test(lower)) return "feature";
  if (/\b(refactor|cleanup|restructure|simplify|rename|optimize|optimise|improve|enhance|reduce|control|tune)\b/.test(lower)) return "refactor";
  if (/\b(test|spec|coverage|fixture)\b/.test(lower)) return "test";
  if (/\b(explain|how|why|what|describe|summarize)\b/.test(lower)) return "explain";
  if (/\b(review|audit|security|risk)\b/.test(lower)) return "review";
  return "unknown";
}
