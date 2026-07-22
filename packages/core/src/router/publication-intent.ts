export type PublicationIntentAnalysis = {
  releaseMention: boolean;
  explicitReleaseAction: boolean;
  releaseArtifactReference: boolean;
  releaseIntent: boolean;
  evidenceMaintenance: boolean;
  evidenceSubject: boolean;
  evidenceArtifact: boolean;
};

export function analyzePublicationIntent(task: string): PublicationIntentAnalysis {
  const lower = task.toLowerCase();
  const releaseMention = /\b(release|publish|publishing|published|npm\s+publish|npm\s+registry|package\s+release|version\s+bump|dist[- ]?tag|git\s+tag|release\s+candidate)\b/.test(lower)
    || /(发布|發佈|发行|發行|版本发布|版本發佈|版本标签|版本標籤|套件发布|套件發佈|npm\s*发布|npm\s*發佈)/.test(lower);
  const evidenceMaintenance = /\b(sync|synchronize|update|refresh|pin|record|preserve|align)\b/.test(lower)
    || /(同步|更新|刷新|固定|锁定|鎖定|记录|記錄|保留|对齐|對齊)/.test(lower);
  const evidenceSubject = /\b(evidence|benchmark|protocol|research|results?|precision|recall|confidence)\b/.test(lower)
    || /(证据|證據|基准|基準|协议|協議|研究|结果|結果|精度|召回|置信度|可信度)/.test(lower);
  const evidenceArtifact = /\b(commit|sha|source|plan|manifest|docs?|documentation|readme|frozen|freeze)\b/.test(lower)
    || /(提交|源码|源碼|计划|計划|計畫|清单|清單|文档|文檔|说明|說明|冻结|凍結)/.test(lower);
  const namedReleaseArtifact = /\brelease[-\s]?(?:candidate|notes?|checklist|evidence|record|report|verification(?:[-\s]?scripts?)?|smoke(?:[-\s]?(?:tests?|scripts?))?)\b/.test(lower)
    || /(?:发布|發佈|发行|發行)(?:候选|候選|说明|說明|清单|清單|记录|記錄|证据|證據|报告|報告|资料|資料|文档|文檔|验证(?:脚本)?|驗證(?:腳本)?|冒烟(?:脚本)?|冒煙(?:腳本)?)/.test(lower);
  const explicitReleaseAction = (!namedReleaseArtifact && /^\s*(?:release|publish)\b/.test(lower))
    || (!namedReleaseArtifact && /^\s*(?:prepare|cut|ship)\b.{0,80}\brelease\b/.test(lower))
    || /\bnpm\s+publish\b/.test(lower)
    || /\b(?:publish|release)(?:ing|ed)?\b.{0,80}\b(?:to|on|into)\b.{0,30}\b(?:npm|registry|marketplace)\b/.test(lower)
    || /\b(?:create|push|publish)\b.{0,40}\b(?:git\s+)?tag\b/.test(lower)
    || /\b(?:version\s+bump|bump(?:ing)?\s+(?:the\s+)?version|dist[- ]?tag)\b/.test(lower)
    || (!namedReleaseArtifact && /^\s*(?:发布|發佈|发行|發行)/.test(lower))
    || /(?:发布|發佈|发行|發行).{0,60}(?:到|至|npm|registry|套件|插件|市场|市場|市集|版本|tag|标签|標籤)/.test(lower)
    || /(?:建立|创建|創建|推送|打).{0,40}(?:git\s*)?(?:tag|标签|標籤)/.test(lower);
  const leadingCodeChangeAction = /^\s*(?:add|build|create|debug|enhance|fix|generalize|implement|improve|optimi[sz]e|refactor|repair|resolve|restructure|simplify|support|update)\b/.test(lower)
    || /^\s*(?:\u65b0\u589e|\u589e\u52a0|\u5efa\u7acb|\u521b\u5efa|\u5275\u5efa|\u5b9e\u73b0|\u5be6\u4f5c|\u652f\u6301|\u652f\u63f4|\u91cd\u6784|\u91cd\u69cb|\u6574\u7406|\u7b80\u5316|\u7c21\u5316|\u4f18\u5316|\u512a\u5316|\u6539\u5584|\u6539\u8fdb|\u6539\u9032|\u4fee\u590d|\u4fee\u6b63|\u89e3\u51b3|\u89e3\u6c7a|\u66f4\u65b0)/.test(lower);
  const releaseArtifactReference = namedReleaseArtifact
    || (evidenceMaintenance && evidenceSubject && evidenceArtifact);

  return {
    releaseMention,
    explicitReleaseAction,
    releaseArtifactReference,
    releaseIntent: releaseMention && (explicitReleaseAction || (!releaseArtifactReference && !leadingCodeChangeAction)),
    evidenceMaintenance,
    evidenceSubject,
    evidenceArtifact
  };
}
