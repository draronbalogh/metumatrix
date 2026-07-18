import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import os from 'os';
import { canWrite, writeDenied } from '@/lib/editauth';

// Kötegelt megfogalmazás: EGY helyi claude-hívás írja meg az ÖSSZES választ, így a
// stílusfájl csak EGYSZER megy fel (nem levelenként). A Titkárnő „Fogalmazd meg mind"
// gombja ezt hívja. Küldés/aláírás nincs; a stílust a stílusfájl + a bot-tervek adják.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'C:\\Users\\User\\.local\\bin\\claude.exe';
const STYLE_FILE = process.env.STYLE_FILE || 'C:/node/metu_tanterv/grid/valasz-stilus.md';

interface Item {
  sel: string;
  senderName: string;
  senderEmail: string;
  subject: string | null;
  gist: string | null;
  thread: string[];
  drafts: { label: string; subject: string; body: string }[];
  instruction: string;
}

const runClaude = (prompt: string): Promise<{ out: string; err: string }> => new Promise((resolve) => {
  const child = execFile(CLAUDE_BIN, ['-p', '--max-turns', '1'], {
    cwd: os.tmpdir(), timeout: 300000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  }, (e, stdout, stderr) => resolve({ out: String(stdout || ''), err: String(stderr || '') }));
  child.stdin?.write(prompt, 'utf8');
  child.stdin?.end();
});
const isQuota = (s: string): boolean => /limit|usage-?credit|rate.?limit|quota|Run \/login|not (?:logged|authenticated)/i.test(s);
const nd = (s: string): string => s.replace(/\s*—\s*/g, ', ').trim();

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let body: { items?: Item[] };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  const items = (body.items ?? []).filter((it) => it?.sel && it?.instruction?.trim());
  if (items.length === 0) return NextResponse.json({ ok: false, error: 'nincs feldolgozandó jegyzet' }, { status: 400 });

  let style = '';
  try { style = (await fs.readFile(STYLE_FILE, 'utf8')).slice(0, 6000); } catch { /* stílusfájl nélkül is megy */ }

  // a levelek blokkjai - a stílusfájl és a szabályok CSAK EGYSZER szerepelnek fent
  const blocks = items.map((it, i) => {
    const draftsTxt = (it.drafts ?? []).slice(0, 3).map((d) => `  - (${d.label}) ${d.body}`).join('\n');
    return `### ${i}. levél
- Feladó: ${it.senderName} <${it.senderEmail}>
- Tárgy: ${it.subject ?? '(nincs)'}
- Összefoglaló: ${it.gist ?? '(nincs)'}
${it.thread?.length ? `- A szál idővonala:\n${it.thread.map((t) => `  ${t}`).join('\n')}` : ''}
- Regiszter-minta (a szinkron tervei, EHHEZ igazodjon a hangnem):
${draftsTxt || '  (nincs terv - a stílusfájlból dolgozz)'}
- ÁRON NYERS DÖNTÉSE (diktálva, CSAK a tartalma számít):
"""
${it.instruction.trim()}
"""`;
  }).join('\n\n');

  const prompt = `Te Balogh Áron (METU Média Design szakvezető) titkárságát viszed. Az alábbi
${items.length} bejövő levélre írsz VÉGLEGES magyar választ Áron nevében, egyszerre.

ÁRON STÍLUSFÁJLJA (fordulat-készlet, MINDEN válaszra érvényes):
${style || '(nem elérhető)'}

KÖZÖS SZABÁLYOK (minden levélre):
- NYELV: minden levélnél KÜLÖN állapítsd meg a bejövő nyelvét (magyar vagy angol) a feladó és a levél alapján, és AZON a nyelven válaszolj. Magyar megszólítás: "Kedves <keresztnév>!"; angol: "Dear <firstname>,".
- A nyers döntés MINDEN tartalmi elemét építsd be; amit Áron eldöntött, azt nem írhatod felül.
- Ha a diktátum kérdezni akar, kérdezz; ha igent/nemet mondott, azt közöld udvariasan.
- Hangnem: korrekt, kollegiális, tényszerű - semmi érzelgősség, semmi túlzó udvariaskodás.
- TILOS a hosszú gondolatjel (—); helyette vessző, pont vagy sima kötőjel.
- ZÁRÁS: a levelet zárd rövid elköszönéssel és Áron KERESZTNEVÉVEL, külön sorokban - magyarul "Köszönöm," VAGY "Üdvözlettel," új sor "Áron"; angolul "Thank you," VAGY "Best regards," új sor "Áron". NE írj titulusos aláírás-blokkot (teljes név, beosztás, elérhetőség, linkek) - azt az Outlook teszi hozzá.
- Ne találj ki tényt, dátumot, nevet, ami se a levélben, se a diktátumban nincs benne.
- Ha egy adat hiányzik, ne találd ki: fogalmazz óvatosan vagy kérdezz rá a levélben.

A LEVELEK:

${blocks}

A VÁLASZOD KIZÁRÓLAG egy JSON tömb legyen, levelenként EGY elemmel, más szöveg nélkül,
a fenti sorszámokkal:
[{"i": 0, "subject": "a válasz tárgysora (Re: ...)", "body": "a levél teljes szövege"}, {"i": 1, "subject": "...", "body": "..."}]`;

  try {
    const { out, err } = await runClaude(prompt);
    const raw = out.trim();
    if ((isQuota(raw) && raw.length < 400) || (!raw && isQuota(err))) {
      return NextResponse.json({ ok: false, quota: true, error: 'A megfogalmazó (helyi claude) most elérte a keretét. Próbáld később.' }, { status: 503 });
    }
    if (!raw) return NextResponse.json({ ok: false, error: `A megfogalmazó nem adott választ${err ? `: ${err.slice(0, 160)}` : ''}` }, { status: 502 });
    // a JSON-tömb kiemelése (kód-kerítés vagy körítő szöveg ellen is)
    const jsonTxt = (raw.match(/\[[\s\S]*\]/)?.[0] ?? raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let arr: { i?: number; subject?: string; body?: string }[];
    try { arr = JSON.parse(jsonTxt); } catch { return NextResponse.json({ ok: false, error: 'a megfogalmazó válasza nem értelmezhető (nem JSON tömb)' }, { status: 502 }); }
    if (!Array.isArray(arr)) return NextResponse.json({ ok: false, error: 'a megfogalmazó nem tömböt adott' }, { status: 502 });
    const results = arr
      .map((p) => {
        const idx = typeof p.i === 'number' ? p.i : -1;
        const it = items[idx];
        if (!it || !p.body) return null;
        const subj = (p.subject && p.subject.trim()) ? nd(p.subject) : (it.subject ? `Re: ${it.subject}` : 'Válasz');
        return { sel: it.sel, subject: subj, body: nd(p.body) };
      })
      .filter((x): x is { sel: string; subject: string; body: string } => !!x && !!x.body);
    return NextResponse.json({ ok: true, results, requested: items.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `A megfogalmazó nem érhető el: ${String(e).slice(0, 200)}` }, { status: 502 });
  }
}
