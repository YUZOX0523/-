import { NextRequest, NextResponse } from 'next/server';

async function computeSessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + '-degirise-ai-survey-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute =
    pathname === '/' ||
    pathname.startsWith('/api/companies');

  if (!isAdminRoute) return NextResponse.next();

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return NextResponse.next(); // No password set = open (for local dev)

  const sessionCookie = req.cookies.get('admin_session')?.value;
  const expectedToken = await computeSessionToken(adminPassword);

  if (sessionCookie === expectedToken) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/', '/api/companies', '/api/companies/:path*'],
};
