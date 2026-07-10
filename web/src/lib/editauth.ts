import { NextResponse } from 'next/server';

// Szerkesztési kulcs (bemutató mód): ha a web/.env.local-ban be van állítva az EDIT_KEY,
// minden ÍRÓ API-hívásnak x-edit-key fejlécben kell hoznia — enélkül csak olvasni lehet.
// Kulcs nélküli környezetben (nincs EDIT_KEY) a kapu nyitva, minden a régi módon működik.
export function canWrite(req: Request): boolean {
  const key = process.env.EDIT_KEY;
  if (!key) return true;
  return req.headers.get('x-edit-key') === key;
}

export const writeDenied = () =>
  NextResponse.json({ ok: false, error: 'Bemutató mód: a mentéshez szerkesztési kulcs kell (?admin=<kulcs>).' }, { status: 403 });
