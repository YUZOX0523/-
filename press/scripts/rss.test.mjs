import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseFeed, dedupe, normalizeLink, unescapeXml } from './lib/rss.mjs';

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8');

test('RSS 1.0 (PR TIMES/RDF) をパースできる', () => {
  const { items } = parseFeed(fixture('prtimes-sample.rdf'));
  assert.equal(items.length, 3);
  assert.match(items[0].title, /AIアカデミー/);
  assert.equal(items[0].link, 'https://prtimes.jp/main/html/rd/p/000000101.000099001.html');
  assert.equal(items[0].date, '2026-07-06T01:00:00.000Z'); // JST 10:00 → UTC
  // CDATA内のHTMLタグ・エンティティが除去されている
  assert.ok(!items[0].description.includes('<br>'));
  assert.ok(!items[0].description.includes('&lt;'));
  // タイトル先頭のエンティティが復元されている
  assert.ok(items[2].title.startsWith('&東京都内'));
});

test('RSS 2.0 (Google News) をパースできる', () => {
  const { items } = parseFeed(fixture('gnews-sample.xml'));
  assert.equal(items.length, 3);
  assert.match(items[0].title, /生成AIの企業導入が加速/);
  assert.equal(items[0].source, 'サンプル経済新聞');
  assert.equal(items[0].date, '2026-07-06T01:00:00.000Z');
});

test('壊れた入力では空配列を返し例外を投げない', () => {
  assert.deepEqual(parseFeed(''), { items: [] });
  assert.deepEqual(parseFeed('<html><body>403 Forbidden</body></html>'), { items: [] });
  assert.deepEqual(parseFeed(null), { items: [] });
  assert.deepEqual(parseFeed('<rss><item><title>リンクなし</title></item></rss>'), { items: [] });
});

test('normalizeLink はクエリ・フラグメント・末尾スラッシュを除去する', () => {
  assert.equal(
    normalizeLink('https://news.google.com/rss/articles/ABC?oc=5&hl=ja#top'),
    'https://news.google.com/rss/articles/abc'
  );
  assert.equal(normalizeLink('https://example.com/path/'), 'https://example.com/path');
  assert.equal(normalizeLink('not a url'), 'not a url');
});

test('dedupe は既読リンクとバッチ内重複を除外する', () => {
  const { items } = parseFeed(fixture('gnews-sample.xml'));
  // フィクスチャ3件のうち1件はクエリ違いの同一URL → バッチ内dedupeで2件
  const fresh = dedupe(items, new Set());
  assert.equal(fresh.length, 2);
  // 既読に入れると0件
  const seen = new Set(fresh.map((i) => normalizeLink(i.link)));
  assert.equal(dedupe(items, seen).length, 0);
});

test('unescapeXml は数値参照とCDATAを処理する', () => {
  assert.equal(unescapeXml('<![CDATA[A & B]]>'), 'A & B');
  assert.equal(unescapeXml('&#26666;&#24335;&#20250;&#31038;'), '株式会社');
  assert.equal(unescapeXml('&#x30C7;&#x30B8;'), 'デジ');
});
