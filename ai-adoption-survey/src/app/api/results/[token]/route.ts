import { NextRequest, NextResponse } from 'next/server';
import { getDb, initSchema } from '@/lib/db';
import { aggregateAnswers, calculateScoring } from '@/lib/scoring';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    await initSchema();
    const sql = getDb();
    const companyRows = await sql`
      SELECT id, name, contact_name, created_at::text as created_at
      FROM companies WHERE survey_token = ${params.token}
    `;
    if (companyRows.length === 0) {
      return NextResponse.json({ error: '無効なURLです' }, { status: 404 });
    }
    const company = companyRows[0] as { id: number; name: string; contact_name: string | null; created_at: string };

    const responses = await sql`
      SELECT answers, respondent_name, respondent_department, respondent_role, created_at::text as created_at
      FROM survey_responses WHERE company_id = ${company.id} ORDER BY created_at DESC
    ` as Array<{ answers: string; respondent_name: string | null; respondent_department: string | null; respondent_role: string | null; created_at: string }>;

    if (responses.length === 0) {
      return NextResponse.json({ company: { name: company.name }, responseCount: 0, scoring: null, respondents: [] });
    }

    const scoring = calculateScoring(aggregateAnswers(responses.map(r => JSON.parse(r.answers) as Record<number, number>)));

    return NextResponse.json({
      company: { name: company.name, contactName: company.contact_name, createdAt: company.created_at },
      responseCount: responses.length,
      scoring,
      respondents: responses.map(r => ({
        name: r.respondent_name,
        department: r.respondent_department,
        role: r.respondent_role,
        date: r.created_at,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
