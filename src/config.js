require('dotenv').config();

module.exports = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: {
    name: process.env.FROM_NAME || '',
    email: process.env.FROM_EMAIL || '',
  },
  port: parseInt(process.env.PORT || '3000'),
  sendIntervalMs: parseInt(process.env.SEND_INTERVAL_MS || '5000'),
};
