const { TwitterApi } = require('twitter-api-v2');

let twitterClient = null;

function getClient() {
  if (twitterClient) return twitterClient;

  const {
    X_API_KEY,
    X_API_SECRET,
    X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET,
  } = process.env;

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    throw new Error(
      'X API認証情報が不足しています。.envに X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET を設定してください。'
    );
  }

  twitterClient = new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });

  return twitterClient;
}

/**
 * Xにツイートを投稿する
 * @param {string} text - 投稿テキスト
 * @returns {Promise<{id: string, text: string}>}
 */
async function postTweet(text) {
  const client = getClient();
  const rwClient = client.readWrite;
  const tweet = await rwClient.v2.tweet(text);
  return { id: tweet.data.id, text: tweet.data.text };
}

/**
 * ドライラン（実際には投稿しない）
 */
async function dryRunTweet(text) {
  console.log('[DRY RUN] 投稿内容:');
  console.log('─'.repeat(60));
  console.log(text);
  console.log('─'.repeat(60));
  console.log(`文字数: ${text.length}`);
  return { id: 'dry-run', text };
}

module.exports = { postTweet, dryRunTweet };
