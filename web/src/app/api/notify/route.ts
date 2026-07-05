import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { sendBcc, isConfigured, verifyTransport } from '@/lib/mailer';

// Kézi email-küldés a NotifyModalból. A kliens oldja fel a neveket/csoportokat email-lé,
// és a végleges címlistát küldi ide; a szerver BCC-vel, kötegelve küld (Gmail keret) és naplóz.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG = process.env.NOTIFY_LOG || 'C:/node/metu_tanterv/grid/media-design-notifylog.json';

export async function GET(req: Request) {
  const verify = new URL(req.url).searchParams.get('verify');
  if (verify && isConfigured()) {
    try { await verifyTransport(); return NextResponse.json({ ok: true, configured: true, verified: true }); }
    catch (e) { return NextResponse.json({ ok: true, configured: true, verified: false, error: String(e) }); }
  }
  return NextResponse.json({ ok: true, configured: isConfigured() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subject: string = (body?.subject || '').trim();
    const html: string | undefined = body?.html;
    const text: string | undefined = body?.text;
    // a csoportlevél BCC-vel megy; elfogadjuk a to/bcc bármelyikét címlistaként
    const recipients: string[] = [
      ...(Array.isArray(body?.bcc) ? body.bcc : []),
      ...(Array.isArray(body?.to) ? body.to : []),
    ];
    if (!subject) return NextResponse.json({ ok: false, error: 'Hiányzó tárgy.' }, { status: 400 });
    if (!recipients.length) return NextResponse.json({ ok: false, error: 'Nincs címzett.' }, { status: 400 });
    if (!isConfigured()) return NextResponse.json({ ok: false, error: 'A mailer nincs beállítva (web/.env.local).' }, { status: 503 });

    const res = await sendBcc({ subject, html, text, recipients });

    // napló (best-effort)
    try {
      let log: unknown[] = [];
      try { log = JSON.parse(await fs.readFile(LOG, 'utf8')); } catch { /* első bejegyzés */ }
      log.push({ ts: new Date().toISOString(), subject, attempted: res.attempted, sent: res.sent, failed: res.failed, kind: 'manual' });
      await fs.mkdir(path.dirname(LOG), { recursive: true });
      await fs.writeFile(LOG, JSON.stringify(log, null, 2), 'utf8');
    } catch { /* ignore */ }

    return NextResponse.json({ ok: res.failed === 0, sent: res.sent, failed: res.failed, batches: res.batches });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
