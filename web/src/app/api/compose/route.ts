import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import os from 'os';
import { canWrite, writeDenied } from '@/lib/editauth';

// Titkárnő KIMENŐ mód (Levelek): a diktált szándékból VÉGLEGES, Áron-hangú levelet
// fogalmaz a helyi claude CLI-vel. A rephrase testvére, de itt Áron KEZDEMÉNYEZ (nincs
// bejövő levél). A szöveget a modell írja; az adatot (esemény, Meet) az app hozza létre.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'C:\\Users\\User\\.local\\bin\\claude.exe';
const STYLE_FILE = process.env.STYLE_FILE || 'C:/node/metu_tanterv/grid/valasz-stilus.md';
const PELDABANK_FILE = process.env.PELDABANK_FILE || 'C:/node/metu_tanterv/grid/valasz-peldabank.json';

interface RecipientT { name: string; email: string; kind: string }
interface TemplateT { id: string; label: string; group: string; sampleSubject: string; sampleBody: string }
interface CardCtxT { title: string; lines: string[] }
interface MeetingT { slots: string[]; place: string | null; meetLink: string | null }
interface ComposeReq {
  instruction: string;                 // a felhasználó nyers diktált szándéka (csak irány)
  templates: TemplateT[];              // az illeszkedő sablon-jelöltek (felépítés-minta)
  recipients: RecipientT[];            // feloldott címzettek
  sendMode: 'personal' | 'bcc';        // személyre szabott / közös BCC
  cardContext?: CardCtxT[] | null;     // releváns feladatok/események rövidlistája (konkrétumok)
  meeting?: MeetingT | null;           // időpont-szervezés: a javasolt slotok + hely + Meet-link
  askAllowed?: boolean;                // 1. kör: a modell EGY tisztázó kérdést tehet fel
  question?: string | null;            // 2. kör: az 1. körben feltett kérdés
  questionAnswer?: string | null;      // 2. kör: a felhasználó válasza
}

interface Example { to?: string; name?: string; type?: string; subject?: string; body?: string; date?: string }
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
    if (items.length === 0) items = all.slice(0, 3);
    return { items: items.slice(0, 3), matched };
  } catch { return { items: [], matched: false }; }
};
const exBlock = (items: Example[], matched: boolean): string => items.length === 0 ? '' :
  `${matched ? 'ÁRON KORÁBBI VALÓS LEVELEI ehhez a címzetthez / címzett-típushoz' : 'ÁRON néhány korábbi valós levele (általános stílusminta)'} (a HANGNEM, a TÖMÖRSÉG és a FELÉPÍTÉS mintái - a TARTALMUKAT NE vedd át, csak a stílust kövesd):
${items.map((e) => `--- (${e.type ?? '?'}) tárgy: ${e.subject ?? ''}\n${(e.body ?? '').slice(0, 500)}`).join('\n\n')}`;
const tplBlock = (tpls: TemplateT[]): string => !tpls?.length ? '' :
  `ILLESZKEDŐ SABLONOK a levéltárból (a FELÉPÍTÉS és a bevett fordulatok mintái; a [szögletes] helyeket a szándékból és a kártya-adatokból töltsd ki, amit nem tudsz, azt HAGYD KI - sose írj ki [ilyet]):
${tpls.slice(0, 2).map((t) => `--- ${t.label} (${t.group}) · id: ${t.id} · tárgy: ${t.sampleSubject}\n${(t.sampleBody || '').slice(0, 1200)}`).join('\n\n')}`;
const ctxBlock = (cards?: CardCtxT[] | null): string => !cards?.length ? '' :
  `A RELEVÁNS FELADATOK / ESEMÉNYEK (ebből meríts KONKRÉTUMOT: időpont, határidő, helyszín; ne találj ki mást):
${cards.map((c) => `- ${c.title}${c.lines?.length ? `\n  ${c.lines.join('\n  ')}` : ''}`).join('\n')}`;
const meetBlock = (m?: MeetingT | null): string => !m ? '' :
  `IDŐPONT-EGYEZTETÉS - ezeket SZÓ SZERINT írd a levélbe (ne alakítsd át a dátumokat):
- Javasolt időpont(ok): ${m.slots.length ? m.slots.join(' ; ') : '(nincs megadva)'}${m.place ? `\n- Helyszín: ${m.place}` : ''}${m.meetLink ? `\n- Online belépés (Google Meet): ${m.meetLink} - ezt a linket is írd bele a levélbe` : ''}
Ha több időpont van, kérd meg a címzetteket, hogy jelezzék, melyik felel meg nekik.`;

const runClaude = (prompt: string): Promise<{ out: string; err: string; failed: boolean }> => new Promise((resolve) => {
  const child = execFile(CLAUDE_BIN, ['-p', '--max-turns', '1'], {
    cwd: os.tmpdir(), timeout: 150000, maxBuffer: 1024 * 1024, windowsHide: true,
  }, (e, stdout, stderr) => resolve({ out: String(stdout || ''), err: String(stderr || ''), failed: !!e }));
  child.stdin?.write(prompt, 'utf8');
  child.stdin?.end();
});
const isQuota = (s: string): boolean => /limit|usage-?credit|rate.?limit|quota|Run \/login|not (?:logged|authenticated)/i.test(s);

// a címzett-körből a megszólítás iránymutatása a modellnek
const greetingHint = (recipients: RecipientT[], sendMode: 'personal' | 'bcc'): string => {
  if (sendMode === 'personal') {
    return 'SZEMÉLYRE SZABOTT mód: a megszólítás PONTOSAN "Kedves {keresztnev}!" legyen (a {keresztnev} helyőrzőt HAGYD BENNE, a küldő tölti ki címzettenként). A levél egyes szám második személyű (tegeződő), ha oktató/hallgató a címzett.';
  }
  const kinds = new Set(recipients.map((r) => r.kind));
  const who = kinds.size === 1 && kinds.has('hallgato') ? 'Kedves Hallgatók!' : 'Kedves Kollégák!';
  return `KÖZÖS (BCC) mód: közös, többes megszólítás, javasolt: "${who}". Ne szólíts meg senkit néven.`;
};

export async function POST(req: Request) {
  if (!canWrite(req)) return writeDenied();
  let b: ComposeReq;
  try { b = await req.json() as ComposeReq; } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  if (!b?.instruction?.trim()) return NextResponse.json({ ok: false, error: 'üres szándék' }, { status: 400 });

  let style = '';
  try { style = (await fs.readFile(STYLE_FILE, 'utf8')).slice(0, 6000); } catch { /* stílusfájl nélkül is megy */ }
  const { items: exItems, matched: exMatched } = await loadExamples(b.recipients?.[0]?.email ?? '');
  const recipTxt = (b.recipients ?? []).map((r) => `${r.name} (${r.kind})`).join(', ') || '(nincs megadva)';

  const sections = [
    `A LEVÉL CÉLJA - Áron KEZDEMÉNYEZ egy levelet (nincs bejövő levél, amire válaszolna).`,
    `CÍMZETTEK: ${recipTxt}`,
    greetingHint(b.recipients ?? [], b.sendMode),
    `ÁRON SZÁNDÉKA (gyorsan, tőmondatokban diktálva - CSAK az IRÁNY, NEM a levél szövege):
"""
${b.instruction.trim()}
"""`,
    `>>> HOGYAN DOLGOZZ A SZÁNDÉKKAL <<<
A fenti diktátum nem a levél szövege, hanem az irány: mit akar Áron. A dolgod, hogy EBBŐL
írj egy teljes, kész, igényes levelet Áron hangján - rendes megszólítás, folyó, jól
megfogalmazott mondatok, a szükséges udvariassági keret, tiszta lezárás.
- NE a diktált szavakat másold a levélbe, NE idézd, NE ismételd a nyers fogalmazást.
- A szándék MINDEN tartalmi elemét vidd bele, de az ő nyers megfogalmazását ne - azt te adod.
- Ha a szándék tőmondatos vagy hiányos, akkor is teljes, azonnal elküldhető levél legyen.`,
    b.question ? `TISZTÁZÓ KÖR (már lezajlott): a kérdésedre ("${b.question}") ${b.questionAnswer
      ? `Áron válasza: "${b.questionAnswer}" - ezt is építsd be.`
      : 'Áron NEM tud válaszolni. Írd meg a levelet enélkül, óvatos fogalmazással (ne találj ki adatot).'}` : '',
    tplBlock(b.templates ?? []),
    ctxBlock(b.cardContext),
    meetBlock(b.meeting),
    exBlock(exItems, exMatched),
    `ÁRON STÍLUSFÁJLJA (fordulat-készlet):
${style || '(nem elérhető)'}`,
    `SZABÁLYOK:
- NYELV: alapból MAGYAR. Csak akkor írj angolul, ha a címzettek egyértelműen angol nyelvűek vagy a szándék angol levelet kér. Magyar megszólítás fent megadva; angol: "Dear <firstname>,".
- Hangnem: korrekt, kollegiális, tényszerű - semmi érzelgősség, semmi túlzó udvariaskodás.
- TILOS a hosszú gondolatjel (—) karakter; helyette vessző, pont vagy sima kötőjel.
- ZÁRÁS: rövid elköszönés és Áron KERESZTNEVE külön sorokban (magyarul "Köszönöm," VAGY "Üdvözlettel," új sor "Áron"; angolul "Thank you," VAGY "Best regards," új sor "Áron"). NE írj titulusos aláírás-blokkot - azt az Outlook teszi hozzá.
- Ne találj ki tényt, dátumot, nevet, ami se a szándékban, se a kártya-kontextusban, se az időpont-blokkban nincs.`,
    b.askAllowed && !b.question ? `HA HIÁNYZIK EGY KRITIKUS INFORMÁCIÓ: ha a levél megírásához egyetlen konkrét adat hiányzik (pl. pontos dátum, összeg, helyszín), akkor NE írd meg a levelet, hanem a válaszod KIZÁRÓLAG ez a JSON legyen:
{"question": "egyetlen rövid, konkrét magyar kérdés Áronnak"}
Csak akkor kérdezz, ha tényleg megakadnál nélküle - különben írd meg a levelet.` : '',
  ].filter(Boolean);

  const prompt = `Te Balogh Áron (METU Média Design szakvezető) titkárságát viszed: az alábbi
szándék alapján KEZDEMÉNYEZŐ levelet írsz Áron nevében a megadott címzett(ek)nek.

${sections.join('\n\n')}

A VÁLASZOD KIZÁRÓLAG ez a JSON legyen, más szöveg nélkül:
{"subject": "a levél tárgysora", "body": "a levél teljes szövege", "chosenTemplateId": "a felhasznált sablon id-je vagy null"}`;

  try {
    const { out, err } = await runClaude(prompt);
    const raw = out.trim();
    if ((isQuota(raw) && raw.length < 400) || (!raw && isQuota(err))) {
      return NextResponse.json({ ok: false, quota: true, error: 'A megfogalmazó (helyi claude) most elérte a keretét. Használd addig a sablontárat; a keret feloldódása után újra megy.' }, { status: 503 });
    }
    if (!raw) return NextResponse.json({ ok: false, error: `A megfogalmazó nem adott választ${err ? `: ${err.slice(0, 160)}` : ''}` }, { status: 502 });
    const jsonTxt = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let subject = 'Levél';
    let body = jsonTxt;
    let chosenTemplateId: string | null = null;
    try {
      const p = JSON.parse(jsonTxt) as { subject?: string; body?: string; question?: string; chosenTemplateId?: string | null };
      if (p.question && !p.body) {
        const q = p.question.replace(/\s*—\s*/g, ', ').trim();
        return NextResponse.json({ ok: true, question: q });
      }
      if (p.body) { body = p.body; if (p.subject) subject = p.subject; chosenTemplateId = p.chosenTemplateId ?? null; }
    } catch { /* nem JSON: a teljes szöveg a törzs */ }
    body = body.replace(/\s*—\s*/g, ', ').trim();
    subject = subject.replace(/\s*—\s*/g, ' - ').trim();
    if (!body) return NextResponse.json({ ok: false, error: 'üres levél érkezett' }, { status: 502 });
    return NextResponse.json({ ok: true, subject, body, chosenTemplateId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `A megfogalmazó nem érhető el: ${String(e).slice(0, 200)}` }, { status: 502 });
  }
}
