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
  // a kártya id-t csak a törzsből olvassuk (küldés-ág); a piszkozat-ág törzs nélkül is megy
  let sendId: string | null = null;
  try { const b = await req.json() as { sendId?: unknown }; if (typeof b?.sendId === 'string' && b.sendId.trim()) sendId = b.sendId.trim(); } catch { /* nincs törzs */ }

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
