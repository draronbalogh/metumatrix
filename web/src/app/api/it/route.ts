import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { canRead, readDenied } from '@/lib/editauth';

// Infopark telepített szoftverek + teremkiosztás (a vegyes/ xlsx-ből generálva).
// Csak olvassuk - a forrás az Excel, újrageneráláskor a JSON frissül.
const FILE = process.env.IT_FILE
  || 'C:/node/metu_tanterv/grid/it-szoftverek.json';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!canRead(req)) return readDenied();
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return NextResponse.json({ ok: true, data: JSON.parse(raw) }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch {
    return NextResponse.json({ ok: false, data: null });
  }
}
