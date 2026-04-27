export type Category = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  benchmark: number;
};

export type Question = {
  id: number;
  text: string;
  category: string;
};

export const CATEGORIES: Category[] = [
  {
    id: 'strategy',
    name: 'AI戦略・ビジョン',
    shortName: '戦略',
    description: '経営レベルでのAI活用方針と推進体制',
    color: '#3b82f6',
    benchmark: 35,
  },
  {
    id: 'practice',
    name: 'AI活用の実践',
    shortName: '実践',
    description: '日常業務でのAIツール活用状況',
    color: '#8b5cf6',
    benchmark: 40,
  },
  {
    id: 'talent',
    name: '人材・スキル',
    shortName: '人材',
    description: 'AI活用人材の育成と全社展開',
    color: '#10b981',
    benchmark: 38,
  },
  {
    id: 'data',
    name: 'データ・セキュリティ',
    shortName: 'データ',
    description: 'データ基盤とAIセキュリティ管理',
    color: '#f59e0b',
    benchmark: 48,
  },
  {
    id: 'culture',
    name: '組織文化・変革力',
    shortName: '文化',
    description: '変化への適応力と革新的な組織風土',
    color: '#ef4444',
    benchmark: 45,
  },
];

export const QUESTIONS: Question[] = [
  // AI戦略・ビジョン
  {
    id: 1,
    text: '貴社には、AI活用に関する明確な経営方針・戦略がありますか？',
    category: 'strategy',
  },
  {
    id: 2,
    text: '経営層がAI活用の重要性を認識し、積極的に推進していますか？',
    category: 'strategy',
  },
  {
    id: 3,
    text: 'AI活用・導入のための予算や投資計画が策定されていますか？',
    category: 'strategy',
  },
  {
    id: 4,
    text: 'AI導入・活用を推進する専任担当者やチームが社内にいますか？',
    category: 'strategy',
  },
  // AI活用の実践
  {
    id: 5,
    text: '日常業務でAIツール（ChatGPT、Copilot等）を定期的に活用していますか？',
    category: 'practice',
  },
  {
    id: 6,
    text: 'AIを活用した業務プロセスの改善・自動化が進んでいますか？',
    category: 'practice',
  },
  {
    id: 7,
    text: 'AI活用による具体的な成果（工数削減・品質向上等）を実感していますか？',
    category: 'practice',
  },
  {
    id: 8,
    text: '新しいAIツールやサービスを積極的に試せる環境がありますか？',
    category: 'practice',
  },
  // 人材・スキル
  {
    id: 9,
    text: '従業員がAIツールを自主的に学習・活用しようとしていますか？',
    category: 'talent',
  },
  {
    id: 10,
    text: 'AI活用に関する社内研修や勉強会を定期的に実施していますか？',
    category: 'talent',
  },
  {
    id: 11,
    text: 'AIを使いこなせる推進人材（AIチャンピオン等）が社内にいますか？',
    category: 'talent',
  },
  {
    id: 12,
    text: 'AI活用スキルが一部の社員だけでなく全体に均等に普及していますか？',
    category: 'talent',
  },
  // データ・セキュリティ
  {
    id: 13,
    text: '業務データの整備・デジタル化・構造化が進んでいますか？',
    category: 'data',
  },
  {
    id: 14,
    text: '社内でのAI活用に関するセキュリティガイドラインが整備されていますか？',
    category: 'data',
  },
  {
    id: 15,
    text: 'AIに入力してよい情報・悪い情報の判断基準が社員に明確になっていますか？',
    category: 'data',
  },
  {
    id: 16,
    text: 'クラウドサービスやSaaSを業務に積極的に活用していますか？',
    category: 'data',
  },
  // 組織文化・変革力
  {
    id: 17,
    text: '新しい技術やツールの導入に対して、組織全体が前向きに取り組んでいますか？',
    category: 'culture',
  },
  {
    id: 18,
    text: '失敗を恐れず、新しいことに挑戦できる文化が根付いていますか？',
    category: 'culture',
  },
  {
    id: 19,
    text: '業務改善・効率化の提案が出やすい環境・仕組みが整っていますか？',
    category: 'culture',
  },
  {
    id: 20,
    text: '競合他社や業界のAI活用動向を継続的に把握・研究していますか？',
    category: 'culture',
  },
];

export const SCORE_OPTIONS = [
  { value: 1, label: '全くそう思わない' },
  { value: 2, label: 'あまりそう思わない' },
  { value: 3, label: 'どちらともいえない' },
  { value: 4, label: 'ややそう思う' },
  { value: 5, label: '非常にそう思う' },
];
