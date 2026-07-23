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
const PELDABANK_FILE = process.env.PELDABANK_FILE || 'C:/node/metu_tanterv/grid/valasz-peldabank.json';

// a kártya (feladat/esemény) konkrét tartalma és az illeszkedő levéltár-sablonok - a
// kliens állítja elő, a megfogalmazó ezekből ír teljes levelet (nem a nyers szavakból)
interface CardCtxT { kind?: string; lines?: string[] }
interface TemplateT { label?: string; group?: string; subject?: string; body?: string }
interface RephraseReq {
  senderName: string;
  senderEmail: string;
  subject: string | null;
  gist: string | null;
  thread: string[];      // "dátum · irány · ki: mit" sorok
  drafts: { label: string; subject: string; body: string }[]; // a bot 3 terve: regiszter-minta
  card?: CardCtxT | null;        // a kapcsolt feladat/esemény tartalma (konkrétumok)
  templates?: TemplateT[] | null; // a címhez illő levéltár-sablonok (felépítés-minta)
  instruction: string;   // a felhasználó nyers döntése/diktátuma
  askAllowed?: boolean;  // 1. kör: a modell EGY kritikus kérdést tehet fel a levél helyett
  question?: string | null;        // 2. kör: az 1. körben feltett kérdés
  questionAnswer?: string | null;  // 2. kör: a felhasználó válasza (null = nem tudja, kihagyta)
}

// ---- példabank: Áron korábbi VALÓS válaszai (hangnem/tömörség/felépítés mintái) ----
interface Example { to?: string; name?: string; type?: string; subject?: string; body?: string; date?: string }
// a feladó címéhez, majd a címzett-típusához illő korábbi válaszok (max 3)
const loadExamples = async (email: string): Promise<{ items: Example[]; matched: boolean }> => {
  try {
    const j = JSON.parse(await fs.readFile(PELDABANK_FILE, 'utf8')) as { examples?: Example[] };
    const all = j.examples ?? [];
    const em = (email || '').trim().toLowerCase();
    const mine = em ? all.filter((e) => (e.to || '').trim().toLowerCase() === em) : [];
    const type = mine[0]?.type ?? null;
    const sameType = type ? all.filter((e) => e.type === type && !mine.includes(e)) : [];
    let items = [...mine, ...sameType];
    const matched = items.length > 0;
    if (items.length === 0) items = all.slice(0, 3); // nincs találat: általános stílusminta
    return { items: items.slice(0, 3), matched };
  } catch { return { items: [], matched: false }; }
};
const exBlock = (items: Example[], matched: boolean): string => items.length === 0 ? '' :
  `${matched ? 'ÁRON KORÁBBI VALÓS VÁLASZAI ehhez a címzetthez / címzett-típushoz' : 'ÁRON néhány korábbi valós válasza (általános stílusminta)'} (a HANGNEM, a TÖMÖRSÉG és a FELÉPÍTÉS mintái - a TARTALMUKAT NE vedd át, csak a stílust kövesd):
${items.map((e) => `--- (${e.type ?? '?'}) tárgy: ${e.subject ?? ''}\n${(e.body ?? '').slice(0, 500)}`).join('\n\n')}`;
const tplBlock = (tpls?: TemplateT[] | null): string => !tpls?.length ? '' :
  `ILLESZKEDŐ SABLONOK a levéltárból (a FELÉPÍTÉS és a bevett fordulatok mintái; a [szögletes] helyeket a kártya adataiból töltsd ki, amit nem tudsz, azt HAGYD KI - sose írj ki [ilyet]):
${tpls.slice(0, 2).map((t) => `--- ${t.label ?? ''}${t.group ? ` (${t.group})` : ''} · tárgy: ${t.subject ?? ''}\n${(t.body ?? '').slice(0, 1200)}`).join('\n\n')}`;
const cardBlock = (card?: CardCtxT | null): string => !card?.lines?.length ? '' :
  `A KÁRTYA TARTALMA (${card.kind ?? 'tétel'} - ebből meríts KONKRÉTUMOT: időpont, határidő, helyszín, résztvevők, lépések; ne találj ki mást):
${card.lines.map((l) => `- ${l}`).join('\n')}`;

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

  const { items: exItems, matched: exMatched } = await loadExamples(b.senderEmail);

  const sections = [
    `A LEVÉL, AMIRE VÁLASZOLUNK:
- Feladó: ${b.senderName} <${b.senderEmail}>
- Tárgy: ${b.subject ?? '(nincs)'}
- Összefoglaló: ${b.gist ?? '(nincs)'}${b.thread?.length ? `\n- A szál idővonala:\n${b.thread.map((t) => `  ${t}`).join('\n')}` : ''}`,
    `ÁRON DÖNTÉSE (gyorsan, tőmondatokban diktálva - CSAK az IRÁNY, NEM a levél szövege):
"""
${b.instruction.trim()}
"""`,
    `>>> HOGYAN DOLGOZZ A DÖNTÉSSEL <<<
A fenti diktátum nem a levél szövege, hanem csak az irány: mit akar Áron. A dolgod, hogy
EBBŐL írj egy teljes, kész, igényes levelet Áron hangján - rendes megszólítás, folyó,
jól megfogalmazott mondatok, a szükséges udvariassági keret, tiszta lezárás.
- NE a diktált szavakat másold a levélbe, NE idézd, NE ismételd a nyers fogalmazást.
- Értsd meg a szándékot, és fogalmazd meg RENDESEN, a lenti sablonok, korábbi valós
  válaszok és a kártya tartalma alapján.
- Ha a döntés tőmondatos, hiányos vagy félszavas, akkor is teljes, kerek, azonnal
  elküldhető levél legyen az eredmény.
- A döntés MINDEN tartalmi elemét vidd bele, de az ő nyers megfogalmazását ne - azt te adod.`,
    b.question ? `TISZTÁZÓ KÖR (már lezajlott): a kérdésedre ("${b.question}") ${b.questionAnswer
      ? `Áron válasza: "${b.questionAnswer}" - ezt is építsd be.`
      : 'Áron NEM tud válaszolni. Írd meg a levelet enélkül, óvatos fogalmazással (ne találj ki adatot, hagyd nyitva vagy kérdezz rá a levélben, ha az természetes).'}` : '',
    tplBlock(b.templates),
    exBlock(exItems, exMatched),
    cardBlock(b.card),
    `REGISZTER-MINTA - a szinkron által erre a levélre írt tervek (a megszólítás, tegeződés/magázódás és hangnem EZEKHEZ igazodjon):
${draftsTxt || '(nincs terv - a stílusfájl megszólalásaiból dolgozz)'}`,
    `ÁRON STÍLUSFÁJLJA (fordulat-készlet):
${style || '(nem elérhető)'}`,
    `SZABÁLYOK:
- NYELV: állapítsd meg a bejövő levél nyelvét (magyar vagy angol) a feladó és a levél alapján, és VÉGIG azon a nyelven válaszolj. Magyar megszólítás: "Kedves <keresztnév>!"; angol: "Dear <firstname>,".
- Hangnem: korrekt, kollegiális, tényszerű - semmi érzelgősség, semmi túlzó udvariaskodás.
- TILOS a hosszú gondolatjel (—) karakter; helyette vessző, pont vagy sima kötőjel.
- ZÁRÁS: a levelet zárd rövid elköszönéssel és Áron KERESZTNEVÉVEL, külön sorokban - magyarul "Köszönöm," VAGY "Üdvözlettel," új sor "Áron"; angolul "Thank you," VAGY "Best regards," új sor "Áron". NE írj titulusos aláírás-blokkot (teljes név, beosztás, telefonszám, cím, linkek) - azt az Outlook teszi hozzá.
- Ne találj ki tényt, dátumot, nevet, ami se a levélben, se a döntésben, se a kártyában nincs.`,
    b.askAllowed && !b.question ? `HA HIÁNYZIK EGY KRITIKUS INFORMÁCIÓ: ha a levél megírásához egyetlen konkrét adat hiányzik (pl. pontos dátum, igen/nem döntés, összeg, név), akkor NE írd meg a levelet, hanem a válaszod KIZÁRÓLAG ez a JSON legyen:
{"question": "egyetlen rövid, konkrét magyar kérdés Áronnak"}
Csak akkor kérdezz, ha tényleg megakadnál nélküle - különben írd meg a levelet.` : '',
  ].filter(Boolean);

  const prompt = `Te Balogh Áron (METU Média Design szakvezető) titkárságát viszed: az alábbi
bejövő levélre írsz VÉGLEGES választ Áron nevében.

${sections.join('\n\n')}

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
      const p = JSON.parse(jsonTxt) as { subject?: string; body?: string; question?: string };
      // tisztázó kérdés jött levél helyett: azt adjuk vissza, a kliens kérdez-válaszol
      if (p.question && !p.body) {
        const q = p.question.replace(/\s*—\s*/g, ', ').trim();
        return NextResponse.json({ ok: true, question: q });
      }
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
