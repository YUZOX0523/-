import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { calculateCategoryScores, calculateTotalScore } from '@/lib/scoring';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    await initSchema();
    const sql = getDb();
    const rows = await sql`
      SELECT id, name FROM companies WHERE survey_token = ${params.token}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: '無効なURLです' }, { status: 404 });
    }
    const company = rows[0] as { id: number; name: string };
    return NextResponse.json({ company: { id: company.id, name: company.name } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    await initSchema();
    const sql = getDb();
    const companyRows = await sql`
      SELECT id FROM companies WHERE survey_token = ${params.token}
    `;
    if (companyRows.length === 0) {
      return NextResponse.json({ error: '無効なURLです' }, { status: 404 });
    }
    const companyId = (companyRows[0] as { id: number }).id;

    const { respondentName, respondentDepartment, respondentRole, answers } = await req.json();
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: '回答データが不正です' }, { status: 400 });
    }

    const totalScore = calculateTotalScore(answers);
    const categoryScores = calculateCategoryScores(answers);

    await sql`
      INSERT INTO survey_responses
        (company_id, respondent_name, respondent_department, respondent_role, answers, total_score, category_scores)
      VALUES (
        ${companyId},
        ${respondentName?.trim() || null},
        ${respondentDepartment?.trim() || null},
        ${respondentRole?.trim() || null},
        ${JSON.stringify(answers)},
        ${totalScore},
        ${JSON.stringify(categoryScores)}
      )
    `;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
