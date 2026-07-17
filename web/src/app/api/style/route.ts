import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { canRead, readDenied } from '@/lib/editauth';

// A válasz-stílus tanuló fájl (fordulat-készletek) - a levélíró válaszjavaslatai innen
// sorsolnak. A fájlt a felhasználó és az Outlook-szinkron bot is bővítheti.
const FILE = process.env.STYLE_FILE || 'C:/node/metu_tanterv/grid/valasz-stilus.md';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!canRead(req)) return readDenied();
  try {
    const text = await fs.readFile(FILE, 'utf8');
    return NextResponse.json({ ok: true, text }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch {
    return NextResponse.json({ ok: false, text: null });
  }
}
