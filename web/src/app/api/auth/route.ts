import { NextResponse } from 'next/server';
import { canWrite } from '@/lib/editauth';

// A kliens ezzel ellenőrzi, hogy az eltárolt szerkesztési kulcs érvényes-e (bemutató mód kapcsoló).
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return NextResponse.json({ ok: canWrite(req) });
}
