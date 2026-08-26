import type { TaskType } from "@vertex-palace/shared";
import { analyzePublicationIntent } from "./publication-intent";

const FEATURE_TASK_PREFIX = /^\s*(?:add(?:ed|ing|s)?|allow(?:ed|ing|s)?|creat(?:e|ed|ing|es)|implement(?:ed|ing|s)?|introduc(?:e|ed|ing|es)|support(?:ed|ing|s)?|enabl(?:e|ed|ing|es))\b/i;
const BUGFIX_TASK_PREFIX = /^\s*(?:fix(?:ed|es|ing)?|debug(?:ged|ging|s)?|repair(?:ed|ing|s)?|correct(?:ed|ing|s)?|resolv(?:e|ed|ing|es)|prevent(?:ed|ing|s)?|avoid(?:ed|ing|s)?)\b/i;

export function classifyTask(task: string): TaskType {
  const lower = task.toLowerCase();
  const publication = analyzePublicationIntent(lower);
  const conventionalCommit = lower.match(/^\s*(fix|feat)(?:\([^)]*\))?!?:/);
  if (conventionalCommit?.[1] === "fix") return "bugfix";
  if (conventionalCommit?.[1] === "feat") return "feature";
  if (!publication.releaseIntent && BUGFIX_TASK_PREFIX.test(lower)) return "bugfix";
  if (!publication.releaseIntent && FEATURE_TASK_PREFIX.test(lower)) return "feature";
  const codeSubject = /\b(parser|indexer|router|routing|planner|scorer|analy[sz]er|expander|module|function|class|source|code|schema|types?|contracts?|tests?|regressions?|bundle|estimator|metadata|api|cli|mcp)\b/.test(lower)
    || /(解析器|索引器|路由器|任务分析|任務分析|路由评分|路由評分|路由规划|路由規劃|路由計畫|路由计划|模组|模組|函数|函式|类别|類別|源码|源碼|代码|代碼|测试|測試|回归|回歸|类型|類型|契约|契約|元数据|中繼資料)/.test(lower);
  if (!publication.releaseIntent && codeSubject && /^\s*(?:add|allow|create|implement|support)\b/.test(lower)) return "feature";
  if (!publication.releaseIntent && codeSubject && /^\s*(?:calibrat(?:e|ed|ing)|generalize|refactor|restructure|simplify|optimi[sz]e|improve|enhance)\b/.test(lower)) return "refactor";
  if (!publication.releaseIntent && codeSubject && /^\s*(?:fix|debug|repair|correct|resolve)\b/.test(lower)) return "bugfix";
  if (!publication.releaseIntent && codeSubject && /^\s*(?:新增|增加|建立|创建|創建|实现|實作|支援|支持)/.test(lower)) return "feature";
  if (!publication.releaseIntent && codeSubject && /^\s*(?:重构|重構|整理|简化|簡化|优化|優化|改善|改进|改進)/.test(lower)) return "refactor";
  if (!publication.releaseIntent && codeSubject && /^\s*(?:修复|修正|修補|修补|纠正|糾正|解决|解決)/.test(lower)) return "bugfix";
  const directedChange = !publication.releaseIntent && codeSubject
    ? classifyDirectedChange(lower)
    : undefined;
  if (directedChange) return directedChange;
  if (/\b(evaluate|evaluation|assessment|retrospective|postmortem|score|rating|grade|feedback|lessons|tooling memory)\b/.test(lower)) return "evaluation";
  if (/(回顾|回顧|复盘|復盤|评估|評估|评价|評價|评分|評分|打分|总结|總結|结论|結論|整体评价|整體評價)/.test(lower)) return "evaluation";
  if (isUsageAuditTask(lower)) return "evaluation";
  const {
    releaseIntent,
    releaseArtifactReference,
    evidenceMaintenance,
    evidenceSubject,
    evidenceArtifact
  } = publication;
  const repairIntent = BUGFIX_TASK_PREFIX.test(lower)
    || /\b(fix|debug|repair|correct|resolve)\b/.test(lower)
    || /(修复|修正|修補|修补|纠正|糾正|解决|解決)/.test(lower);
  if (
    !releaseIntent
    && !repairIntent
    && evidenceMaintenance
    && ((evidenceSubject && evidenceArtifact) || releaseArtifactReference)
  ) return "evaluation";
  const releaseFailure = releaseIntent
    && (repairIntent || /\binvestigate\b/.test(lower) || /(修复|修正|修補|修补|调查|調查|解决|解決)/.test(lower))
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
  if (/\b(add|allow|create|implement|build|support|new)\b/.test(lower)) return "feature";
  if (/\b(calibrat(?:e|ed|ing)|generalize|refactor|cleanup|restructure|simplify|rename|optimize|optimise|improve|enhance|reduce|control|tune)\b/.test(lower)) return "refactor";
  if (/\b(test|spec|coverage|fixture)\b/.test(lower)) return "test";
  if (/\b(explain|how|why|what|describe|summarize)\b/.test(lower)) return "explain";
  if (/\b(review|audit|security|risk)\b/.test(lower)) return "review";
  return "unknown";
}

export function classifyDirectedChange(task: string): TaskType | undefined {
  const completionWrapped = completionWrappedDirectedChange(task);
  if (completionWrapped) return completionWrapped;

  const chinese = task.match(
    /^\s*(?:请|請)?\s*(?:(?:将|將|把).{0,180}?)?(修复|修正|修補|修补|纠正|糾正|解决|解決|新增|增加|建立|创建|創建|实现|實作|支援|支持|重构|重構|整理|简化|簡化|优化|優化|改善|改进|改進|补齐|補齊|统一|統一|分离|分離)/
  )?.[1];
  if (chinese) {
    if (/^(?:修复|修正|修補|修补|纠正|糾正|解决|解決)$/.test(chinese)) return "bugfix";
    if (/^(?:新增|增加|建立|创建|創建|实现|實作|支援|支持)$/.test(chinese)) return "feature";
    return "refactor";
  }

  const english = task.match(
    /^\s*(?:please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+)?(?:update|fix|repair|correct|resolve|add|create|implement|support|calibrate|refactor|restructure|simplify|optimi[sz]e|improve|enhance|unify|separate)\b/i
  )?.[0].trim();
  if (!english) return undefined;
  if (/\b(?:fix|repair|correct|resolve)\b/.test(english)) return "bugfix";
  if (/\b(?:add|create|implement|support)\b/.test(english)) return "feature";
  return "refactor";
}

function completionWrappedDirectedChange(task: string): TaskType | undefined {
  const chinese = task.match(
    /^\s*(?:请|請)?\s*(?:完成|收束|落实|落實).{0,180}?(修复|修正|修補|修补|纠正|糾正|解决|解決|新增|增加|建立|创建|創建|实现|實作|重构|重構|整理|简化|簡化|优化|優化|改善|改进|改進)(?=\s*[:：;；]|\s*$)/
  )?.[1];
  if (chinese) {
    if (/^(?:修复|修正|修補|修补|纠正|糾正|解决|解決)$/.test(chinese)) return "bugfix";
    if (/^(?:新增|增加|建立|创建|創建|实现|實作)$/.test(chinese)) return "feature";
    return "refactor";
  }

  const english = task.match(
    /^\s*(?:please\s+)?(?:complete|finish|finalize|finalise|close\s+out)\b.{0,180}?\b(fix|repair|correction|implementation|feature|refactor|optimization|optimisation|improvement)(?=\s*[:;]|\s*$)/i
  )?.[1]?.toLowerCase();
  if (!english) return undefined;
  if (["fix", "repair", "correction"].includes(english)) return "bugfix";
  if (["implementation", "feature"].includes(english)) return "feature";
  return "refactor";
}

function isUsageAuditTask(task: string): boolean {
  const english = /\b(?:audit|analy[sz]e|measure|quantify|review)\b.{0,100}\b(?:usage|sessions?|conversations?|history|reliability|outcomes?|results?)\b/i
    .test(task)
    || /\b(?:usage|sessions?|conversations?|history|reliability|outcomes?|results?)\b.{0,100}\b(?:audit|analysis|measurement|review)\b/i
      .test(task);
  const chinese = /(?:分析|审计|審計|量化|检视|檢視).{0,60}(?:使用(?:记录|紀錄|状况|狀況|情况|情況)|对话|對話|会话|會話|可靠性|表现|表現|结果|結果)/
    .test(task)
    || /(?:使用(?:记录|紀錄|状况|狀況|情况|情況)|对话|對話|会话|會話|可靠性|表现|表現|结果|結果).{0,60}(?:分析|审计|審計|量化|检视|檢視)/
      .test(task);
  return english || chinese;
}
