import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Agenda, fmtDueHu, normalizeAgenda } from '@/data/agenda';
import { PeopleDB, normalizePeople } from '@/data/people';
import { resolveNames } from '@/lib/recipients';
import { sendBcc, isConfigured } from '@/lib/mailer';

// Automatikus emlékeztető: az ütemező (reminder-cron) hívja a NOTIFY_SECRET fejléccel.
// Kiszámolja az esedékes emlékeztetőket (esemény `day` / feladat `dueDate` a REMINDER_DAYS_BEFORE
// ablakon belül), kiküldi a tétel résztvevőinek, majd elmenti az állapotot (idempotens).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGENDA = process.env.AGENDA_FILE || 'C:/node/metu_tanterv/grid/media-design-agenda.json';
const PEOPLE = process.env.PEOPLE_FILE || 'C:/node/metu_tanterv/grid/media-design-people.json';
const STATE = process.env.REMINDER_STATE || 'C:/node/metu_tanterv/grid/media-design-reminders-state.json';
const LOG = process.env.NOTIFY_LOG || 'C:/node/metu_tanterv/grid/media-design-notifylog.json';

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; }
}
async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

// helyi (Budapest) mai dátum ÉÉÉÉ-HH-NN
function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// hány nap múlva van a cél (target - today), naptári napokban
function daysUntil(targetYMD: string, today: string): number {
  const [ty, tm, td] = targetYMD.split('-').map(Number);
  const [cy, cm, cd] = today.split('-').map(Number);
  const t = Date.UTC(ty, tm - 1, td);
  const c = Date.UTC(cy, cm - 1, cd);
  return Math.round((t - c) / 86400000);
}

function offsets(): number[] {
  return (process.env.REMINDER_DAYS_BEFORE || '7,1').split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n >= 0);
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

export async function POST(req: Request) {
  const secret = process.env.NOTIFY_SECRET;
  const given = req.headers.get('x-notify-secret') || new URL(req.url).searchParams.get('secret');
  if (!secret || given !== secret) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ ok: false, error: 'mailer not configured' }, { status: 503 });

  const agenda: Agenda = normalizeAgenda(await readJson(AGENDA, {} as Partial<Agenda>));
  const db: PeopleDB = normalizePeople(await readJson(PEOPLE, {} as Partial<PeopleDB>));
  const state: Record<string, string> = await readJson(STATE, {});
  const today = todayYMD();
  const offs = offsets();

  interface Due { key: string; kind: 'event' | 'task'; title: string; when: string; place: string | null; names: string[]; days: number; }
  const due: Due[] = [];

  agenda.events.forEach((e) => {
    if (!e.day) return;
    const dleft = daysUntil(e.day, today);
    if (!offs.includes(dleft)) return;
    const key = `e:${e.id}@${e.day}:${dleft}`;
    if (state[key]) return;
    due.push({ key, kind: 'event', title: e.title, when: e.when || e.day, place: e.place, days: dleft, names: [e.owner, ...e.people].filter((n): n is string => !!n) });
  });
  agenda.tasks.forEach((t) => {
    if (!t.dueDate || t.status === 'done') return;
    // a dueDate lehet hónap-pontosságú ('ÉÉÉÉ-HH') vagy órás ('ÉÉÉÉ-HH-NN ÓÓ:PP') is —
    // emlékeztetőt csak nap-pontosságú határidőre számolunk
    const ymd = t.dueDate.length >= 10 ? t.dueDate.slice(0, 10) : null;
    if (!ymd) return;
    const dleft = daysUntil(ymd, today);
    if (!offs.includes(dleft)) return;
    const key = `t:${t.id}@${ymd}:${dleft}`;
    if (state[key]) return;
    due.push({ key, kind: 'task', title: t.title, when: fmtDueHu(t.dueDate) || t.due || ymd, place: null, days: dleft, names: [t.owner, ...t.people].filter((n): n is string => !!n) });
  });

  const results: { key: string; sent: number; skipped?: string }[] = [];
  const logEntries: unknown[] = [];
  for (const d of due) {
    const { emails } = resolveNames(db, d.names);
    if (!emails.length) { results.push({ key: d.key, sent: 0, skipped: 'nincs email-cím' }); state[d.key] = new Date().toISOString(); continue; }
    const whenTxt = d.days === 0 ? 'ma' : d.days === 1 ? 'holnap' : `${d.days} nap múlva`;
    const label = d.kind === 'event' ? 'Esemény' : 'Feladat határidő';
    const subject = `Emlékeztető: ${d.title} — ${whenTxt}`;
    const html = `<p><strong>${esc(label)}:</strong> ${esc(d.title)}</p>`
      + `<p>Időpont: <strong>${esc(d.when)}</strong> (${whenTxt})</p>`
      + (d.place ? `<p>Helyszín: ${esc(d.place)}</p>` : '')
      + `<p style="color:#888;font-size:12px">Automatikus emlékeztető a METU Média Design tanszéki felületről.</p>`;
    const res = await sendBcc({ subject, html, recipients: emails });
    if (res.sent > 0) {
      state[d.key] = new Date().toISOString();
      results.push({ key: d.key, sent: res.sent });
      logEntries.push({ ts: new Date().toISOString(), subject, sent: res.sent, failed: res.failed, kind: 'reminder' });
    } else {
      results.push({ key: d.key, sent: 0, skipped: res.batches[0]?.error || 'küldés sikertelen' });
    }
  }

  await writeJson(STATE, state);
  if (logEntries.length) {
    try {
      const log: unknown[] = await readJson(LOG, []);
      log.push(...logEntries);
      await writeJson(LOG, log);
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, today, checked: agenda.events.length + agenda.tasks.length, due: due.length, results });
}
