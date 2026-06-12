export const CATEGORIES = [
  { key: "literacy", label: "AIリテラシー", short: "リテラシー" },
  { key: "usage", label: "業務活用度", short: "活用度" },
  { key: "org_drive", label: "組織推進度", short: "推進度" },
  { key: "culture", label: "浸透度", short: "浸透度" },
  { key: "mindset", label: "マインド・受容性", short: "マインド" },
  { key: "governance", label: "ガバナンス・セキュリティ", short: "ガバナンス" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

export const INDUSTRIES = [
  { code: "manufacturing", label: "製造" },
  { code: "construction_realestate", label: "建設・不動産" },
  { code: "it_telecom", label: "IT・通信" },
  { code: "finance_insurance", label: "金融・保険" },
  { code: "retail_wholesale", label: "小売・卸売" },
  { code: "medical_welfare", label: "医療・福祉" },
  { code: "education", label: "教育" },
  { code: "transport_logistics", label: "運輸・物流" },
  { code: "food_hospitality", label: "飲食・宿泊" },
  { code: "professional_services", label: "専門サービス(士業・コンサル等)" },
  { code: "public", label: "公務・団体" },
  { code: "other", label: "その他" },
] as const;

export const SIZE_BANDS = [
  { code: "s1_10", label: "〜10名" },
  { code: "s11_50", label: "11〜50名" },
  { code: "s51_100", label: "51〜100名" },
  { code: "s101_300", label: "101〜300名" },
  { code: "s301_1000", label: "301〜1,000名" },
  { code: "s1001_", label: "1,001名〜" },
] as const;

export const ROLE_BANDS = [
  { code: "executive", label: "経営層" },
  { code: "manager", label: "管理職" },
  { code: "staff", label: "一般" },
] as const;

export const AGE_BANDS = [
  { code: "u20s", label: "20代以下" },
  { code: "30s", label: "30代" },
  { code: "40s", label: "40代" },
  { code: "50s", label: "50代" },
  { code: "o60s", label: "60代以上" },
] as const;

export const SCALE_LABELS: Record<string, string[]> = {
  agreement: [
    "全く当てはまらない",
    "あまり当てはまらない",
    "どちらともいえない",
    "やや当てはまる",
    "非常に当てはまる",
  ],
  frequency: ["全く使わない", "月に数回", "週に1回程度", "週に数回", "ほぼ毎日"],
};

export const LEVELS = [
  {
    level: 1,
    name: "未着手",
    description: "AI活用はこれから。まずは触れる機会づくりが第一歩です。",
  },
  {
    level: 2,
    name: "個人利用",
    description:
      "一部の社員が個人的に使い始めた段階。組織的な後押しで一気に伸びます。",
  },
  {
    level: 3,
    name: "業務活用",
    description:
      "日常業務での活用が定着しつつあります。部署間の差を埋めることが次の課題です。",
  },
  {
    level: 4,
    name: "組織展開",
    description:
      "組織として推進が機能し、活用が広がっています。業務変革への接続がテーマです。",
  },
  {
    level: 5,
    name: "変革ドライバー",
    description: "AIが業務と事業の変革を牽引する先進企業です。",
  },
] as const;

export const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.code, i.label])
);
export const SIZE_BAND_LABELS: Record<string, string> = Object.fromEntries(
  SIZE_BANDS.map((s) => [s.code, s.label])
);

// デジライズの看板サービス(診断結果からの導線先)
export type ServiceDef = {
  id: "reskilling" | "consulting" | "claudecode";
  name: string;
  tagline: string;
  bullets: string[];
  url: string;
  image: string;
  imageAlt: string;
  badge?: string;
};

export const SERVICES: Record<ServiceDef["id"], ServiceDef> = {
  reskilling: {
    id: "reskilling",
    name: "法人リスキリング",
    tagline: "業務棚卸し×学習×実践の6ヶ月伴走で、全社のAI活用を底上げ",
    badge: "法人向けAIリスキリングサービス 導入社数No.1 ※",
    bullets: [
      "業務棚卸しを起点に、動画学習・活用ワークショップ・セキュリティ整備までワンストップ",
      "導入企業実績: 生成AI活用率94%・1人あたり月38.4時間削減(GMOインターネットグループ)",
      "人材開発支援助成金の活用で、実質負担を大幅に軽減(中小企業は最大75%助成)",
    ],
    url: "https://digirise.ai/business/reskilling/",
    image: "/char-squirrel-pointer.png",
    imageAlt: "デジライズ公式キャラクター(リス)",
  },
  consulting: {
    id: "consulting",
    name: "AIエージェント導入活用支援・AI開発実装支援",
    tagline: "推進体制づくりから業務自動化の実装・定着まで、専任で伴走",
    bullets: [
      "課題の棚卸し→優先度設計→自動化フローの実装・定着まで一気通貫",
      "AI利用ガイドライン策定・セキュリティ教育で「安心して使える環境」を整備",
      "『即動くもの』を成果物として納品するミニアプリ開発にも対応",
    ],
    url: "https://digirise.ai/business/aiconsulting/",
    image: "/char-giraffe-arms.png",
    imageAlt: "デジライズ公式キャラクター(キリン)",
  },
  claudecode: {
    id: "claudecode",
    name: "Claude Code 法人導入支援",
    tagline: "「使う」から「創る」へ。AI内製開発・業務自動化の次の一手",
    badge: "導入500社・延べ40,000名の実績",
    bullets: [
      "経営層向けマンツーマンコーチから全社研修まで、フェーズに合わせて選べる",
      "ワークショップ4回+動画60本で「自走するAI内製組織」を育成(助成金活用で実質9万円/人〜)",
      "業務ミニアプリを1本単位で納品。Day1から動く成果物で投資対効果を最大化",
    ],
    url: "https://claudecode.digirise.ai/?utm_source=digirise&utm_medium=internal&utm_campaign=cta",
    image: "/char-giraffe.png",
    imageAlt: "デジライズ公式キャラクター(キリン)",
  },
};

export const NO1_ATTRIBUTION =
  "※ 東京商工リサーチ調べ / 2026年3月末時点 法人向けAIリスキリングサービス";

// 弱点カテゴリー → デジライズのサービス推奨マッピング
export const SERVICE_RECOMMENDATIONS: Record<
  CategoryKey,
  { service: string; pitch: string }
> = {
  literacy: {
    service: "法人リスキリング(研修プログラム)",
    pitch:
      "社員のAIリテラシーを底上げする実践型研修で、全社の基礎スキルを揃えます。",
  },
  usage: {
    service: "法人リスキリング(研修プログラム)",
    pitch:
      "明日から業務で使えるプロンプト・ユースケース習得で、活用頻度を引き上げます。",
  },
  org_drive: {
    service: "AI活用コンサルティング",
    pitch:
      "推進体制の設計・経営層への提言・ロードマップ策定を伴走支援します。",
  },
  culture: {
    service: "AI活用コンサルティング",
    pitch:
      "活用事例の社内展開・ナレッジ共有の仕組みづくりで、現場への浸透を加速します。",
  },
  mindset: {
    service: "AI活用コンサルティング",
    pitch:
      "成功体験の設計とチェンジマネジメントで、AIへの不安を期待に変えます。",
  },
  governance: {
    service: "AI活用コンサルティング(ガイドライン策定)",
    pitch:
      "AI利用ルールの策定・周知とリスク教育で、安心して使える環境を整備します。",
  },
};
