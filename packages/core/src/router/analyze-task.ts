import { slugify } from "../utils/path-utils";

export type TaskAnalysis = {
  raw: string;
  keywords: string[];
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
  "improve",
  "large",
  "palace",
  "project",
  "tool",
  "tools",
  "unknown",
  "vertex"
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

const PHRASE_KEYWORDS: Array<[RegExp, string[]]> = [
  [/前后端|前後端|全栈|全棧|全端|full[-\s]?stack/i, ["frontend", "backend"]],
  [/前端|頁面|页面|界面|畫面|画面|组件|組件|表单|表單|按钮|按鈕|footer|ui/i, ["frontend", "page", "component"]],
  [/后端|後端|服务端|服務端|服务器|伺服器|service|server/i, ["backend", "server", "service"]],
  [/接口|api|controller|控制器/i, ["api", "controller"]],
  [/数据库|資料庫|资料表|資料表|schema|model|prisma/i, ["database", "schema", "model"]],
  [/路由|路线|路線|route|router|routing/i, ["route", "router"]],
  [/准确|準確|完整度|相关度|相關度|score|scorer|scoring|relevance/i, ["score", "scorer", "route"]],
  [/依赖|依賴|导入|導入|引用|import|dependency|dependencies/i, ["import", "dependency", "edge"]],
  [/unknown|未识别|未識別|任务判断|任務判斷|任务分类|任務分類|任务类型|任務類型|classify|classification|task type/i, ["classify", "analyze", "task"]],
  [/索引|新鲜度|新鮮度|过期|過期|刷新|stale|fresh|freshness|index/i, ["index", "stale", "fresh"]],
  [/商品|产品|產品|product/i, ["product"]],
  [/规格|規格|款式|variant|option/i, ["variant"]],
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
  const keywords = [
    ...new Set(
      [...englishKeywords(task), ...phraseKeywords(task)].filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    )
  ];
  return {
    raw: task,
    keywords,
    wingHints: keywords.filter((keyword) => WING_HINTS.has(keyword)),
    roomHints: keywords.filter((keyword) => ROOM_HINTS.has(keyword))
  };
}

function englishKeywords(task: string): string[] {
  return task
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(slugify)
    .filter(Boolean);
}

function phraseKeywords(task: string): string[] {
  return PHRASE_KEYWORDS.flatMap(([pattern, keywords]) => (pattern.test(task) ? keywords : []));
}
