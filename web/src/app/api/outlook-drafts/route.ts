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

const runPs = (dry: boolean): Promise<{ out: string; code: number }> => new Promise((resolve) => {
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT];
  if (dry) args.push('-DryRun');
  execFile('powershell.exe', args, { timeout: 180000, maxBuffer: 1024 * 1024, windowsHide: true },
    (err, stdout, stderr) => resolve({ out: `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim(), code: err ? (typeof (err as { code?: number }).code === 'number' ? (err as { code: number }).code : 1) : 0 }));
});

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const { out, code } = await runPs(dry);
  // napló (a manuális ellenőrzéshez), a válaszban a nyers kimenet is megy
  try {
    await fs.mkdir(LOG.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    await fs.appendFile(LOG, `\n==== ${new Date().toISOString()} (dry=${dry}, exit=${code}) ====\n${out}\n`, 'utf8');
  } catch { /* a napló nem kritikus */ }
  // a PS ASCII-jelzője kódolás-független: DRAFTS_MADE=N DRAFTS_SKIPPED=M
  const madeMatch = out.match(/DRAFTS_MADE=(\d+)/);
  const skipMatch = out.match(/DRAFTS_SKIPPED=(\d+)/);
  const made = madeMatch ? Number(madeMatch[1]) : null;
  const skipped = skipMatch ? Number(skipMatch[1]) : null;
  const comError = /COM HIBA/i.test(out);
  return NextResponse.json({ ok: !comError && code === 0, dry, made, skipped, comError, output: out });
}
