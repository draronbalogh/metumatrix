import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { canWrite, writeDenied } from '@/lib/editauth';
import { Agenda, AgendaTask, AgendaEvent, AgendaSource, DEFAULT_OWNER } from '@/data/agenda';

// A hajnali (-Staggered) küldés visszaigazolása: a ténylegesen kimen(t) kártyák válaszát
// AZONNAL 'replied'-re, a kimenő (Titkárnő) leveleket 'sent'-re állítja - nem várunk a
// 07:00 szinkronra. Szerver-oldali read-modify-write (a friss fájlt olvassa, csak a
// státusz-mezőket írja), így nem klobberol. A kliens gombjai (Küldés most / Mind) továbbra
// is a saját útjukon jelölnek; ez a hajnali, kliens nélküli út hiányzó láncszeme.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE = process.env.AGENDA_FILE || 'C:/node/metu_tanterv/grid/media-design-agenda.json';
type Doc = Partial<Agenda> & { rev?: number };

// PowerShell ConvertTo-Json egyelemű tömböt skalárrá lapít - ezért skalárt is elfogadunk
const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string')
    : (typeof v === 'string' && v ? [v] : []);

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let b: { replies?: unknown; outbound?: unknown };
  try { b = await req.json() as { replies?: unknown; outbound?: unknown }; } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  const replies = toStrArr(b.replies);
  const outbound = toStrArr(b.outbound);
  if (!replies.length && !outbound.length) return NextResponse.json({ ok: true, repliedCount: 0, sentCount: 0 });

  let disk: Doc | null = null;
  try { disk = JSON.parse(await fs.readFile(FILE, 'utf8')) as Doc; } catch { return NextResponse.json({ ok: false, error: 'nincs agenda' }, { status: 404 }); }
  if (!disk) return NextResponse.json({ ok: false, error: 'nincs agenda' }, { status: 404 });

  const now = new Date().toISOString();
  const tasks = (disk.tasks ?? []) as AgendaTask[];
  const events = (disk.events ?? []) as AgendaEvent[];
  const letters = disk.letters ?? [];

  let repliedCount = 0;
  const markReply = (kind: 't' | 'e', id: string): void => {
    const item: { source?: AgendaSource | null } | undefined = kind === 't'
      ? tasks.find((x) => x.id === id)
      : events.find((x) => x.id === id);
    const src = item?.source;
    if (!item || !src || !src.email || src.status === 'replied') return;
    const thread = [...(src.thread ?? []), { at: now, from: DEFAULT_OWNER, dir: 'out' as const, gist: 'elküldve (hajnali ütemezett)' }];
    item.source = { ...src, status: 'replied', repliedAt: now, returned: null, scheduledFor: null, thread };
    repliedCount++;
  };
  for (const sel of replies) {
    const kind: 't' | 'e' = sel[0] === 'e' ? 'e' : 't';
    const id = sel.slice(2);
    if (id) markReply(kind, id);
  }

  let sentCount = 0;
  for (const lid of outbound) {
    const l = letters.find((x) => x.id === lid);
    if (l && l.status !== 'sent') { l.status = 'sent'; l.scheduledFor = null; sentCount++; }
  }

  // nincs tényleges változás (nem talált id): ne írjunk feleslegesen (ne pörögjön a rev)
  if (repliedCount === 0 && sentCount === 0) return NextResponse.json({ ok: true, repliedCount: 0, sentCount: 0 });
  const nextRev = (typeof disk.rev === 'number' ? disk.rev : 0) + 1;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ ...disk, tasks, events, letters, rev: nextRev }, null, 2), 'utf8');
  return NextResponse.json({ ok: true, repliedCount, sentCount, rev: nextRev });
}
