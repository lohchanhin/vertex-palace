import type { TaskType } from "@vertex-palace/shared";
import { analyzePublicationIntent } from "./publication-intent";

export function classifyTask(task: string): TaskType {
  const lower = task.toLowerCase();
  if (/\b(evaluate|evaluation|assessment|retrospective|postmortem|score|rating|grade|feedback|lessons|tooling memory)\b/.test(lower)) return "evaluation";
  if (/(回顾|回顧|复盘|復盤|评估|評估|评价|評價|评分|評分|打分|总结|總結|结论|結論|整体评价|整體評價)/.test(lower)) return "evaluation";
  const publication = analyzePublicationIntent(lower);
  const {
    releaseIntent,
    releaseArtifactReference,
    evidenceMaintenance,
    evidenceSubject,
    evidenceArtifact
  } = publication;
  const repairIntent = /\b(fix|debug|repair|correct|resolve)\b/.test(lower)
    || /(修复|修正|修補|修补|纠正|糾正|解决|解決)/.test(lower);
  if (
    !releaseIntent
    && !repairIntent
    && evidenceMaintenance
    && ((evidenceSubject && evidenceArtifact) || releaseArtifactReference)
  ) return "evaluation";
  const releaseFailure = releaseIntent
    && (/\b(fix|debug|investigate|resolve)\b/.test(lower) || /(修复|修正|修補|修补|调查|調查|解决|解決)/.test(lower))
    && (/\b(error|failed|failing|failure|broken|unauthorized|e401|otp|2fa)\b/.test(lower) || /(?:错误|錯誤|失败|失敗|未授权|未授權)/.test(lower));
  if (releaseFailure) return "bugfix";
  if (releaseIntent && (/^\s*(explain|describe|summarize|how|why|what)\b|\bhow\s+to\b/.test(lower) || /^\s*(解释|解釋|说明|說明|如何|为什么|為什麼)/.test(lower))) return "explain";
  if (releaseIntent && (/^\s*(review|audit|inspect|check)\b/.test(lower) || /^\s*(审核|審核|审查|審查|检查|檢查)/.test(lower))) return "review";
  if (releaseIntent && (/^\s*(test|verify|validate)\b/.test(lower) || /^\s*(测试|測試|验证|驗證)/.test(lower))) return "test";
  if (releaseIntent) return "release";
  if (repairIntent) return "bugfix";
  if (/(修复|修正|修補|修补|错误|錯誤|失敗|失败|异常|異常|崩溃|崩潰|破图|破圖|問題|问题|bug)/.test(lower)) return "bugfix";
  if (/(新增|增加|建立|创建|創建|实现|實作|支援|支持|功能|追加|加入)/.test(lower)) return "feature";
  if (/(重构|重構|整理|清理|简化|簡化|改名|优化|優化|提升|改善|改进|改進|减少|減少|降低|控制)/.test(lower)) return "refactor";
  if (/(测试|測試|规格|規格|覆盖率|覆蓋率|fixture|驗證|验证)/.test(lower)) return "test";
  if (/(解释|解釋|说明|說明|为什么|為什麼|如何|怎么|怎麼|总结|總結|差异|差異)/.test(lower)) return "explain";
  if (/(审核|審核|检查|檢查|审查|審查|风险|風險|安全|review|audit)/.test(lower)) return "review";
  if (/\b(fix|error|fail|fails|failed|failing|failure|bug|exception|stack|crash|broken)\b/.test(lower)) return "bugfix";
  if (/\b(add|create|implement|build|support|new)\b/.test(lower)) return "feature";
  if (/\b(refactor|cleanup|restructure|simplify|rename|optimize|optimise|improve|enhance|reduce|control|tune)\b/.test(lower)) return "refactor";
  if (/\b(test|spec|coverage|fixture)\b/.test(lower)) return "test";
  if (/\b(explain|how|why|what|describe|summarize)\b/.test(lower)) return "explain";
  if (/\b(review|audit|security|risk)\b/.test(lower)) return "review";
  return "unknown";
}
