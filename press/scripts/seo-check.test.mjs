import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scoreRelease } from './seo-check.mjs';

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8');

test('お手本原稿は85点以上', () => {
  const { score, breakdown } = scoreRelease(fixture('release-good.md'));
  assert.ok(score >= 85, `score=${score}`);
  assert.equal(breakdown['表現コンプライアンス'].score, 20);
  assert.equal(breakdown['タイトル'].score, 25);
});

test('NG例原稿は50点以下で、具体的な修正指示が出る', () => {
  const { score, fixes } = scoreRelease(fixture('release-bad.md'));
  assert.ok(score <= 50, `score=${score}`);
  assert.ok(fixes.some((f) => f.includes('業界初')), '「業界初」の根拠注記指摘があるべき');
  assert.ok(fixes.some((f) => f.includes('必ず')), '断定表現「必ず」の指摘があるべき');
  assert.ok(fixes.some((f) => f.includes('画像プレースホルダ')), '画像不足の指摘があるべき');
  assert.ok(fixes.some((f) => f.includes('リード文')), 'リード文の指摘があるべき');
  assert.ok(fixes.some((f) => f.includes('テンプレートのまま')), 'placeholder指摘があるべき');
});

test('タイトル100字超は重大指摘になる', () => {
  const md = `---
title: "${'あ'.repeat(120)}"
keywords: ["テスト"]
release_date: "2026-07-14"
---
## リード文
テスト
`;
  const { fixes } = scoreRelease(md);
  assert.ok(fixes.some((f) => f.includes('【重大】') && f.includes('100字')));
});

test('根拠注記(※)付きの最上級表現は減点されない', () => {
  const base = fixture('release-good.md');
  const withNote = base.replace(
    '本プログラムの特徴は次の3点です。',
    '本サービスは業界初※の取り組みです。※自社調べ（2026年6月、AI研修サービス30社比較）。本プログラムの特徴は次の3点です。'
  );
  const { breakdown } = scoreRelease(withNote);
  assert.equal(breakdown['表現コンプライアンス'].score, 20);
});

test('日本語の文字数はコードポイントで数える(サロゲートペア対応)', () => {
  // 絵文字入りタイトルでも length ではなくコードポイント数で判定されること
  const md = `---
title: "生成AI研修を提供開始🚀 導入500社の知見を凝縮した3日間プログラム"
keywords: ["生成AI研修"]
release_date: "2026-07-14"
---
## リード文
テスト
`;
  const { breakdown } = scoreRelease(md);
  // タイトル: 100字以内(3) + 25〜45字(5) + キーワード先頭(8) + 数字(6) + 記号OK(3) = 25
  assert.equal(breakdown['タイトル'].score, 25);
});

test('空文字列でもクラッシュしない', () => {
  const { score, fixes } = scoreRelease('');
  assert.ok(score >= 0 && score <= 100);
  assert.ok(fixes.length > 0);
});
