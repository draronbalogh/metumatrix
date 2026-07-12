import { NextResponse } from 'next/server';
import { canWrite } from '@/lib/editauth';

// A kliens ezzel ellenőrzi, hogy az URL ?a= paramétere érvényes-e (admin / megtekintő mód).
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return NextResponse.json({ ok: canWrite(req) });
}
