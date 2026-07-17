import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { canWrite, writeDenied } from '@/lib/editauth';

// Választás-napló a tanulási hurokhoz: melyik választervet másolta/küldte a
// felhasználó, és átírta-e küldés előtt. A bot futásonként olvassa, és elég új
// minta után szabályjavaslatot tesz a grid/valasz-stilus.md végére (jóváhagyásra).
// Append-only, a legutóbbi 300 bejegyzésre vágva.
const FILE = process.env.REPLYLOG_FILE
  || 'C:/node/metu_tanterv/grid/valasz-valasztas-log.json';

export const dynamic = 'force-dynamic';

interface LogEntry {
  at: string;                // ISO időbélyeg
  sel: string;               // 't:id' / 'e:id' - melyik Posta-tételhez
  label: string;             // a választott terv címkéje
  action: 'copy' | 'send';   // vágólapra másolás / elküldés a levélíróból
  edited?: boolean;          // küldésnél: átírta-e a tervet a felhasználó
  chars?: number;            // a végleges szöveg hossza
}

export async function GET() {
  try { return NextResponse.json({ ok: true, data: JSON.parse(await fs.readFile(FILE, 'utf8')) }); }
  catch { return NextResponse.json({ ok: true, data: [] }); }
}

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  try {
    const e = await req.json() as LogEntry;
    if (!e || typeof e.at !== 'string' || typeof e.label !== 'string') {
      return NextResponse.json({ ok: false, error: 'invalid entry' }, { status: 400 });
    }
    let list: LogEntry[] = [];
    try { list = JSON.parse(await fs.readFile(FILE, 'utf8')) as LogEntry[]; } catch { /* első bejegyzés */ }
    list.push(e);
    if (list.length > 300) list = list.slice(-300);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(list, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
