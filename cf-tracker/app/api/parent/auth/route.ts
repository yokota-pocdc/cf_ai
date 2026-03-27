import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { passphrase } = await req.json();
  const correct = process.env.PARENT_PASSPHRASE || 'oyako2025';

  if (passphrase !== correct) {
    return NextResponse.json({ error: 'パスフレーズが違います' }, { status: 401 });
  }

  // Set a simple session cookie (httpOnly)
  const res = NextResponse.json({ success: true });
  res.cookies.set('parent_auth', 'verified', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
