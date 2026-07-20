import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { canRead, readDenied } from '@/lib/editauth';

// Az abalogh@metropolitan.hu (KLASSZIKUS Outlook) NAPTAR olvasasa COM-mal, a metumatrix
// agendaba importalashoz. CSAK OLVAS. A PowerShellt a nem-emelt dev-szerver spawnolja (a COM
// csak igy megy, mint az outlook-drafts-nal), es a klasszikus Outlook fusson.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCRIPT = process.env.OUTLOOK_CALENDAR_SCRIPT || 'C:/node/metu_tanterv/automation/read-outlook-calendar.ps1';

const runPs = (extra: string[]): Promise<{ out: string; code: number }> => new Promise((resolve) => {
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, ...extra];
  execFile('powershell.exe', args, { timeout: 120000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
    (err, stdout, stderr) => resolve({ out: (`${stdout || ''}`.trim() || `${stderr || ''}`.trim()), code: err ? 1 : 0 }));
});

export interface OutlookEvent { id: string; subject: string; start: string; end: string; allDay: boolean; location: string; organizer: string; gist: string }

export async function GET(req: Request) {
  if (!canRead(req)) return readDenied();
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 60));
  const { out } = await runPs(['-Days', String(days)]);
  try {
    const j = JSON.parse(out) as { ok: boolean; error?: string; events?: OutlookEvent[] | OutlookEvent };
    if (!j.ok) return NextResponse.json({ ok: false, error: j.error ?? 'ismeretlen hiba', raw: out.slice(0, 500) });
    // ConvertTo-Json egy elemnel objektumot ad tomb helyett - normalizaljuk
    const events = Array.isArray(j.events) ? j.events : j.events ? [j.events] : [];
    return NextResponse.json({ ok: true, events });
  } catch {
    return NextResponse.json({ ok: false, error: 'A naptár-olvasó válasza nem JSON (fut a klasszikus Outlook?)', raw: out.slice(0, 500) });
  }
}
