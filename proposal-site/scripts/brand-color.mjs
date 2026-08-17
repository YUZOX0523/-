#!/usr/bin/env node
/**
 * brand-color.mjs — 提案先のコーポレートサイトからコーポレートカラーを推定する
 *
 *   node proposal-site/scripts/brand-color.mjs https://example.co.jp
 *   cat saved.html | node proposal-site/scripts/brand-color.mjs --stdin https://example.co.jp
 *
 * HTML と参照している CSS を読み、ニュートラル（白・黒・グレー）を除いた
 * 有彩色を出現数と文脈で重みづけし、上位候補を出力する。
 * 併せて、テンプレートが実際に描画する派生色のコントラスト比も検算する。
 *
 * 出力の使い方: 推奨値を proposal-site.html の CONFIG.brand.color に入れる。
 * 最終判断は人間が行う（ロゴの色 = ブランド色とは限らないため、必ず目で見る）。
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const MAX_CSS_FILES = 6;
const TOP_N = 6;

/* ---------------------------------------------------------------- 取得 --- */

async function fetchText(url) {
  // curl はプロキシ環境変数を尊重するため優先して使う
  try {
    const { stdout } = await execFileP(
      "curl",
      ["-sSL", "--max-time", "20", "-A", "Mozilla/5.0 (compatible; DigiRise-brand-color/1.0)", url],
      { maxBuffer: 20 * 1024 * 1024 }
    );
    if (stdout) return stdout;
  } catch { /* curl が無い環境では fetch にフォールバック */ }

  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; DigiRise-brand-color/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return await res.text();
}

/* -------------------------------------------------------------- 色変換 --- */

const clamp01 = v => Math.min(1, Math.max(0, v));
const srgbToLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linToSrgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map(c => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
const rgbToHex = ([r, g, b]) =>
  "#" + [r, g, b].map(v => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

function rgbToHsl([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}

function rgbToOklab([r, g, b]) {
  const R = srgbToLin(r / 255), G = srgbToLin(g / 255), B = srgbToLin(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}
function oklabToRgb([L, a, bb]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * bb) ** 3;
  const R = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [R, G, B].map(v => clamp01(linToSrgb(v)) * 255);
}
/** CSS の color-mix(in oklab, base p%, other) と同じ結果を出す */
function mixOklab(baseRgb, otherRgb, pBase) {
  const A = rgbToOklab(baseRgb), B = rgbToOklab(otherRgb);
  return oklabToRgb(A.map((v, i) => v * pBase + B[i] * (1 - pBase)));
}

const luminance = ([r, g, b]) =>
  0.2126 * srgbToLin(r / 255) + 0.7152 * srgbToLin(g / 255) + 0.0722 * srgbToLin(b / 255);
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* -------------------------------------------------------------- 抽出 --- */

const RE_HEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RE_RGB = /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/g;

/** ニュートラル・ほぼ白黒・薄すぎる色を落とす */
function isChromatic(rgb) {
  const [, s, l] = rgbToHsl(rgb);
  return s >= 0.14 && l >= 0.08 && l <= 0.92;
}

function collect(text, weight, bucket) {
  for (const m of text.matchAll(RE_HEX)) {
    const rgb = hexToRgb(m[1]);
    if (isChromatic(rgb)) add(bucket, rgbToHex(rgb), weight);
  }
  for (const m of text.matchAll(RE_RGB)) {
    const rgb = [+m[1], +m[2], +m[3]];
    if (rgb.every(v => v <= 255) && isChromatic(rgb)) add(bucket, rgbToHex(rgb), weight);
  }
}
function add(bucket, hex, weight) {
  const e = bucket.get(hex) || { hex, score: 0, count: 0 };
  e.score += weight; e.count += 1;
  bucket.set(hex, e);
}

function cssUrls(html, base) {
  const out = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/stylesheet/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try { out.push(new URL(href, base).href); } catch { /* 不正なURLは無視 */ }
  }
  return out.slice(0, MAX_CSS_FILES);
}

/* ---------------------------------------------------------------- 本体 --- */

const args = process.argv.slice(2);
const useStdin = args.includes("--stdin");
const url = args.find(a => a.startsWith("http"));
if (!url) {
  console.error("使い方: node brand-color.mjs <提案先HPのURL>");
  process.exit(1);
}

const html = useStdin
  ? await new Promise(r => { let d = ""; process.stdin.on("data", c => (d += c)); process.stdin.on("end", () => r(d)); })
  : await fetchText(url);

const bucket = new Map();
const notes = [];

// 1) theme-color / msapplication-TileColor は事業者の宣言なので最重視
for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
  const tag = m[0];
  if (!/name\s*=\s*["'](theme-color|msapplication-TileColor)["']/i.test(tag)) continue;
  const v = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!v) continue;
  collect(v, 120, bucket);
  notes.push(`meta theme-color: ${v.trim()}`);
}

// 2) CSSカスタムプロパティの定義（--brand: #xxx 等）はブランド宣言に近い
for (const m of html.matchAll(/--[\w-]+\s*:\s*([^;{}]+)/g)) collect(m[1], 10, bucket);

// 3) インラインの style / <style> ブロック
for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) collect(m[1], 2, bucket);
for (const m of html.matchAll(/style\s*=\s*["']([^"']+)["']/gi)) collect(m[1], 2, bucket);

// 4) 外部CSS
const sheets = cssUrls(html, url);
for (const href of sheets) {
  try {
    const css = await fetchText(href);
    for (const m of css.matchAll(/--[\w-]+\s*:\s*([^;{}]+)/g)) collect(m[1], 10, bucket);
    collect(css, 1, bucket);
    notes.push(`css: ${href} (${(css.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    notes.push(`css 取得失敗: ${href} — ${e.message}`);
  }
}

const ranked = [...bucket.values()].sort((a, b) => b.score - a.score).slice(0, TOP_N);

/* ---------------------------------------------------------------- 出力 --- */

console.log(`\n提案先: ${url}`);
notes.forEach(n => console.log(`  · ${n}`));
if (!ranked.length) {
  console.log("\n有彩色を検出できませんでした。ロゴ画像から目視で拾ってください。\n");
  process.exit(0);
}

console.log(`\n候補（スコア順）`);
console.log("  " + ["色", "スコア", "出現", "白文字比", "見出し色(派生)", "見出し比"].join("\t"));
for (const e of ranked) {
  const rgb = hexToRgb(e.hex);
  const onWhiteInk = mixOklab(rgb, [0, 0, 0], 0.78);          // --brand-deep（明テーマ）
  console.log("  " + [
    e.hex,
    e.score.toFixed(0),
    e.count,
    contrast(rgb, [255, 255, 255]).toFixed(2) + ":1",
    rgbToHex(onWhiteInk),
    contrast(onWhiteInk, [255, 255, 255]).toFixed(2) + ":1",
  ].join("\t"));
}

const best = ranked[0];
const bestRgb = hexToRgb(best.hex);
const deep = mixOklab(bestRgb, [0, 0, 0], 0.78);
const deepRatio = contrast(deep, [255, 255, 255]);
const onDark = mixOklab(bestRgb, [255, 255, 255], 0.58);
const onDarkRatio = contrast(onDark, [23, 26, 33]);

console.log(`\n推奨: CONFIG.brand.color = "${best.hex}"`);
console.log(`  明テーマの見出し色 ${rgbToHex(deep)} / 白背景コントラスト ${deepRatio.toFixed(2)}:1 ${deepRatio >= 4.5 ? "✓ AA" : "△ 要調整"}`);
console.log(`  暗テーマの見出し色 ${rgbToHex(onDark)} / 暗背景コントラスト ${onDarkRatio.toFixed(2)}:1 ${onDarkRatio >= 4.5 ? "✓ AA" : "△ 要調整"}`);
if (deepRatio < 4.5 || onDarkRatio < 4.5) {
  console.log(`  → コントラスト不足。彩度を保ったまま明度を寄せた近似色（例: 少し暗い同系色）に差し替えてください。`);
}
console.log(`\n※ 最終判断は目視で。ロゴの色が必ずしもサイトのブランド色とは一致しません。\n`);
