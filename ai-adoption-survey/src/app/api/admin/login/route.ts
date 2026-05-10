import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

function computeSessionToken(password: string): string {
  return createHash('sha256')
    .update(password + '-degirise-ai-survey-2024')
    .digest('hex');
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 });
  }

  const token = computeSessionToken(adminPassword);
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}
