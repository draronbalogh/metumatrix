import { NextResponse } from 'next/server';
import { canWrite, EDIT_COOKIE } from '@/lib/editauth';

// A kliens ezzel ellenőrzi, hogy az eltárolt szerkesztési kulcs érvényes-e (bemutató mód
// kapcsoló). Érvényes kulcs esetén 1 éves, szerver által beállított sütit is adunk:
// így a jogosultság akkor is megmarad, ha a böngésző a localStorage-t kitörli.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ok = canWrite(req);
  const res = NextResponse.json({ ok });
  const key = process.env.EDIT_KEY;
  if (ok && key && req.headers.get('x-edit-key') === key) {
    res.cookies.set(EDIT_COOKIE, key, { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/', httpOnly: true });
  }
  return res;
}
