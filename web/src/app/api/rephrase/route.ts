import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import os from 'os';
import { canWrite, writeDenied } from '@/lib/editauth';

// Titkárnő-mód: a felhasználó nyers (diktált) döntéséből VÉGLEGES magyar választ
// fogalmaz a helyi claude CLI-vel - ugyanaz a motor, mint a napi Outlook-szinkron.
// A nyers szöveg csak a TARTALMAT adja; a stílust a stílusfájl + a bot-tervek viszik.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'C:\\Users\\User\\.local\\bin\\claude.exe';
const STYLE_FILE = process.env.STYLE_FILE || 'C:/node/metu_tanterv/grid/valasz-stilus.md';

interface RephraseReq {
  senderName: string;
  senderEmail: string;
  subject: string | null;
  gist: string | null;
  thread: string[];      // "dátum · irány · ki: mit" sorok
  drafts: { label: string; subject: string; body: string }[]; // a bot 3 terve: regiszter-minta
  instruction: string;   // a felhasználó nyers döntése/diktátuma
}

// a CLI kimenetét akkor is visszaadjuk, ha nem-nulla kóddal lép ki (pl. keret-limit
// üzenetet a stdout-ra írja) - a hívó dönti el, használható-e
const runClaude = (prompt: string): Promise<{ out: string; err: string; failed: boolean }> => new Promise((resolve) => {
  const child = execFile(CLAUDE_BIN, ['-p', '--max-turns', '1'], {
    cwd: os.tmpdir(), timeout: 150000, maxBuffer: 1024 * 1024, windowsHide: true,
  }, (e, stdout, stderr) => resolve({ out: String(stdout || ''), err: String(stderr || ''), failed: !!e }));
  child.stdin?.write(prompt, 'utf8');
  child.stdin?.end();
});
// a helyi claude keret/hitelesítés kifogyott-e (ezt a szöveget a CLI a kimenetre írja)
const isQuota = (s: string): boolean => /limit|usage-?credit|rate.?limit|quota|Run \/login|not (?:logged|authenticated)/i.test(s);

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let b: RephraseReq;
  try { b = await req.json() as RephraseReq; } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  if (!b?.instruction?.trim()) return NextResponse.json({ ok: false, error: 'üres diktátum' }, { status: 400 });

  let style = '';
  try { style = (await fs.readFile(STYLE_FILE, 'utf8')).slice(0, 6000); } catch { /* stílusfájl nélkül is megy */ }

  const draftsTxt = (b.drafts ?? []).slice(0, 3).map((d, i) =>
    `--- ${i + 1}. terv (${d.label}) · tárgy: ${d.subject}\n${d.body}`).join('\n\n');

  const prompt = `Te Balogh Áron (METU Média Design szakvezető) titkárságát viszed: az alábbi
bejövő levélre írsz VÉGLEGES magyar választ Áron nevében.

A LEVÉL, AMIRE VÁLASZOLUNK:
- Feladó: ${b.senderName} <${b.senderEmail}>
- Tárgy: ${b.subject ?? '(nincs)'}
- Összefoglaló: ${b.gist ?? '(nincs)'}
${b.thread?.length ? `- A szál idővonala:\n${b.thread.map((t) => `  ${t}`).join('\n')}` : ''}

ÁRON NYERS DÖNTÉSE (diktálva, kapkodva - CSAK a tartalma számít, a megfogalmazása nem):
"""
${b.instruction.trim()}
"""

REGISZTER-MINTA - a szinkron által erre a levélre írt tervek (a megszólítás,
tegeződés/magázódás és hangnem EZEKHEZ igazodjon):
${draftsTxt || '(nincs terv - a stílusfájl megszólalásaiból dolgozz)'}

ÁRON STÍLUSFÁJLJA (fordulat-készlet):
${style || '(nem elérhető)'}

SZABÁLYOK:
- A nyers döntés MINDEN tartalmi elemét építsd be; amit Áron eldöntött, azt nem írhatod felül.
- Ha a diktátum szerint kérdezni kell, kérdezz; ha igent/nemet mondott, azt közöld udvariasan.
- Hangnem: korrekt, kollegiális, tényszerű - semmi érzelgősség, semmi túlzó udvariaskodás.
- TILOS a hosszú gondolatjel (—) karakter; helyette vessző, pont vagy sima kötőjel.
- Rövid, jól tagolt levél; aláírást NE írj (azt az app teszi hozzá).
- Ne találj ki tényt, dátumot, nevet, ami se a levélben, se a diktátumban nincs benne.

A VÁLASZOD KIZÁRÓLAG ez a JSON legyen, más szöveg nélkül:
{"subject": "a válasz tárgysora (Re: ...)", "body": "a levél teljes szövege"}`;

  try {
    const { out, err } = await runClaude(prompt);
    const raw = out.trim();
    // keret/hitelesítés kifogyott: a CLI ilyenkor rövid, "limit" jellegű szöveget ad
    if ((isQuota(raw) && raw.length < 400) || (!raw && isQuota(err))) {
      return NextResponse.json({ ok: false, quota: true, error: 'A megfogalmazó (helyi claude) most elérte a keretét. Használd addig a 3 kész választervet vagy a levélírót; a keret feloldódása után újra megy.' }, { status: 503 });
    }
    if (!raw) return NextResponse.json({ ok: false, error: `A megfogalmazó nem adott választ${err ? `: ${err.slice(0, 160)}` : ''}` }, { status: 502 });
    const jsonTxt = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let subject = b.subject ? `Re: ${b.subject.replace(/^(Re|Vá|Válasz):\s*/i, '')}` : 'Válasz';
    let body = jsonTxt;
    try {
      const p = JSON.parse(jsonTxt) as { subject?: string; body?: string };
      if (p.body) { body = p.body; if (p.subject) subject = p.subject; }
    } catch { /* nem JSON jött: a teljes szöveg a törzs */ }
    body = body.replace(/\s*—\s*/g, ', ').trim();
    subject = subject.replace(/\s*—\s*/g, ' - ').trim();
    if (!body) return NextResponse.json({ ok: false, error: 'üres válasz érkezett' }, { status: 502 });
    return NextResponse.json({ ok: true, subject, body });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `A megfogalmazó nem érhető el: ${String(e).slice(0, 200)}` }, { status: 502 });
  }
}
