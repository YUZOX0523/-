const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// APIルート
app.use('/api/companies', require('./routes/companies'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/send', require('./routes/send'));

app.listen(config.port, '0.0.0.0', () => {
  console.log(`営業メール送信アプリ起動: http://localhost:${config.port}`);
});
