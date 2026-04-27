import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, contactName, contactEmail } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '企業名は必須です' }, { status: 400 });
    }

    const db = getDb();
    const token = uuidv4();

    db.prepare(
      'INSERT INTO companies (name, contact_name, contact_email, survey_token) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), contactName?.trim() || null, contactEmail?.trim() || null, token);

    return NextResponse.json({ token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const companies = db
      .prepare(
        `SELECT c.id, c.name, c.contact_name, c.contact_email, c.survey_token, c.created_at,
                COUNT(r.id) as response_count
         FROM companies c
         LEFT JOIN survey_responses r ON r.company_id = c.id
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      )
      .all();
    return NextResponse.json({ companies });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
