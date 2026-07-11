import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';

// MD-szűrt órarend (a vegyes/Órarend xlsx-ből generálva a scratch-parserrel).
// Csak olvassuk — a forrás az Excel, újrageneráláskor a JSON frissül.
const FILE = process.env.ORAREND_FILE
  || 'C:/node/metu_tanterv/grid/orarend.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return NextResponse.json({ ok: true, data: JSON.parse(raw) }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch {
    return NextResponse.json({ ok: false, data: null });
  }
}
