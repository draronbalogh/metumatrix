import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// A tanterv egyetlen forrása. Ezt tölti be az app elsőként, és ide ment.
// Windows dev-környezet; a böngésző maga nem tud ide írni, ezért kell ez a szerveroldali route.
const FILE = process.env.CURRICULUM_FILE
  || 'C:/node/metu_tanterv/grid/media-design-mintatanterv.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch {
    // hiányzó/olvashatatlan fájl → az app a beépített DEFAULT_DATA-ra esik vissza
    return NextResponse.json({ ok: false, data: null });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.cohorts)) {
      return NextResponse.json({ ok: false, error: 'invalid curriculum' }, { status: 400 });
    }
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
