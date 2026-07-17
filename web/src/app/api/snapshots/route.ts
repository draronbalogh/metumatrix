import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { canWrite, writeDenied } from '@/lib/editauth';

// Időbélyeges pillanatképek (teljes mentések) mappája. Minden ⤓ Mentés ide is letesz
// egy fájlt; a ⤒ Betöltés innen listáz, és alapból a legutolsót ajánlja fel.
const DIR = process.env.SNAPSHOT_DIR || 'C:/node/metu_tanterv/grid/backups';
const SAFE_NAME = /^[A-Za-z0-9._-]+\.json$/;

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!canWrite(req)) return writeDenied(); // a mentés-visszatöltés szerkesztői funkció
  try {
    const name = new URL(req.url).searchParams.get('name');
    if (name) {
      if (!SAFE_NAME.test(name)) return NextResponse.json({ ok: false, error: 'bad name' }, { status: 400 });
      const raw = await fs.readFile(path.join(DIR, name), 'utf8');
      return NextResponse.json({ ok: true, data: JSON.parse(raw) }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    const files = await fs.readdir(DIR).catch(() => [] as string[]);
    const list = await Promise.all(files.filter((f) => SAFE_NAME.test(f)).map(async (f) => {
      const st = await fs.stat(path.join(DIR, f));
      return { name: f, mtime: st.mtimeMs, size: st.size };
    }));
    list.sort((a, b) => b.mtime - a.mtime);
    return NextResponse.json({ ok: true, list });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  try {
    const body = await req.json();
    if (!body || body.kind !== 'metumatrix-backup') {
      return NextResponse.json({ ok: false, error: 'invalid backup' }, { status: 400 });
    }
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const name = `metumatrix-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.json`;
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, name), JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ ok: true, name });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
