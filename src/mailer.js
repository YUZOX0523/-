const nodemailer = require('nodemailer');
const config = require('./config');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

function replacePlaceholders(text, company) {
  return text
    .replace(/\{\{company_name\}\}/g, company.name || '')
    .replace(/\{\{contact_person\}\}/g, company.contact_person || '')
    .replace(/\{\{industry\}\}/g, company.industry || '');
}

async function sendMail(company, template) {
  const subject = replacePlaceholders(template.subject, company);
  const body = replacePlaceholders(template.body, company);

  const mailOptions = {
    from: `"${config.from.name}" <${config.from.email}>`,
    to: company.email,
    subject,
    text: body,
  };

  return transporter.sendMail(mailOptions);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendBulk(companies, template, db) {
  const results = [];

  for (const company of companies) {
    let status = 'success';
    let errorMessage = '';

    try {
      await sendMail(company, template);
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
    }

    db.prepare(`
      INSERT INTO send_logs (company_id, template_id, company_name, email, subject, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      company.id,
      template.id,
      company.name,
      company.email,
      replacePlaceholders(template.subject, company),
      status,
      errorMessage
    );

    results.push({ company: company.name, email: company.email, status, errorMessage });

    if (companies.indexOf(company) < companies.length - 1) {
      await sleep(config.sendIntervalMs);
    }
  }

  return results;
}

module.exports = { sendMail, sendBulk };
