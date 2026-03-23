require('dotenv').config();
const { setupScheduler, runPost } = require('./scheduler');

const args = process.argv.slice(2);

// `node src/x-poster/index.js --test` で即時テスト投稿
if (args.includes('--test')) {
  const slotIndex = parseInt(args[args.indexOf('--slot') + 1] || '0', 10);
  console.log(`テスト投稿を実行します (スロット: ${slotIndex})...`);
  runPost(slotIndex).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
} else {
  setupScheduler();
}
