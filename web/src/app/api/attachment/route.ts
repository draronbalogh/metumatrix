import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { canWrite, writeDenied } from '@/lib/editauth';

// Email-mellékletek kiszolgálása a helyi archívumból (mail-attachments/<day>/<name>).
// A bot ide tölti le a leveleik mellékleteit; a Posta/kártyák innen kínálják megnyitásra.
// BIZTONSÁG: szerkesztői kulcs kell (x-edit-key, mint az agenda-írásnál); a nap ÉÉÉÉ-HH-NN
// alakú, a fájlnév nem tartalmazhat elérési-út jelet (path traversal ellen), és a feloldott
// útvonalnak a <day> mappán BELÜL kell maradnia. A választ letöltésként (attachment) adjuk,
// application/octet-stream-mel - sose renderelünk tetszőleges fájlt inline-ban.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = process.env.ATTACH_ROOT || 'C:/node/metu_tanterv/mail-attachments';

export async function GET(req: Request) {
  if (!canWrite(req)) return writeDenied();
  const u = new URL(req.url);
  const day = (u.searchParams.get('day') || '').trim();
  const name = (u.searchParams.get('name') || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ ok: false, error: 'ervenytelen nap' }, { status: 400 });
  // path traversal ellen: elválasztó (/ \) tilos, a puszta "." / ".." tilos - de a
  // fájlnévben egyébként ELŐFORDULÓ pontpár (pl. "Hirlevel_07.17..docx") megengedett
  if (!name || /[\\/]/.test(name) || name === '.' || name === '..') return NextResponse.json({ ok: false, error: 'ervenytelen nev' }, { status: 400 });

  const base = path.resolve(ROOT, day);
  const file = path.resolve(base, name);
  // dupla védelem: a feloldott útvonalnak a <day> mappán BELÜL kell maradnia
  if (!file.startsWith(base + path.sep)) return NextResponse.json({ ok: false, error: 'ervenytelen ut' }, { status: 400 });

  try {
    const buf = await fs.readFile(file);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name.replace(/["\\]/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'a melleklet nem talalhato (lehet, hogy meg nincs archivalva)' }, { status: 404 });
  }
}
