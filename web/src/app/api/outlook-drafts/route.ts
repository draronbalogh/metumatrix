import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { canWrite, writeDenied } from '@/lib/editauth';

// Outlook-vázlatok készítése a Posta 'drafted' (Másolható) soraiból, a KLASSZIKUS
// asztali Outlookon át (PowerShell + COM). A dev-szerver nem-emelt felhasználóként fut,
// így a spawn-olt PowerShell ugyanazon a jogosultsági szinten van, mint az Outlook -
// ezért itt működik a COM (közvetlen, elevated shell-ből NEM). Küldés SOHA nem történik.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCRIPT = process.env.OUTLOOK_DRAFT_SCRIPT || 'C:/node/metu_tanterv/automation/create-outlook-drafts.ps1';
const LOG = process.env.OUTLOOK_DRAFT_LOG || 'C:/node/metu_tanterv/automation/logs/drafts.log';

const runPs = (extra: string[]): Promise<{ out: string; code: number }> => new Promise((resolve) => {
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, ...extra];
  execFile('powershell.exe', args, { timeout: 180000, maxBuffer: 1024 * 1024, windowsHide: true },
    (err, stdout, stderr) => resolve({ out: `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim(), code: err ? (typeof (err as { code?: number }).code === 'number' ? (err as { code: number }).code : 1) : 0 }));
});

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const fresh = new URL(req.url).searchParams.get('fresh') === '1';
  // a kártya id-t / a mind-küldés jelzőt a törzsből olvassuk; a piszkozat-ág törzs nélkül is megy
  let sendId: string | null = null;
  let sendAll = false;
  let draftId: string | null = null;
  let testDefer = 0;
  let checkSent: string | null = null;
  let outboundId: string | null = null;      // egy Titkárnő-levél piszkozata (levél-id)
  let outboundSendId: string | null = null;   // egy Titkárnő-levél azonnali küldése
  let outboundAll = false;                     // az összes kimenő levél piszkozata
  try {
    const b = await req.json() as { sendId?: unknown; sendAll?: unknown; draftId?: unknown; testDefer?: unknown; checkSent?: unknown; outboundId?: unknown; outboundSendId?: unknown; outboundAll?: unknown };
    if (typeof b?.sendId === 'string' && b.sendId.trim()) sendId = b.sendId.trim();
    if (b?.sendAll === true) sendAll = true;
    if (typeof b?.draftId === 'string' && b.draftId.trim()) draftId = b.draftId.trim();
    if (typeof b?.testDefer === 'number' && b.testDefer > 0 && b.testDefer <= 20) testDefer = Math.round(b.testDefer);
    if (typeof b?.checkSent === 'string' && b.checkSent.trim()) checkSent = b.checkSent.trim().slice(0, 80);
    if (typeof b?.outboundId === 'string' && b.outboundId.trim()) outboundId = b.outboundId.trim();
    if (typeof b?.outboundSendId === 'string' && b.outboundSendId.trim()) outboundSendId = b.outboundSendId.trim();
    if (b?.outboundAll === true) outboundAll = true;
  } catch { /* nincs törzs */ }

  // TESZT: késleltetett kézbesítés kipróbálása (self-levél) + fióktípus (A/B). Csak saját címre küld.
  if (testDefer > 0) {
    const { out, code } = await runPs(['-TestDefer', String(testDefer)]);
    try { await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (TESTDEFER ${testDefer}, exit=${code}) ====\n${out}\n`, 'utf8'); } catch { /* ignore */ }
    const scheduled = /TEST_SCHEDULED=1/.test(out);
    const whenM = out.match(/WHEN=(\S+)/);
    const acctM = out.match(/FIOKOK: (.+)/);
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: scheduled && !comError && code === 0, scheduled, when: whenM ? whenM[1] : null, accounts: acctM ? acctM[1].trim() : null, comError, output: out });
  }
  // TESZT-ELLENŐRZÉS: egy tárgy-töredék megvan-e a Sent / Outbox mappában
  if (checkSent) {
    const { out, code } = await runPs(['-CheckSent', checkSent]);
    const m = out.match(/CHECK: SENT=(\d+) OUTBOX=(\d+)/);
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: !comError && code === 0, sent: m ? Number(m[1]) : null, outbox: m ? Number(m[2]) : null, comError, output: out });
  }

  // EGY-KÁRTYA PISZKOZAT-ÁG: egyetlen kártya -> Outlook Piszkozatok (a UI kártyánkénti
  // „Outlookba" gombja). Küldés NEM történik. Csak whitelistelt id-alak mehet a parancssorba.
  if (draftId) {
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(draftId)) return NextResponse.json({ ok: false, error: 'ervenytelen id' }, { status: 400 });
    const { out, code } = await runPs(['-DraftId', draftId]);
    try {
      await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
      await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (DRAFT ${draftId}, exit=${code}) ====\n${out}\n`, 'utf8');
    } catch { /* a napló nem kritikus */ }
    const madeMatch = out.match(/DRAFTS_MADE=(\d+)/);
    const skipMatch = out.match(/DRAFTS_SKIPPED=(\d+)/);
    const made = madeMatch ? Number(madeMatch[1]) : null;
    const skipped = skipMatch ? Number(skipMatch[1]) : null;
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: !comError && code === 0, draft: true, made, skipped, comError, output: out });
  }

  // KÜLDÉS-MIND-ÁG: az ÖSSZES kész válasz elküldése (a UI „Mind küldése" gombja, megerősítéssel).
  if (sendAll) {
    const { out, code } = await runPs(['-SendAll']);
    try {
      await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
      await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (SENDALL, exit=${code}) ====\n${out}\n`, 'utf8');
    } catch { /* a napló nem kritikus */ }
    const sentIds = [...out.matchAll(/SENT_ID=(\S+)/g)].map((m) => m[1]);
    const mm = out.match(/SENTALL=(\d+)\s+FAILED=(\d+)/);
    const comError = /COM HIBA/i.test(out);
    const marked = /SENDALL_MARKED=1/.test(out); // a ps1 már a szerveren replied-re tette őket
    return NextResponse.json({ ok: !comError && code === 0, sentAll: true, sent: mm ? Number(mm[1]) : sentIds.length, failed: mm ? Number(mm[2]) : 0, sentIds, marked, comError, output: out });
  }

  // KÜLDÉS-ÁG: egy konkrét kártya elküldése (a UI „Küldés most" gombja). Csak whitelistelt
  // id-alak (t123 / e123-szerű) mehet a parancssorba, hogy ne lehessen argumentumot injektálni.
  if (sendId) {
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(sendId)) return NextResponse.json({ ok: false, error: 'ervenytelen id' }, { status: 400 });
    const { out, code } = await runPs(['-SendId', sendId]);
    try {
      await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
      await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (SEND ${sendId}, exit=${code}) ====\n${out}\n`, 'utf8');
    } catch { /* a napló nem kritikus */ }
    const sent = /SENT=1/.test(out);
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: sent && !comError && code === 0, sent, comError, output: out });
  }

  // KIMENŐ (Titkárnő) PISZKOZAT-ÁG: egy kezdeményezett levél -> Outlook Piszkozatok
  // (a Posta „Kimenő" szekció „Outlookba" gombja). Levél-id (l-...) whitelist. Küldés NEM.
  if (outboundId) {
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(outboundId)) return NextResponse.json({ ok: false, error: 'ervenytelen id' }, { status: 400 });
    const { out, code } = await runPs(['-OutboundId', outboundId]);
    try { await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (OUTBOUND ${outboundId}, exit=${code}) ====\n${out}\n`, 'utf8'); } catch { /* ignore */ }
    const madeMatch = out.match(/DRAFTS_MADE=(\d+)/);
    const skipMatch = out.match(/DRAFTS_SKIPPED=(\d+)/);
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: !comError && code === 0, draft: true, made: madeMatch ? Number(madeMatch[1]) : null, skipped: skipMatch ? Number(skipMatch[1]) : null, comError, output: out });
  }

  // KIMENŐ KÜLDÉS-ÁG: egy kezdeményezett levél AZONNALI küldése (a „Küldés most" gomb).
  if (outboundSendId) {
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(outboundSendId)) return NextResponse.json({ ok: false, error: 'ervenytelen id' }, { status: 400 });
    const { out, code } = await runPs(['-OutboundSendId', outboundSendId]);
    try { await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (OUTBOUND-SEND ${outboundSendId}, exit=${code}) ====\n${out}\n`, 'utf8'); } catch { /* ignore */ }
    const sent = /SENT=1/.test(out);
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: sent && !comError && code === 0, sent, comError, output: out });
  }

  // KIMENŐ MIND PISZKOZAT-ÁG: az összes kimenő levél -> Piszkozatok.
  if (outboundAll) {
    const { out, code } = await runPs(['-OutboundAll']);
    try { await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true }); await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (OUTBOUND-ALL, exit=${code}) ====\n${out}\n`, 'utf8'); } catch { /* ignore */ }
    const madeMatch = out.match(/DRAFTS_MADE=(\d+)/);
    const skipMatch = out.match(/DRAFTS_SKIPPED=(\d+)/);
    const comError = /COM HIBA/i.test(out);
    return NextResponse.json({ ok: !comError && code === 0, made: madeMatch ? Number(madeMatch[1]) : null, skipped: skipMatch ? Number(skipMatch[1]) : null, comError, output: out });
  }

  // PISZKOZAT-ÁG (alapértelmezett): a köteg összes kész válasza -> Piszkozatok
  const extra: string[] = [];
  if (dry) extra.push('-DryRun');
  if (fresh) extra.push('-Fresh');
  const { out, code } = await runPs(extra);
  // napló (a manuális ellenőrzéshez), a válaszban a nyers kimenet is megy
  try {
    await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (dry=${dry}, fresh=${fresh}, exit=${code}) ====\n${out}\n`, 'utf8');
  } catch { /* a napló nem kritikus */ }
  // a PS ASCII-jelzője kódolás-független: DRAFTS_MADE=N DRAFTS_SKIPPED=M
  const madeMatch = out.match(/DRAFTS_MADE=(\d+)/);
  const skipMatch = out.match(/DRAFTS_SKIPPED=(\d+)/);
  const made = madeMatch ? Number(madeMatch[1]) : null;
  const skipped = skipMatch ? Number(skipMatch[1]) : null;
  const comError = /COM HIBA/i.test(out);
  return NextResponse.json({ ok: !comError && code === 0, dry, made, skipped, comError, output: out });
}
