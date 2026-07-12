import { NextResponse } from 'next/server';

// Szerkesztési kulcs: ha a web/.env.local-ban be van állítva az EDIT_KEY, minden ÍRÓ
// API-hívásnak x-edit-key fejlécben kell hoznia. A kliens a kulcsot mindig az aktuális
// URL ?a= paraméteréből veszi — nincs tárolás, nincs süti, nincs localStorage.
export function canWrite(req: Request): boolean {
  const key = process.env.EDIT_KEY;
  if (!key) return true;
  return req.headers.get('x-edit-key') === key;
}

export const writeDenied = () =>
  NextResponse.json({ ok: false, error: 'Megtekintő mód: a mentéshez az URL-ben ?a=<kulcs> kell.' }, { status: 403 });
