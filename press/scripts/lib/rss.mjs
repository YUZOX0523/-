// RSS 1.0 (RDF / PR TIMES) と RSS 2.0 (Google News など) の軽量パーサ。
// 依存パッケージなしで動かすため、整形式のフィードだけを対象にした
// 正規表現ベースの抽出にとどめている(汎用XMLパーサではない)。

const XML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

export function unescapeXml(text) {
  if (!text) return '';
  let out = text;
  const cdata = out.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) out = cdata[1];
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  out = out.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  for (const [entity, char] of Object.entries(XML_ENTITIES)) {
    out = out.split(entity).join(char);
  }
  return out.trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  return m ? unescapeXml(m[1]) : '';
}

function normalizeDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// HTMLタグ除去(descriptionに<a>等が混ざるフィード対策)
function stripHtml(text) {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * フィードXML文字列をパースして記事一覧を返す。
 * RSS 1.0 (rdf:RDF) / RSS 2.0 (rss) の両対応。壊れた入力では [] を返し、例外は投げない。
 * 規約配慮のため取得するのは見出し・リンク・日付・出典と短い抜粋のみ。
 * @returns {{items: Array<{title:string,link:string,date:string|null,description:string,source:string}>}}
 */
export function parseFeed(xml) {
  if (typeof xml !== 'string' || xml.length === 0) return { items: [] };
  const isRdf = /<rdf:RDF[\s>]/i.test(xml);
  const isRss2 = /<rss[\s>]/i.test(xml);
  if (!isRdf && !isRss2) return { items: [] };

  const items = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    if (!title || !link) continue;
    const date = normalizeDate(extractTag(block, 'dc:date') || extractTag(block, 'pubDate'));
    const description = stripHtml(extractTag(block, 'description')).slice(0, 200);
    const source = extractTag(block, 'source');
    items.push({ title, link, date, description, source });
  }
  return { items };
}

/**
 * リンクを重複判定用キーに正規化する。
 * Google News のリダイレクトURLはクエリ差分でぶれるためクエリ・フラグメントを落とす。
 */
export function normalizeLink(link) {
  if (!link) return '';
  try {
    const u = new URL(link);
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return link.trim().toLowerCase();
  }
}

/**
 * seenLinks(正規化済みリンクの配列 or Set)に含まれない新着だけを返す。
 */
export function dedupe(items, seenLinks) {
  const seen = seenLinks instanceof Set ? seenLinks : new Set(seenLinks || []);
  const out = [];
  const batch = new Set();
  for (const item of items) {
    const key = normalizeLink(item.link);
    if (!key || seen.has(key) || batch.has(key)) continue;
    batch.add(key);
    out.push(item);
  }
  return out;
}
