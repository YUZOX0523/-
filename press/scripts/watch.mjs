#!/usr/bin/env node
// ウォッチ収集CLI: watchlist.json のフィードを取得し、新着のみを
// press/data/inbox/YYYY-MM-DD.json に保存する。
//
//   node scripts/watch.mjs            実フィードを取得
//   node scripts/watch.mjs --sample   fixtures/ のサンプルで動作確認（オフライン可）
//   node scripts/watch.mjs --dry-run  取得はするがファイルに書き込まない
//
// 規約配慮: 保存するのは見出し・リンク・日付・出典・短い抜粋のみ。
// 本文の複製・再掲載はしない。手動実行のみで高頻度ポーリングもしない。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseFeed, dedupe, normalizeLink } from './lib/rss.mjs';

const PRESS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(PRESS_DIR, 'data');
const INBOX_DIR = join(DATA_DIR, 'inbox');
const SEEN_PATH = join(DATA_DIR, 'seen.json');
const SEEN_MAX_ENTRIES = 3000;
const SEEN_MAX_AGE_DAYS = 60;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const args = process.argv.slice(2);
const SAMPLE = args.includes('--sample');
const DRY_RUN = args.includes('--dry-run');

function jstToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function loadWatchlist() {
  const path = join(PRESS_DIR, 'config', 'watchlist.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function buildFeedList(watchlist) {
  const feeds = [];
  const p = watchlist.prtimes_all;
  if (p?.enabled) {
    feeds.push({
      label: p.label || 'PR TIMES 全体新着',
      url: p.url || 'https://prtimes.jp/index.rdf',
      filterKeywords: p.filter_keywords || [],
      kind: 'prtimes_all',
    });
  }
  for (const c of watchlist.companies || []) {
    if (!c.enabled) continue;
    feeds.push({
      label: c.label || `PR TIMES 企業 ${c.company_id}`,
      url: `https://prtimes.jp/companyrdf.php?company_id=${encodeURIComponent(c.company_id)}`,
      filterKeywords: [],
      kind: 'company',
    });
  }
  for (const g of watchlist.google_news_keywords || []) {
    if (!g.enabled) continue;
    feeds.push({
      label: g.label || `Google News: ${g.query}`,
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(g.query)}&hl=ja&gl=JP&ceid=JP:ja`,
      filterKeywords: [],
      kind: 'google_news',
    });
  }
  return feeds;
}

function sampleFeedList() {
  return [
    {
      label: 'サンプル: PR TIMES 新着（フィクスチャ）',
      file: join(PRESS_DIR, 'fixtures', 'prtimes-sample.rdf'),
      filterKeywords: [],
      kind: 'prtimes_all',
    },
    {
      label: 'サンプル: Google News（フィクスチャ）',
      file: join(PRESS_DIR, 'fixtures', 'gnews-sample.xml'),
      filterKeywords: [],
      kind: 'google_news',
    },
  ];
}

async function fetchFeedXml(feed, timeoutMs) {
  if (feed.file) return readFileSync(feed.file, 'utf8');
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function applyKeywordFilter(items, keywords) {
  if (!keywords || keywords.length === 0) return items;
  return items.filter((item) =>
    keywords.some((kw) => item.title.includes(kw) || item.description.includes(kw))
  );
}

function loadSeen() {
  if (!existsSync(SEEN_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SEEN_PATH, 'utf8'));
  } catch {
    return {};
  }
}

// seen.json は { 正規化リンク: 初回観測日(ISO) } の辞書。件数と日数の両方で剪定する。
function pruneSeen(seen) {
  const cutoff = Date.now() - SEEN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let entries = Object.entries(seen).filter(([, ts]) => new Date(ts).getTime() >= cutoff);
  if (entries.length > SEEN_MAX_ENTRIES) {
    entries.sort((a, b) => new Date(b[1]) - new Date(a[1]));
    entries = entries.slice(0, SEEN_MAX_ENTRIES);
  }
  return Object.fromEntries(entries);
}

async function main() {
  const watchlist = loadWatchlist();
  const timeoutMs = watchlist.limits?.fetch_timeout_ms ?? 15000;
  const maxPerFeed = watchlist.limits?.max_items_per_feed ?? 30;
  const feeds = SAMPLE ? sampleFeedList() : buildFeedList(watchlist);

  if (feeds.length === 0) {
    console.error('⚠️  有効なフィードがありません。press/config/watchlist.json で enabled: true のフィードを設定してください。');
    process.exit(1);
  }

  const seen = loadSeen();
  const seenSet = new Set(Object.keys(seen));
  const results = [];
  let okCount = 0;

  for (const feed of feeds) {
    try {
      const xml = await fetchFeedXml(feed, timeoutMs);
      const { items } = parseFeed(xml);
      if (items.length === 0) throw new Error('フィードを解析できませんでした（形式が想定外）');
      const filtered = applyKeywordFilter(items, feed.filterKeywords).slice(0, maxPerFeed);
      const fresh = dedupe(filtered, seenSet);
      for (const item of fresh) seenSet.add(normalizeLink(item.link));
      results.push({ label: feed.label, kind: feed.kind, ok: true, total: filtered.length, new: fresh.length, items: fresh });
      okCount++;
      console.log(`✅ ${feed.label}: ${filtered.length}件中 新着${fresh.length}件`);
    } catch (err) {
      results.push({ label: feed.label, kind: feed.kind, ok: false, error: String(err.message || err), items: [] });
      console.log(`❌ ${feed.label}: 取得失敗（${err.message || err}）`);
    }
  }

  const newItems = results.flatMap((r) => r.items);
  const today = jstToday();

  if (!DRY_RUN) {
    mkdirSync(INBOX_DIR, { recursive: true });
    const inboxPath = join(INBOX_DIR, `${today}.json`);
    // 同日に複数回実行した場合は追記マージする
    let existing = { date: today, feeds: [] };
    if (existsSync(inboxPath)) {
      try {
        existing = JSON.parse(readFileSync(inboxPath, 'utf8'));
      } catch {
        /* 壊れていたら作り直す */
      }
    }
    existing.feeds.push(
      ...results.map((r) => ({ label: r.label, kind: r.kind, ok: r.ok, error: r.error, items: r.items }))
    );
    writeFileSync(inboxPath, JSON.stringify(existing, null, 2));

    const now = new Date().toISOString();
    const updatedSeen = pruneSeen({
      ...seen,
      ...Object.fromEntries(newItems.map((i) => [normalizeLink(i.link), now])),
    });
    writeFileSync(SEEN_PATH, JSON.stringify(updatedSeen, null, 2));
    console.log(`\n📥 新着${newItems.length}件を保存しました → press/data/inbox/${today}.json`);
  } else {
    console.log(`\n（dry-run）新着${newItems.length}件。ファイルには書き込みません。`);
  }

  console.log(`📊 ${okCount}/${feeds.length}フィード取得成功`);

  if (okCount === 0) {
    console.error('\n⚠️  すべてのフィード取得に失敗しました。ネットワーク接続、またはプロキシ設定を確認してください。');
    console.error('   オフラインで動作確認する場合: node scripts/watch.mjs --sample');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`予期しないエラー: ${err.message || err}`);
  process.exit(1);
});
