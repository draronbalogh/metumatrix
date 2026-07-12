import { NextResponse } from 'next/server';

// Szerkesztési kulcs (bemutató mód): ha a web/.env.local-ban be van állítva az EDIT_KEY,
// minden ÍRÓ API-hívásnak hoznia kell a kulcsot — x-edit-key fejlécben VAGY a szerver
// által beállított tartós sütiben. A süti azért kell, mert a mobil böngészők a
// localStorage-t HTTP-oldalaknál időnként törlik, és az app bemutató módba esett vissza.
// Kulcs nélküli környezetben (nincs EDIT_KEY) a kapu nyitva, minden a régi módon működik.
export const EDIT_COOKIE = 'mm_edit_key';

const cookieKey = (req: Request): string | null => {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  const m = raw.split(/;\s*/).find((c) => c.startsWith(`${EDIT_COOKIE}=`));
  return m ? decodeURIComponent(m.slice(EDIT_COOKIE.length + 1)) : null;
};

export function canWrite(req: Request): boolean {
  const key = process.env.EDIT_KEY;
  if (!key) return true;
  return req.headers.get('x-edit-key') === key || cookieKey(req) === key;
}

export const writeDenied = () =>
  NextResponse.json({ ok: false, error: 'Bemutató mód: a mentéshez szerkesztési kulcs kell (?admin=<kulcs>).' }, { status: 403 });
