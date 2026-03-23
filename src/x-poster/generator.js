const Anthropic = require('@anthropic-ai/sdk');

const MOCK_MODE = process.env.X_DRY_RUN === 'true' && !process.env.ANTHROPIC_API_KEY;

/**
 * 指定トピックのX投稿文をClaude APIで生成する
 * @param {object} topic - topics.jsのトピックオブジェクト
 * @param {string} [extraContext] - 追加コンテキスト（最新ニュースなど）
 * @returns {Promise<string>} 投稿文（280文字以内）
 */
async function generatePost(topic, extraContext = '') {
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Tokyo',
  });

  const keyword = topic.keywords[Math.floor(Math.random() * topic.keywords.length)];

  const prompt = `あなたは人事・労働政策の専門家として、X（旧Twitter）に投稿する日本語のツイートを1件作成してください。

【テーマ】${topic.name}
【キーワード】${keyword}
【視点】${topic.angle}
【日付】${today}
${extraContext ? `【参考情報】${extraContext}` : ''}

【要件】
- 日本語で作成
- 文字数は200〜270文字（ハッシュタグ含む）
- 専門家らしい洞察や具体的な数字・事例を1つ以上含める
- 読者（HR担当者・経営者・政策関係者）が「なるほど」と思える内容
- 最後に関連ハッシュタグを2〜4個付ける（例：#人事評価 #HR #リスキリング）
- 扇動的・断定的すぎる表現は避け、バランスの取れた論調にする
- 数字を使う場合は「〜%」「〜万人」など具体的に

ツイート本文のみを出力してください（前置き・説明不要）。`;

  if (MOCK_MODE) {
    // ANTHROPIC_API_KEY未設定時のモック出力
    return `【モック投稿】${topic.name}に関するサンプルツイートです。2026年の労働市場では、${keyword}が注目されており、企業の対応が急務となっています。政府の推進する人的資本経営の観点からも重要な課題です。実際の運用時はAPIキーを設定してください。 #${keyword.replace(/[・]/g, '')} #HR #人的資本`;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  return text;
}

module.exports = { generatePost };
