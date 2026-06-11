import { Resend } from "resend";

/**
 * Resendでメールを送信する。RESEND_API_KEY未設定時(ローカル開発)は
 * 送信せずコンソールに内容を出力する。
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email skipped] to=${to} subject=${subject}`);
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "AI活用レベル診断 <noreply@example.com>",
    to,
    subject,
    html,
  });
}

export function surveyUrlEmailHtml(params: {
  adminName: string;
  companyName: string;
  surveyUrl: string;
  dashboardUrl: string;
}) {
  const { adminName, companyName, surveyUrl, dashboardUrl } = params;
  return `
  <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
    <h2 style="color: #1d4ed8;">AI活用レベル診断 — サーベイURLのご案内</h2>
    <p>${adminName} 様</p>
    <p>${companyName} のご登録ありがとうございます。以下のURLを社内チャットやメールで社員の皆さまに展開してください。回答は匿名で、所要時間は5〜10分です。</p>
    <p style="background: #eff6ff; padding: 16px; border-radius: 8px; word-break: break-all;">
      <a href="${surveyUrl}">${surveyUrl}</a>
    </p>
    <p>回答状況と診断結果は、担当者ダッシュボードからいつでもご確認いただけます。</p>
    <p><a href="${dashboardUrl}" style="color: #1d4ed8;">ダッシュボードを開く</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">株式会社デジライズ AI活用レベル診断</p>
  </div>`;
}
