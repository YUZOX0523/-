const cron = require('node-cron');
const { generatePost } = require('./generator');
const { postTweet, dryRunTweet } = require('./poster');
const { SCHEDULE, TOPICS } = require('./topics');

const isDryRun = process.env.X_DRY_RUN === 'true';

/**
 * 投稿実行（生成→投稿）
 * @param {number} scheduleIndex - SCHEDULE配列のインデックス
 */
async function runPost(scheduleIndex) {
  const slot = SCHEDULE[scheduleIndex];
  const ids = slot.topicIds;
  const selectedId = ids[Math.floor(Math.random() * ids.length)];
  const topic = TOPICS.find(t => t.id === selectedId) || TOPICS[0];

  console.log(`[${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}] 投稿開始: ${topic.name}`);

  try {
    const text = await generatePost(topic);

    if (!text) {
      console.error('コンテンツ生成に失敗しました。スキップします。');
      return;
    }

    const result = isDryRun
      ? await dryRunTweet(text)
      : await postTweet(text);

    console.log(`✓ 投稿完了 (ID: ${result.id})`);
  } catch (err) {
    console.error(`✗ 投稿エラー: ${err.message}`);
  }
}

/**
 * 1日5投稿のcronジョブをセットアップ
 *
 * 投稿時刻 (JST):
 *   07:00, 10:00, 12:30, 17:00, 20:00
 */
function setupScheduler() {
  console.log('X自動投稿スケジューラー起動');
  console.log(`モード: ${isDryRun ? 'DRY RUN（実投稿なし）' : '本番投稿'}`);
  console.log('投稿スケジュール (JST):');
  SCHEDULE.forEach((slot, i) => {
    const h = String(slot.hour).padStart(2, '0');
    const m = String(slot.minute).padStart(2, '0');
    console.log(`  ${i + 1}. ${h}:${m} - テーマ: ${slot.topicIds.join(' / ')}`);
  });

  // 07:00 JST
  cron.schedule('0 7 * * *', () => runPost(0), { timezone: 'Asia/Tokyo' });
  // 10:00 JST
  cron.schedule('0 10 * * *', () => runPost(1), { timezone: 'Asia/Tokyo' });
  // 12:30 JST
  cron.schedule('30 12 * * *', () => runPost(2), { timezone: 'Asia/Tokyo' });
  // 17:00 JST
  cron.schedule('0 17 * * *', () => runPost(3), { timezone: 'Asia/Tokyo' });
  // 20:00 JST
  cron.schedule('0 20 * * *', () => runPost(4), { timezone: 'Asia/Tokyo' });

  console.log('スケジューラー待機中...\n');
}

module.exports = { setupScheduler, runPost };
