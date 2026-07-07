#!/usr/bin/env node
// プレスリリース原稿の採点CLI（100点満点・決定的ロジック）
//
//   node scripts/seo-check.mjs <原稿.md>              採点結果を表示
//   node scripts/seo-check.mjs <原稿.md> --json       JSON出力（スキルの自動改善ループ用）
//   node scripts/seo-check.mjs <原稿.md> --threshold 80   合格ラインを指定（既定80）
//
// 終了コード: スコア >= 閾値 なら 0、未満なら 1
//
// 原稿の契約（knowledge/templates/ と同期）:
//   frontmatter: title / subtitle / type / keywords[] / release_date / status
//   固定H2: ## リード文, ## 本文, ## 会社概要, ## 本リリースに関するお問い合わせ先
//   画像プレースホルダ: [画像n: 説明]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------- パース ----------

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    let value = rawValue.trim().replace(/^["']|["']$/g, '');
    if (rawValue.trim().startsWith('[')) {
      value = rawValue
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    fm[key] = value;
  }
  return fm;
}

function stripFrontmatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

// H2見出し配下のテキストを次のH2まで抽出（###は含む）
function extractSection(body, heading) {
  const re = new RegExp(`^##\\s*${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm');
  const m = body.match(re);
  return m ? m[1] : null;
}

const IMAGE_PLACEHOLDER_RE = /^\[画像\d+\s*[:：][^\]]*\]/gm;

// 文字数計測用: コメント・画像プレースホルダ・記法を除去し、コードポイントで数える
function plainText(section) {
  return (section || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(IMAGE_PLACEHOLDER_RE, '')
    .replace(/^#{1,6}\s.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>|]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, '')
    .trim();
}

const charLen = (s) => [...(s || '')].length;

// ---------- NGワード定義（knowledge/style-guide.md と同期） ----------

// 根拠注記（※）が直後30字以内に必要な最上級表現
const SUPERLATIVES = ['業界初', '日本初', '世界初', 'No.1', 'No1', 'ナンバーワン', '日本一', '唯一', '最大手', 'シェア1位'];
// 使用自体を避けるべき断定表現（-4点）
const ABSOLUTES = ['必ず', '絶対に', '完璧', '100%保証', '確実に成果'];
// 多用注意の誇大副詞（-2点）
const HYPE_WORDS = ['圧倒的', '究極', '最強', '劇的に', '爆発的'];

// ---------- 採点 ----------

/**
 * 原稿マークダウンを採点する純関数。
 * @returns {{score:number, breakdown:Object, fixes:string[], visualChecks:string[]}}
 */
export function scoreRelease(md) {
  const fm = parseFrontmatter(md);
  const body = stripFrontmatter(md);
  const fixes = [];
  const breakdown = {};

  const title = typeof fm.title === 'string' ? fm.title : '';
  const subtitle = typeof fm.subtitle === 'string' ? fm.subtitle : '';
  const keywords = Array.isArray(fm.keywords) ? fm.keywords : [];
  const primaryKeyword = keywords[0] || '';

  const isTemplatePlaceholder =
    title.includes('30〜40字') || primaryKeyword === '主要キーワード' || fm.release_date === 'YYYY-MM-DD';
  if (isTemplatePlaceholder) {
    fixes.push('frontmatterがテンプレートのままです。title / keywords / release_date を実際の内容に書き換えてください');
  }

  // --- タイトル (25点) ---
  let titleScore = 0;
  const titleLen = charLen(title);
  if (titleLen === 0) {
    fixes.push('タイトルがありません。frontmatterのtitleを設定してください');
  } else {
    if (titleLen <= 100) {
      titleScore += 3;
    } else {
      fixes.push(`【重大】タイトルが${titleLen}字。PR TIMESの上限100字を超えています。必ず短縮してください`);
    }
    if (titleLen >= 25 && titleLen <= 45) {
      titleScore += 5;
    } else if (titleLen <= 100) {
      fixes.push(`タイトルが${titleLen}字。SEOに強い30〜40字を目安に調整してください`);
    }
    if (primaryKeyword && charLen(title.split(primaryKeyword)[0]) < 20 && title.includes(primaryKeyword)) {
      titleScore += 8;
    } else if (primaryKeyword) {
      fixes.push(`主要キーワード「${primaryKeyword}」をタイトルの先頭20字以内に配置してください`);
    }
    if (/[0-9０-９]/.test(title)) {
      titleScore += 6;
    } else {
      fixes.push('タイトルに具体的な数字（導入社数・◯倍・◯%など）を入れると転載率が上がります');
    }
    const symbolCount = (title.match(/[【】「」『』！!？?★☆♪◆■]/g) || []).length;
    if (symbolCount <= 4) {
      titleScore += 3;
    } else {
      fixes.push('タイトルの記号が多すぎます（【】や！の乱用は転載時に敬遠されます）');
    }
  }
  breakdown['タイトル'] = { score: titleScore, max: 25 };

  // --- リード文 (15点) ---
  let leadScore = 0;
  const leadSection = extractSection(body, 'リード文');
  const leadText = plainText(leadSection);
  const leadLen = charLen(leadText);
  if (leadSection === null) {
    fixes.push('「## リード文」セクションがありません');
  } else {
    if (leadLen >= 200 && leadLen <= 400) {
      leadScore += 7;
    } else {
      fixes.push(`リード文が${leadLen}字。200〜400字に調整してください（5W2Hを凝縮）`);
    }
    if (/株式会社|デジライズ/.test(leadText)) {
      leadScore += 3;
    } else {
      fixes.push('リード文の1文目に会社名を入れてください');
    }
    if (/(\d{4}年|[0-9０-９]{1,2}月[0-9０-９]{1,2}日|本日|同日)/.test(leadText)) {
      leadScore += 3;
    } else {
      fixes.push('リード文に時期（◯月◯日、2026年◯月など）を明記してください');
    }
    if (primaryKeyword && leadText.includes(primaryKeyword)) {
      leadScore += 2;
    } else if (primaryKeyword) {
      fixes.push(`リード文に主要キーワード「${primaryKeyword}」を自然に入れてください`);
    }
  }
  breakdown['リード文'] = { score: leadScore, max: 15 };

  // --- 構成・本文 (20点) ---
  let structureScore = 0;
  const mainSection = extractSection(body, '本文');
  if (mainSection === null) {
    fixes.push('「## 本文」セクションがありません');
    breakdown['構成・本文'] = { score: 0, max: 20 };
  } else {
    const subheadings = (mainSection.match(/^###\s+.+$/gm) || []).length;
    if (subheadings >= 3) {
      structureScore += 7;
    } else {
      fixes.push(`本文の小見出し（###）が${subheadings}個。3個以上に分割して読みやすくしてください`);
    }
    const mainLen = charLen(plainText(mainSection));
    if (mainLen >= 1500 && mainLen <= 3000) {
      structureScore += 7;
    } else if (mainLen >= 1000 && mainLen <= 4000) {
      structureScore += 4;
      fixes.push(`本文が${mainLen}字。1,500〜3,000字が転載されやすい目安です`);
    } else if (mainLen > 8000) {
      fixes.push(`【重大】本文が${mainLen}字。PR TIMESの上限8,000字を超えています`);
    } else {
      fixes.push(`本文が${mainLen}字。1,500〜3,000字を目安に${mainLen < 1500 ? '肉付け' : '圧縮'}してください`);
    }
    const images = (body.match(IMAGE_PLACEHOLDER_RE) || []).length;
    if (images >= 3) {
      structureScore += 6;
    } else if (images >= 1) {
      structureScore += 2 * images;
      fixes.push(`画像プレースホルダが${images}個。[画像n: 説明] を3個以上配置してください（画像が多いほど転載率が上がります）`);
    } else {
      fixes.push('画像プレースホルダ [画像n: 説明] がありません。メイン画像＋本文中2枚以上を指定してください');
    }
    breakdown['構成・本文'] = { score: structureScore, max: 20 };
  }

  // --- 必須要素 (20点) ---
  let requiredScore = 0;
  const companySection = extractSection(body, '会社概要');
  if (companySection !== null) {
    requiredScore += 4;
    if (/https?:\/\//.test(companySection)) {
      requiredScore += 4;
    } else {
      fixes.push('会社概要に公式サイトURLを入れてください（SEO・信頼性向上）');
    }
  } else {
    fixes.push('「## 会社概要」セクションがありません');
  }
  const contactSection = extractSection(body, '本リリースに関するお問い合わせ先');
  if (contactSection !== null) {
    requiredScore += 4;
    if (/[\w.+-]+@[\w-]+\.[\w.]+|[0-9０-９]{2,4}[-ー][0-9０-９]{2,4}[-ー][0-9０-９]{3,4}/.test(contactSection)) {
      requiredScore += 4;
    } else {
      fixes.push('お問い合わせ先にメールアドレスまたは電話番号を記載してください');
    }
  } else {
    fixes.push('「## 本リリースに関するお問い合わせ先」セクションがありません');
  }
  if (title && !isTemplatePlaceholder) requiredScore += 1;
  if (keywords.length > 0 && !isTemplatePlaceholder) requiredScore += 1;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fm.release_date || '')) {
    requiredScore += 1;
  } else {
    fixes.push('release_date を YYYY-MM-DD 形式で設定してください');
  }
  if (subtitle && charLen(subtitle) <= 100) {
    requiredScore += 1;
  } else if (charLen(subtitle) > 100) {
    fixes.push(`サブタイトルが${charLen(subtitle)}字。PR TIMESの上限100字以内にしてください`);
  } else {
    fixes.push('サブタイトル（subtitle）を設定してください。タイトルの補足で検索流入を増やせます');
  }
  breakdown['必須要素'] = { score: requiredScore, max: 20 };

  // --- 表現コンプライアンス (20点・減点方式) ---
  let complianceScore = 20;
  const checkTarget = `${title} ${subtitle} ${plainTextWithNotes(body)}`;
  for (const word of SUPERLATIVES) {
    let idx = checkTarget.indexOf(word);
    while (idx !== -1) {
      const after = checkTarget.slice(idx + word.length, idx + word.length + 30);
      if (!after.includes('※') && !after.includes('（※')) {
        complianceScore -= 5;
        fixes.push(`「${word}」に根拠注記がありません。30字以内に「※自社調べ（時期・n数）」等を追記してください（景表法対策）`);
      }
      idx = checkTarget.indexOf(word, idx + word.length);
    }
  }
  for (const word of ABSOLUTES) {
    if (checkTarget.includes(word)) {
      complianceScore -= 4;
      fixes.push(`断定表現「${word}」は景表法リスクがあります。削除または言い換えてください`);
    }
  }
  for (const word of HYPE_WORDS) {
    if (checkTarget.includes(word)) {
      complianceScore -= 2;
      fixes.push(`誇大表現「${word}」は転載メディアに敬遠されがちです。具体的な数字への置き換えを推奨します`);
    }
  }
  complianceScore = Math.max(0, complianceScore);
  breakdown['表現コンプライアンス'] = { score: complianceScore, max: 20 };

  const score = titleScore + leadScore + structureScore + requiredScore + complianceScore;

  // 機械判定できない目視確認項目（常に提示）
  const visualChecks = [
    'リード文に5W2H（誰が・何を・いつ・どこで・なぜ・どのように・いくらで）が揃っているか',
    'タイトルが体言止めになっているか（「〜しました。」より「〜を開始」が転載されやすい）',
    '数字・固有名詞に誤りがないか（社名・日付・価格は特に注意）',
    '導入事例・提携の場合、相手企業の掲載許可を取得済みか',
    '画像の実ファイル（メイン画像1200×630px推奨）を準備したか',
  ];

  return { score, breakdown, fixes, visualChecks };
}

// コンプライアンス判定用: コメントは除くが「※」注記は残す
function plainTextWithNotes(body) {
  return body.replace(/<!--[\s\S]*?-->/g, '');
}

// ---------- CLI ----------

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const thresholdIdx = args.indexOf('--threshold');
  const threshold = thresholdIdx !== -1 ? Number(args[thresholdIdx + 1]) : 80;
  const file = args.find((a) => !a.startsWith('--') && a !== String(threshold));

  if (!file) {
    console.error('使い方: node scripts/seo-check.mjs <原稿.md> [--json] [--threshold 80]');
    process.exit(1);
  }

  let md;
  try {
    md = readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`ファイルを読めませんでした: ${file}（${err.message}）`);
    process.exit(1);
  }

  const result = scoreRelease(md);
  const passed = result.score >= threshold;

  if (jsonMode) {
    console.log(JSON.stringify({ ...result, threshold, passed }, null, 2));
  } else {
    console.log(`\n📝 採点結果: ${file}`);
    console.log('─'.repeat(46));
    for (const [category, { score, max }] of Object.entries(result.breakdown)) {
      const bar = '█'.repeat(Math.round((score / max) * 10)).padEnd(10, '░');
      console.log(`  ${category.padEnd(10, '　')} ${bar} ${String(score).padStart(3)} / ${max}`);
    }
    console.log('─'.repeat(46));
    console.log(`  合計: ${result.score} / 100 点 ${passed ? `✅ 合格（閾値${threshold}点）` : `❌ 閾値${threshold}点未満`}`);
    if (result.fixes.length > 0) {
      console.log('\n🔧 修正指示:');
      for (const fix of result.fixes) console.log(`  - ${fix}`);
    }
    console.log('\n👀 配信前の目視確認:');
    for (const check of result.visualChecks) console.log(`  - ${check}`);
    console.log('');
  }

  process.exit(passed ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
