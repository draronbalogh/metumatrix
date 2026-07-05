import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { sendMail, mailerConfigured } from '@/lib/mailer';

// Kézi email-küldés a NotifyModalból. A kliens oldja fel a neveket/csoportokat email-lé,
// és a végleges címlistát küldi ide; a szerver csak küld (Gmail SMTP) és naplóz.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG = process.env.NOTIFY_LOG || 'C:/node/metu_tanterv/grid/media-design-notifylog.json';

export async function GET() {
  // állapot: be van-e állítva a küldő (a UI ez alapján tiltja/engedi a gombot)
  return NextResponse.json({ ok: true, configured: mailerConfigured() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subject: string = (body?.subject || '').trim();
    const html: string | undefined = body?.html;
    const text: string | undefined = body?.text;
    const to: string[] = Array.isArray(body?.to) ? body.to : [];
    const bcc: string[] = Array.isArray(body?.bcc) ? body.bcc : [];
    if (!subject) return NextResponse.json({ ok: false, error: 'Hiányzó tárgy.' }, { status: 400 });
    if (!to.length && !bcc.length) return NextResponse.json({ ok: false, error: 'Nincs címzett.' }, { status: 400 });

    const res = await sendMail({ subject, html, text, to, bcc });
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });

    // napló (best-effort, nem blokkolja a választ hiba esetén)
    try {
      let log: unknown[] = [];
      try { log = JSON.parse(await fs.readFile(LOG, 'utf8')); } catch { /* első bejegyzés */ }
      log.push({ ts: new Date().toISOString(), subject, count: to.length + bcc.length, to: [...to, ...bcc], kind: 'manual' });
      await fs.mkdir(path.dirname(LOG), { recursive: true });
      await fs.writeFile(LOG, JSON.stringify(log, null, 2), 'utf8');
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, messageId: res.messageId, sent: to.length + bcc.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
