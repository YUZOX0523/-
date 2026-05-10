import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, initSchema } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const sql = getDb();
    const { name, contactName, contactEmail } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '企業名は必須です' }, { status: 400 });
    }
    const surveyToken = uuidv4();
    const resultsToken = uuidv4();
    await sql`
      INSERT INTO companies (name, contact_name, contact_email, survey_token, results_token)
      VALUES (${name.trim()}, ${contactName?.trim() || null}, ${contactEmail?.trim() || null}, ${surveyToken}, ${resultsToken})
    `;
    return NextResponse.json({ token: surveyToken, resultsToken });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error && e.message === 'DB_NOT_CONFIGURED'
      ? 'データベースが未設定です。Vercelの環境変数にDATABASE_URLを追加してください。'
      : 'サーバーエラーが発生しました';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    await initSchema();
    const sql = getDb();
    const companies = await sql`
      SELECT c.id, c.name, c.contact_name, c.survey_token, c.results_token,
             c.created_at::text as created_at,
             COUNT(r.id)::int as response_count
      FROM companies c
      LEFT JOIN survey_responses r ON r.company_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return NextResponse.json({ companies });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
