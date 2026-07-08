import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// A feladatok + események egyetlen forrása — a tanterv-fájl mintájára.
// Hiányzó fájlnál az app a beépített DEFAULT_AGENDA-ra esik vissza, az első mentés hozza létre.
const FILE = process.env.AGENDA_FILE
  || 'C:/node/metu_tanterv/grid/media-design-agenda.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch {
    return NextResponse.json({ ok: false, data: null });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.tasks) || !Array.isArray(body.events)) {
      return NextResponse.json({ ok: false, error: 'invalid agenda' }, { status: 400 });
    }
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
