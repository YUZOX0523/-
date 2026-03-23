/**
 * 投稿テーマ定義
 * 人事評価・報酬・雇用・リスキリング・生産年齢人口・AI・政策
 */

const TOPICS = [
  {
    id: 'hr_evaluation',
    name: '人事評価制度',
    keywords: ['人事評価', 'OKR', '360度評価', 'パフォーマンス管理', '目標管理制度', 'MBO', '人材アセスメント'],
    angle: '最新トレンドや実践的な改善ポイント、企業事例を含めて解説',
  },
  {
    id: 'compensation',
    name: '報酬制度',
    keywords: ['報酬制度', '給与体系', 'ジョブ型賃金', '同一労働同一賃金', 'インセンティブ設計', '賃上げ', 'ベースアップ'],
    angle: '日本企業の現状課題と改革の方向性、グローバルスタンダードとの比較を含めて',
  },
  {
    id: 'employment',
    name: '雇用制度',
    keywords: ['雇用制度', 'メンバーシップ型', 'ジョブ型雇用', '副業・兼業', '雇用流動化', '解雇規制', '多様な働き方'],
    angle: '制度改革の論点と実務への影響、今後の展望を中心に',
  },
  {
    id: 'reskilling',
    name: 'リスキリング',
    keywords: ['リスキリング', 'DXスキル', 'AI人材育成', 'デジタルスキル', '学び直し', 'リカレント教育', 'スキルアップ補助'],
    angle: '政府支援策や企業の取り組み事例、効果的な推進方法を解説',
  },
  {
    id: 'population_ai',
    name: '生産年齢人口減少とAI活用',
    keywords: ['労働力不足', '生産年齢人口', 'AI活用', '自動化', '人手不足対策', '高齢者活躍', '外国人材'],
    angle: '人口動態データを踏まえたAI・テクノロジー活用の具体策と企業対応',
  },
  {
    id: 'policy',
    name: '政府政策・骨太の方針',
    keywords: ['骨太の方針', '人的資本経営', '新しい資本主義', '労働市場改革', '賃金上昇', 'GX人材', 'DX推進政策'],
    angle: '最新の政策動向と企業・HR担当者への実務的インパクト',
  },
];

/**
 * 時間帯に応じたトピックを選択（1日5投稿用）
 * 投稿時刻: 7:00, 10:00, 12:30, 17:00, 20:00
 */
const SCHEDULE = [
  { hour: 7,  minute: 0,  topicIds: ['policy', 'hr_evaluation'] },
  { hour: 10, minute: 0,  topicIds: ['reskilling', 'population_ai'] },
  { hour: 12, minute: 30, topicIds: ['compensation', 'employment'] },
  { hour: 17, minute: 0,  topicIds: ['hr_evaluation', 'policy'] },
  { hour: 20, minute: 0,  topicIds: ['population_ai', 'reskilling'] },
];

/**
 * スケジュールインデックスに対応するトピックをランダム選択
 */
function getTopicForScheduleIndex(index) {
  const slot = SCHEDULE[index % SCHEDULE.length];
  const ids = slot.topicIds;
  const selectedId = ids[Math.floor(Math.random() * ids.length)];
  return TOPICS.find(t => t.id === selectedId) || TOPICS[index % TOPICS.length];
}

function getRandomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

module.exports = { TOPICS, SCHEDULE, getTopicForScheduleIndex, getRandomTopic };
