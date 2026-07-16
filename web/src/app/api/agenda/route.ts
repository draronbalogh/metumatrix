import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { canWrite, writeDenied } from '@/lib/editauth';
import { Agenda, AgendaSource, normalizeAgenda } from '@/data/agenda';

// A feladatok + események egyetlen forrása — a tanterv-fájl mintájára.
// Hiányzó fájlnál az app a beépített DEFAULT_AGENDA-ra esik vissza, az első mentés hozza létre.
const FILE = process.env.AGENDA_FILE
  || 'C:/node/metu_tanterv/grid/media-design-agenda.json';

export const dynamic = 'force-dynamic';

type Doc = Partial<Agenda> & { rev?: number };

const readDisk = async (): Promise<Doc | null> => {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')) as Doc; } catch { return null; }
};

// A source felhasználó-tulajdonú (állapotgép-) mezői: bot-írásnál a lemezen lévő
// érték él tovább, kivéve a megengedett bot-átmeneteket — ébresztés/újranyitás
// → 'pending', saját kimenő válasz észlelése → 'replied', de csak 'pending'-ből.
const USER_SOURCE_FIELDS = ['status', 'replied', 'repliedAt', 'snoozeUntil', 'followUpAt', 'returned'] as const;
const guardSource = (inc: AgendaSource | null | undefined, disk: AgendaSource | null | undefined): AgendaSource | null => {
  if (!disk) return inc ?? null;
  if (!inc) return disk; // a bot forrást nem törölhet
  const i = inc as unknown as Record<string, unknown>;
  const d = disk as unknown as Record<string, unknown>;
  const s = i.status;
  const okTransition = s === 'pending'
    || (s === 'replied' && (d.status === 'pending' || d.status == null));
  if (okTransition && s !== d.status) return inc;
  const out: Record<string, unknown> = { ...i };
  for (const f of USER_SOURCE_FIELDS) {
    if (d[f] !== undefined) out[f] = d[f];
    else delete out[f];
  }
  return out as unknown as AgendaSource;
};

// Bot-írás védőrács: tételt nem törölhet, leveleket/téma-kapcsolatokat nem írhat,
// a source felhasználói mezőit csak a megengedett átmenetekkel változtathatja.
const guardBotWrite = (inc: Doc, disk: Doc | null): Doc => {
  if (!disk) return inc;
  const guardList = <T extends { id: string; source?: AgendaSource | null }>(incList: T[], diskList: T[]): T[] => {
    const diskById = new Map(diskList.map((x) => [x.id, x]));
    const out = incList.map((it) => {
      const dd = diskById.get(it.id);
      return dd ? { ...it, source: guardSource(it.source, dd.source) } : it;
    });
    const incIds = new Set(incList.map((x) => x.id));
    diskList.forEach((dd) => { if (!incIds.has(dd.id)) out.push(dd); });
    return out;
  };
  return {
    ...inc,
    tasks: guardList(inc.tasks ?? [], disk.tasks ?? []),
    events: guardList(inc.events ?? [], disk.events ?? []),
    letters: disk.letters ?? inc.letters ?? [],
    topicLinks: disk.topicLinks ?? inc.topicLinks ?? {},
  };
};

// GET: a fájl minden olvasási határon normalizálva megy ki (migráció + ébresztések),
// a rev-vel együtt — az írók ezt a rev-et küldik vissza a POST-ban.
export async function GET() {
  const disk = await readDisk();
  if (!disk) return NextResponse.json({ ok: false, data: null });
  const rev = typeof disk.rev === 'number' ? disk.rev : 0;
  return NextResponse.json({ ok: true, data: { ...normalizeAgenda(disk), rev } }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  try {
    const body = await req.json() as Doc;
    if (!body || !Array.isArray(body.tasks) || !Array.isArray(body.events)) {
      return NextResponse.json({ ok: false, error: 'invalid agenda' }, { status: 400 });
    }
    const disk = await readDisk();
    const diskRev = disk && typeof disk.rev === 'number' ? disk.rev : 0;
    // optimista ütközésvédelem: aki rev-et küld, csak az általa látott verzióra
    // írhat — eltérésnél 409, az írónak frissen kell olvasnia és újra fésülnie.
    // rev nélküli POST (visszaállítás, régi szkript) továbbra is átmegy.
    const baseRev = typeof body.rev === 'number' ? body.rev : null;
    if (baseRev !== null && disk && baseRev !== diskRev) {
      return NextResponse.json({ ok: false, error: 'conflict', rev: diskRev }, { status: 409 });
    }
    const isBot = req.headers.get('x-writer') === 'bot';
    const doc = isBot ? guardBotWrite(body, disk) : body;
    const nextRev = diskRev + 1;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ ...doc, rev: nextRev }, null, 2), 'utf8');
    return NextResponse.json({ ok: true, rev: nextRev });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
