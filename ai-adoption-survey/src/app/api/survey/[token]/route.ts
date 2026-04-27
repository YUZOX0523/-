import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { calculateCategoryScores, calculateTotalScore } from '@/lib/scoring';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const db = getDb();
    const company = db
      .prepare('SELECT id, name FROM companies WHERE survey_token = ?')
      .get(params.token) as { id: number; name: string } | undefined;

    if (!company) {
      return NextResponse.json({ error: '無効なURLです' }, { status: 404 });
    }

    return NextResponse.json({ company: { id: company.id, name: company.name } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const db = getDb();
    const company = db
      .prepare('SELECT id FROM companies WHERE survey_token = ?')
      .get(params.token) as { id: number } | undefined;

    if (!company) {
      return NextResponse.json({ error: '無効なURLです' }, { status: 404 });
    }

    const { respondentName, respondentDepartment, respondentRole, answers } = await req.json();

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: '回答データが不正です' }, { status: 400 });
    }

    const totalScore = calculateTotalScore(answers);
    const categoryScores = calculateCategoryScores(answers);

    db.prepare(
      `INSERT INTO survey_responses
        (company_id, respondent_name, respondent_department, respondent_role, answers, total_score, category_scores)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      company.id,
      respondentName?.trim() || null,
      respondentDepartment?.trim() || null,
      respondentRole?.trim() || null,
      JSON.stringify(answers),
      totalScore,
      JSON.stringify(categoryScores)
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
