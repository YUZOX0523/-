import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { aggregateAnswers, calculateScoring } from '@/lib/scoring';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const db = getDb();
    const company = db
      .prepare('SELECT id, name, contact_name, contact_email, created_at FROM companies WHERE survey_token = ?')
      .get(params.token) as {
        id: number;
        name: string;
        contact_name: string | null;
        contact_email: string | null;
        created_at: string;
      } | undefined;

    if (!company) {
      return NextResponse.json({ error: '無効なURLです' }, { status: 404 });
    }

    const responses = db
      .prepare(
        `SELECT answers, respondent_name, respondent_department, respondent_role, created_at
         FROM survey_responses WHERE company_id = ? ORDER BY created_at DESC`
      )
      .all(company.id) as Array<{
        answers: string;
        respondent_name: string | null;
        respondent_department: string | null;
        respondent_role: string | null;
        created_at: string;
      }>;

    if (responses.length === 0) {
      return NextResponse.json({
        company: { name: company.name },
        responseCount: 0,
        scoring: null,
        respondents: [],
      });
    }

    const parsedAnswers = responses.map((r) => JSON.parse(r.answers) as Record<number, number>);
    const aggregated = aggregateAnswers(parsedAnswers);
    const scoring = calculateScoring(aggregated);

    const respondents = responses.map((r) => ({
      name: r.respondent_name,
      department: r.respondent_department,
      role: r.respondent_role,
      date: r.created_at,
    }));

    return NextResponse.json({
      company: {
        name: company.name,
        contactName: company.contact_name,
        createdAt: company.created_at,
      },
      responseCount: responses.length,
      scoring,
      respondents,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
