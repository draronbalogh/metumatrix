import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import os from 'os';
import { canWrite, writeDenied } from '@/lib/editauth';

// Kimenet a kártyára: a diktált meeting-eredményből 1-2 mondatos, tárgyilagos
// jegyzet-összefoglaló a helyi claude CLI-vel. Hibánál a kliens a nyers szöveget
// menti (a diktátum SOSEM vész el). A compose/rephrase kistestvére, levél-keret nélkül.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'C:\\Users\\User\\.local\\bin\\claude.exe';

interface SummarizeReq {
  text: string;          // a diktált nyers kimenet
  title?: string | null; // a feladat címe (kontextus)
}

const runClaude = (prompt: string): Promise<{ out: string; failed: boolean }> => new Promise((resolve) => {
  const child = execFile(CLAUDE_BIN, ['-p', '--max-turns', '1'], {
    cwd: os.tmpdir(), timeout: 90000, maxBuffer: 1024 * 1024, windowsHide: true,
  }, (e, stdout) => resolve({ out: String(stdout || ''), failed: !!e }));
  child.stdin?.write(prompt, 'utf8');
  child.stdin?.end();
});

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let b: SummarizeReq;
  try { b = await req.json() as SummarizeReq; } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  if (!b?.text?.trim()) return NextResponse.json({ ok: false, error: 'üres szöveg' }, { status: 400 });
  const prompt = `Az alábbi diktált szöveg egy megbeszélés/ügy KIMENETE${b.title ? ` (a feladat: "${b.title}")` : ''}.
Foglald össze 1-2 tömör, tárgyilagos magyar mondatban, jegyzet-stílusban (nem levél: nincs megszólítás,
nincs elköszönés, nincs udvariaskodás). Minden érdemi döntést/eredményt tarts meg, a töltelékszavakat hagyd el.
TILOS a hosszú gondolatjel (—) karakter.

"""
${b.text.trim().slice(0, 4000)}
"""

A VÁLASZOD KIZÁRÓLAG ez a JSON legyen, más szöveg nélkül:
{"summary": "az 1-2 mondatos összefoglaló"}`;
  try {
    const { out, failed } = await runClaude(prompt);
    const raw = out.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    if (!raw || failed) return NextResponse.json({ ok: false, error: 'nincs válasz' }, { status: 502 });
    let summary = '';
    try {
      const p = JSON.parse(raw) as { summary?: string };
      summary = (p.summary ?? '').trim();
    } catch { summary = raw.length < 500 ? raw : ''; }
    summary = summary.replace(/\s*—\s*/g, ', ').trim();
    if (!summary) return NextResponse.json({ ok: false, error: 'üres összefoglaló' }, { status: 502 });
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `összefoglaló-hiba: ${String(e).slice(0, 200)}` }, { status: 502 });
  }
}
