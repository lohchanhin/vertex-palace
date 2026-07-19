import { slugify } from "../utils/path-utils";
import { normalizeLexicalToken, tokenizeLexical } from "../utils/lexical-tokens";
import { analyzePublicationIntent } from "./publication-intent";

export type TaskAnalysis = {
  raw: string;
  keywords: string[];
  entities: string[];
  wingHints: string[];
  roomHints: string[];
};

const STOP_WORDS = new Set([
  "ai",
  "agent",
  "the",
  "a",
  "an",
  "to",
  "for",
  "and",
  "or",
  "of",
  "in",
  "on",
  "this",
  "that",
  "with",
  "before",
  "after",
  "fix",
  "bug",
  "issue",
  "problem",
  "error",
  "errors",
  "required",
  "requires",
  "rule",
  "rules",
  "should",
  "need",
  "needs",
  "codex",
  "feedback",
  "overall",
  "improve",
  "optimize",
  "optimise",
  "optimization",
  "optimisation",
  "quality",
  "performance",
  "reliability",
  "relevance",
  "from",
  "like",
  "prevent",
  "unrelated",
  "copies",
  "nested",
  "current",
  "exact",
  "implement",
  "measurable",
  "through",
  "week",
  "cross",
  "platform",
  "core",
  "repository",
  "repositories",
  "large",
  "palace",
  "project",
  "tool",
  "tools",
  "unknown",
  "assessment",
  "vertex",
  "are",
  "be",
  "because",
  "been",
  "being",
  "but",
  "correctly",
  "focused",
  "handling",
  "is",
  "right",
  "so",
  "update",
  "was",
  "were",
  "when",
  "while"
]);
const WING_HINTS = new Set([
  "api",
  "auth",
  "backend",
  "billing",
  "checkout",
  "client",
  "cms",
  "footer",
  "frontend",
  "image",
  "order",
  "payment",
  "policy",
  "product",
  "profile",
  "server",
  "session",
  "settings",
  "token",
  "upload",
  "user",
  "users",
  "variant"
]);
const ROOM_HINTS = new Set(["api", "checkout", "footer", "general", "image", "login", "logout", "password", "policy", "product", "profile", "refresh", "session", "settings", "token", "upload", "user", "users", "variant"]);
const RELEASE_ROUTE_KEYWORDS = ["release", "publish", "package", "manifest", "version", "npm", "registry", "tag", "changelog"];
const RELEASE_REFERENCE_ONLY_KEYWORDS = new Set(["release", "publish", "package", "version", "npm", "registry", "tag"]);

const PHRASE_KEYWORDS: Array<[RegExp, string[]]> = [
  [/machine[-\s]?readable\s+evidence|机器可读证据|機器可讀證據/i, ["machine", "readable", "evidence"]],
  [/plugin|marketplace|插件/i, ["plugin", "marketplace"]],
  [/adaptive|full[-\s]?palace|route[-\s]?lite|guarded[-\s]?memory[-\s]?palace/i, ["adaptive", "mode", "selector", "context", "packer"]],
  [/source\s+(?:code|implementation)|implementation\s+source|源码|源碼|源代码|源代碼/i, ["implementation", "source"]],
  [/evidence|research(?:\s+(?:record|report|evidence))?|strict\s+precision|target\s+(?:precision|recall)|证据|證據|研究(?:记录|記錄|报告|報告)?|严格精度|嚴格精度|目标精度|目標精度|召回率?/i, ["evidence", "precision", "recall", "route", "confidence"]],
  [/protocol|study\s+plan|result\s+manifest|freeze\s+gate|frozen|协议|協議|计划|計划|計畫|结果清单|結果清單|冻结|凍結/i, ["protocol", "plan", "config", "frozen"]],
  [/documentation|\bdocs?\b|readme|bilingual|locali[sz](?:e|ed|ation)|simplified\s+chinese|简体中文(?:辅助)?说明|簡體中文(?:輔助)?說明|研究(?:报告|報告)|双语|雙語|文档|文檔/i, ["docs", "documentation", "readme", "bilingual", "localization"]],
  [/memory.{0,24}budget|context.{0,16}ceiling|记忆.{0,16}预算|記憶.{0,16}預算/i, ["memory", "context", "token", "budget"]],
  [/verify|verification|regression|test suite|测试|測試|验证|驗證|回归|回歸/i, ["test", "verification", "regression"]],
  [/benchmark|evaluate route|evaluation report|changed[-\s]?file coverage|confidence calibration|token reduction|context savings?/i, ["evaluation", "evaluate", "route", "confidence", "pack", "token"]],
  [/scanner|scanning|scan repo|ignore rules?|exclude|worktree|nested repo/i, ["scanner", "ignore"]],
  [/context pack|packing|packer|pack output/i, ["pack", "packer"]],
  [/pitfall|dedup|deduplicate|memory ledger/i, ["memory", "pitfall"]],
  [/前后端|前後端|全栈|全棧|全端|full[-\s]?stack/i, ["frontend", "backend"]],
  [/前端|頁面|页面|界面|畫面|画面|组件|組件|表单|表單|按钮|按鈕|\bfooter\b|\bui\b/i, ["frontend", "page", "component"]],
  [/后端|後端|服务端|服務端|服务器|伺服器|\bservice\b|\bserver\b/i, ["backend", "server", "service"]],
  [/接口|\bapi\b|\bcontroller\b|控制器/i, ["api", "controller"]],
  [/数据库|資料庫|资料表|資料表|schema|model|prisma/i, ["database", "schema", "model"]],
  [/路由|路线|路線|route|router|routing/i, ["route", "router"]],
  [/准确|準確|完整度|相关度|相關度|\b(?:score|scorer|scoring|relevance)\b/i, ["score", "scorer", "route"]],
  [/依赖|依賴|导入|導入|引用|import|dependency|dependencies/i, ["import", "dependency", "edge"]],
  [/unknown|未识别|未識別|任务判断|任務判斷|任务分类|任務分類|任务类型|任務類型|classify|classification|task type/i, ["classify", "analyze", "task"]],
  [/索引|新鲜度|新鮮度|过期|過期|刷新|stale|fresh|freshness|index/i, ["index", "stale", "fresh"]],
  [/\b(?:evaluation|evaluate|assessment|score|rating|grade)\b|评估|評估|评价|評價|评分|評分|打分/i, ["evaluation", "evaluate", "route", "confidence"]],
  [/retrospective|postmortem|feedback|lessons|回顾|回顧|复盘|復盤|总结|總結|结论|結論/i, ["evaluation", "retrospective", "memory"]],
  [/商品|产品|產品|product/i, ["product"]],
  [/规格|規格|款式|\bvariant\b/i, ["variant"]],
  [/图片|圖片|图像|圖像|照片|image|photo|picture/i, ["image"]],
  [/上传|上傳|upload/i, ["upload"]],
  [/筛选|篩選|过滤|過濾|filter/i, ["filter"]],
  [/订单|訂單|order/i, ["order"]],
  [/付款|支付|payment|gateway/i, ["payment"]],
  [/结账|結帳|checkout/i, ["checkout"]],
  [/登录|登入|login/i, ["login", "auth"]],
  [/用户|用戶|会员|會員|user/i, ["user"]],
  [/政策|条款|條款|policy/i, ["policy"]],
  [/页脚|頁腳|footer/i, ["footer"]]
];

export function analyzeTask(task: string): TaskAnalysis {
  const lexicalTask = task
    .replace(/\bproduct\s+intent\b/gi, "intent")
    .replace(/\b(?:keep|preserve|without\s+changing|do\s+not\s+change)\s+(?:the\s+)?public\s+api(?:\s+stable)?\b/gi, " compatibility guardrail ")
    .replace(/\b(?:keep|preserve|without\s+changing|do\s+not\s+change)\s+(?:the\s+)?api\s+contract(?:\s+stable)?\b/gi, " compatibility guardrail ");
  const entities = entityKeywords(task);
  const publication = analyzePublicationIntent(task);
  const contextualStopWords = new Set(STOP_WORDS);
  if (/\bbuild\s+week\b/i.test(task)) contextualStopWords.add("build");
  const collected = [
    ...englishKeywords(lexicalTask),
    ...phraseKeywords(lexicalTask),
    ...entities,
    ...(publication.releaseIntent ? RELEASE_ROUTE_KEYWORDS : [])
  ];
  const keywords = [
    ...new Set(
      collected.filter(
        (token) =>
          token.length > 1
          && !contextualStopWords.has(token)
          && !(
            publication.releaseArtifactReference
            && !publication.releaseIntent
            && RELEASE_REFERENCE_ONLY_KEYWORDS.has(token)
          )
      )
    )
  ];
  return {
    raw: task,
    keywords,
    entities,
    wingHints: keywords.filter((keyword) => WING_HINTS.has(keyword)),
    roomHints: keywords.filter((keyword) => ROOM_HINTS.has(keyword))
  };
}

function englishKeywords(task: string): string[] {
  return [...tokenizeLexical(task)]
    .map((token) => normalizeLexicalToken(slugify(token)))
    .filter((token) => Boolean(token) && !/^\d+$/.test(token));
}

function phraseKeywords(task: string): string[] {
  return PHRASE_KEYWORDS.flatMap(([pattern, keywords]) => (pattern.test(task) ? keywords : []));
}

function entityKeywords(task: string): string[] {
  const candidates = task.match(/[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)+|[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+/g) ?? [];
  const namedPhrases = /\bbuild\s+week\b/i.test(task) ? ["build-week", "buildweek"] : [];
  return [
    ...new Set(
      [
        ...namedPhrases,
        ...candidates.flatMap((candidate) => {
          const slug = slugify(candidate);
          const compact = candidate.toLowerCase().replace(/[^a-z0-9]+/g, "");
          return [slug, compact].filter((value) => value.length > 2);
        })
      ]
    )
  ];
}
