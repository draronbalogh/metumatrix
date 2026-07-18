// Levél-sablonok: slot-alapú összerakás pool-okból + ismétlés-kerülő véletlen választás.
// Cél: sablononként több száz érdemben különböző levél, hogy sose kelljen ugyanazt írni.
// Hangvétel: korrekt, kollegiális. A hosszú gondolatjel (—) használata TILOS a szövegekben.
import { AgendaEvent, AgendaTask } from '@/data/agenda';
import type { PersonKind } from '@/data/people';

export type LetterKind = 'felkeres' | 'meghivo' | 'emlekezteto' | 'koszono' | 'valasz' | 'ures';

export const LETTER_KINDS: { id: LetterKind; label: string }[] = [
  { id: 'felkeres', label: 'Felkérés' },
  { id: 'meghivo', label: 'Meghívó' },
  { id: 'emlekezteto', label: 'Emlékeztető' },
  { id: 'koszono', label: 'Köszönő' },
  { id: 'valasz', label: 'Válasz' },
  { id: 'ures', label: 'Üres' },
];

export interface LetterTarget {
  type: 'event' | 'task' | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
  source?: { name: string; email: string; subject?: string | null } | null; // a kiváltó email feladója
}

// magyar névsorrend: a keresztnév az utolsó tag (a Dr./habil előtagokat leválasztva)
const givenName = (full: string): string => {
  const parts = full.trim().split(/\s+/).filter((p) => !/^dr\.?$/i.test(p) && !/^habil\.?$/i.test(p));
  return parts[parts.length - 1] || full.trim();
};

// ---- segédek ----

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// A levélbe beemelt adatmezőkből is kigyomláljuk a hosszú gondolatjelet (tiltott a levelekben).
const noDash = (s: string): string => s.replace(/\s*—\s*/g, ', ');

// Határozott névelő: "a" vagy "az" a cím első hangja szerint (a robotikus "a(z)" helyett).
const art = (s: string): string => {
  const t = s.trim();
  const c = t.charAt(0).toLowerCase();
  if ('aáeéiíoóöőuúüű'.includes(c)) return 'az';
  if (c === '5') return 'az'; // öt...
  if (c === '1' && !/\d/.test(t.charAt(1))) return 'az'; // egy (de 10, 17... = a)
  return 'a';
};

// Ismétlés-kerülő választás: poolonként megjegyzi az utoljára használt 3 indexet
// (localStorage, session-ök között is), és kizárja őket a következő választásból.
const RECENT_KEY = 'mm-letter-recent';
type RecentMap = Record<string, number[]>;
const loadRecent = (): RecentMap => {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '{}') as RecentMap;
  } catch { return {}; }
};
const saveRecent = (m: RecentMap): void => {
  try { if (typeof window !== 'undefined') localStorage.setItem(RECENT_KEY, JSON.stringify(m)); } catch { /* privát mód */ }
};
function pickAvoid<T>(pool: T[], key: string): T {
  if (pool.length <= 1) return pool[0];
  const mem = loadRecent();
  const used = mem[key] || [];
  const avoid = new Set(used.slice(-Math.min(pool.length - 1, 3)));
  const candidates = pool.map((_, i) => i).filter((i) => !avoid.has(i));
  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  mem[key] = [...used, idx].slice(-6);
  saveRecent(mem);
  return pool[idx];
}

// ---- közös poolok ----

// Megszólítás-változatok a címzett-kör szerint: a levél köszöntése mindig ahhoz
// igazodik, KIK vannak kiválasztva (oktatók, hallgatók, alumni, intézményi, piaci).
const GREET = [
  'Kedves Kollégák!',
  'Kedves Oktatók!',
  'Kedves Mindenki!',
  'Kedves Kollégák, sziasztok!',
  'Sziasztok, Kollégák!',
  'Kedves Csapat!',
  'Sziasztok!',
  'Kedves Munkatársak!',
];
const GREET_H = ['Kedves Hallgatóink!', 'Kedves Hallgatók!', 'Kedves Diákjaink!', 'Kedves Diákok!', 'Sziasztok!'];
const GREET_A = ['Kedves Alumnusok!', 'Kedves Alumnusaink!', 'Kedves Volt Hallgatóink!', 'Kedves Volt Diákjaink!', 'Kedves Öregdiákjaink!', 'Kedves Média Design szakos Alumnusaink!'];
const GREET_I = ['Kedves Kollégák!', 'Kedves Kolléga!', 'Kedves Munkatársak!', 'Kedves Mind!', 'Kedves Mindenki!'];
const GREET_P = ['Kedves Partnereink!', 'Kedves Partnerünk!', 'Kedves Szakmai Partnerünk!', 'Kedves Partnerek!', 'Kedves Mind!'];
const GREET_O = ['Kedves Opponensünk!', 'Kedves Opponenseink!', 'Tisztelt Opponens!', 'Kedves Kolléga!', 'Kedves Mind!'];
const GREET_TH = ['Kedves Oktatók és Hallgatók!', 'Kedves Mindenki!', 'Kedves Kollégák és Hallgatók!'];
const GREET_MIX = ['Kedves Mindenki!', 'Kedves Mindannyian!'];
const GREET_POOLS = [GREET, GREET_H, GREET_A, GREET_I, GREET_P, GREET_O, GREET_TH, GREET_MIX];

function greetPool(kinds?: PersonKind[]): string[] {
  if (!kinds || kinds.length === 0) return GREET;
  const set = new Set(kinds);
  if (set.size === 1) return ({ T: GREET, H: GREET_H, A: GREET_A, I: GREET_I, P: GREET_P, O: GREET_O } as Record<PersonKind, string[]>)[kinds[0]];
  if (set.size === 2 && set.has('T') && set.has('H')) return GREET_TH;
  return GREET_MIX;
}
// a címzett-körhöz illő megszólítás (ismétlés-kerüléssel)
export const greetingFor = (kinds?: PersonKind[]): string => pickAvoid(greetPool(kinds), 'greet');
// ismert (generált) megszólítás-e a sor - a kézzel írt egyedi megszólítást nem bántjuk
export const isKnownGreeting = (line: string): boolean => GREET_POOLS.some((p) => p.includes(line.trim()));

// SZÁMSEMLEGES zárások: egyes és többes számú levélben is helyesek, ezért a
// Megszólítás és zárás csere ezen a poolon BELÜL marad (sosem ront nyelvtant)
const CLOSER_BOTH = [
  'Köszönöm előre is.',
  'Minden visszajelzésnek örülök.',
  'Bízom benne, hogy össze tudjuk hozni.',
  'Köszönöm a segítséget.',
  'Köszönöm szépen a segítséget.',
  'Köszönöm az erre szánt időt.',
  'Köszönöm és további jó munkát!',
  'Köszönöm és jó munkát kívánok!',
];

// záró fordulatok a törzsszöveg és az aláírás közé
const CLOSER = [
  'Előre is köszönöm a segítségeteket.',
  'Köszönöm, hogy időt szántok rá.',
  'Köszönöm az erre szánt időtöket.',
  'Kérdés esetén keressetek bátran.',
  'Köszönöm a közreműködést.',
  'Számítok Rátok.',
  'Ha bármi kérdés van, írjatok nyugodtan.',
  'Köszönöm, hogy foglalkoztok vele.',
  ...CLOSER_BOTH,
];

// köszönő levél saját zárásai
const KOSZONO_CLOSER = [
  'Még egyszer köszönöm mindenkinek.',
  'Még egyszer hálásan köszönöm.',
  'Köszönöm Nektek.',
  'Nagyon köszönöm a munkátokat.',
  'Köszönöm az erre szánt időtöket, sokat segített.',
  'Jó volt együtt dolgozni ezen.',
  'Remélem, legközelebb is számíthatok Rátok.',
  'Ez közös siker, köszönöm.',
  'Köszönöm, és további jó munkát kívánok mindenkinek!',
];

// EGYES SZÁMÚ változatok: ha pontosan EGY címzett van, a levél tegező egyes számban szól
const CLOSER_SG = [
  'Előre is köszönöm a segítségedet.',
  'Köszönöm, hogy időt szánsz rá.',
  'Köszönöm az erre szánt idődet.',
  'Kérdés esetén keress bátran.',
  'Köszönöm a közreműködésedet.',
  'Számítok Rád.',
  'Ha bármi kérdés van, írj nyugodtan.',
  'Köszönöm, hogy foglalkozol vele.',
  ...CLOSER_BOTH,
];
const KOSZONO_CLOSER_SG = [
  'Még egyszer köszönöm.',
  'Még egyszer hálásan köszönöm.',
  'Köszönöm Neked.',
  'Nagyon köszönöm a munkádat.',
  'Köszönöm az erre szánt idődet, sokat segített.',
  'Jó volt együtt dolgozni ezen.',
  'Remélem, legközelebb is számíthatok Rád.',
];

// Relatív időzítés az emlékeztetőhöz: "ma", "holnap", "2 nap múlva", "egy hét múlva"…
export function relativePhrase(day: string | null | undefined): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}/.test(day)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${day.slice(0, 10)}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'ma';
  if (diff === 1) return 'holnap';
  if (diff === 2) return 'holnapután';
  if (diff === 7) return 'egy hét múlva';
  if (diff === 14) return 'két hét múlva';
  if (diff === 21) return 'három hét múlva';
  return `${diff} nap múlva`;
}

// A meglévő levélben csak a megszólítást és a záró fordulatot cseréli másik
// változatra; a törzsszöveg (és minden kézi szerkesztés) érintetlen marad.
export function rerollLetter(body: string): string {
  const lines = body.split('\n');
  const gi = lines.findIndex((l) => l.trim() !== '');
  if (gi >= 0) {
    const cur = lines[gi].trim();
    const pool = GREET_POOLS.find((p) => p.includes(cur));
    if (pool && pool.length > 1) lines[gi] = pick(pool.filter((g) => g !== cur));
  }
  for (let i = gi + 1; i < lines.length; i++) {
    const cur = lines[i].trim();
    // a számsemleges sor CSAK számsemlegesre cserélhető (a levél számát nem ismerjük)
    if (CLOSER_BOTH.includes(cur)) lines[i] = pick(CLOSER_BOTH.filter((c) => c !== cur));
    else if (KOSZONO_CLOSER.includes(cur)) lines[i] = pick(KOSZONO_CLOSER.filter((c) => c !== cur));
    else if (KOSZONO_CLOSER_SG.includes(cur)) lines[i] = pick(KOSZONO_CLOSER_SG.filter((c) => c !== cur));
    else if (CLOSER_SG.includes(cur)) lines[i] = pick(CLOSER_SG.filter((c) => c !== cur));
    else if (CLOSER.includes(cur)) lines[i] = pick(CLOSER.filter((c) => c !== cur));
  }
  return lines.join('\n');
}

function eventFacts(e: AgendaEvent): string {
  const lines: string[] = [];
  if (e.when) lines.push(`Időpont: ${e.when}`);
  if (e.place) lines.push(`Helyszín: ${e.place}`);
  return lines.join('\n');
}

function taskFacts(t: AgendaTask): string {
  const lines: string[] = [];
  if (t.due || t.dueDate) lines.push(`Határidő: ${t.due || t.dueDate}`);
  return lines.join('\n');
}

// ---- meeting-javaslat a levélben ----

export type MeetingMode = 'online' | 'szemelyes' | 'hibrid';
export interface MeetingPlan {
  mode: MeetingMode;
  date?: string; // ÉÉÉÉ-HH-NN
  time?: string; // ÓÓ:PP
  link?: string; // Meet-link; üresen hagyva a levélben kitöltendő hely marad
}

const HU_MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const fmtMeetDate = (m: MeetingPlan): string | null => {
  if (!m.date) return null;
  const [y, mo, d] = m.date.split('-');
  const month = HU_MONTHS[parseInt(mo, 10) - 1] ?? mo;
  return `${y}. ${month} ${parseInt(d, 10)}.${m.time ? ` ${m.time}` : ''}`;
};

function meetingBlock(m: MeetingPlan): string {
  const dt = fmtMeetDate(m);
  const tail = dt ? `: ${dt}` : '';
  const propose = m.mode === 'online'
    ? pickAvoid([
        `Online meetinget javasolnék hozzá${tail}.`,
        `Beszéljük meg egy rövid online meetingen${tail}.`,
        `Erre egy online egyeztetést javaslok${tail}.`,
      ], 'meet.online')
    : m.mode === 'szemelyes'
      ? pickAvoid([
          `Személyes megbeszélést javasolnék${tail}.`,
          `Üljünk össze személyesen${tail}.`,
          `Erre egy személyes egyeztetést javaslok${tail}.`,
        ], 'meet.szemelyes')
      : pickAvoid([
          `Hibrid megbeszélést javasolnék, személyesen és online is lehet csatlakozni${tail}.`,
          `Az egyeztetés hibrid formában lesz, helyben és online is várunk${tail}.`,
        ], 'meet.hibrid');
  const lines = [propose];
  if (m.mode !== 'szemelyes') lines.push(`Link: ${noDash((m.link || '').trim())}`);
  return lines.join('\n');
}

// ---- a levél összerakása ----

// a kiválasztott lépések felvezető sora a levélben
const STEP_HEAD = [
  'A legfontosabb pontok:',
  'Amire most fókuszálunk:',
  'Most ezekre fogok fókuszálni:',
  'Az aktuális lépések:',
  'Röviden a teendők:',
  'Ezekről lesz szó:',
  'Az alábbi tételeket összegezném:',
  'Összegzésként:',
  'Összegzés:',
];

export interface RecipientInfo { count: number; name?: string | null; }

export function buildLetter(kind: LetterKind, target: LetterTarget, signature: string, steps?: string[], meeting?: MeetingPlan | null, audience?: PersonKind[], recipient?: RecipientInfo): { subject: string; body: string } {
  // pontosan EGY címzettnél a teljes levél tegező egyes számban szól
  const single = (recipient?.count ?? 0) === 1;
  const e = target.event ?? null;
  const t = target.task ?? null;
  const title = noDash(e?.title || t?.title || '');
  const note = noDash((e?.note || t?.summary || '').trim());
  const facts = noDash(e ? eventFacts(e) : t ? taskFacts(t) : '');

  // "a Kutatók Éjszakája" / "az Épületvetítés" (mondat közben és mondat elején)
  const aT = `${art(title)} ${title}`;
  const aTC = `${art(title) === 'az' ? 'Az' : 'A'} ${title}`;

  let subject = title;
  const blocks: string[] = [];
  let closer: string | null = null;

  // adat- és jegyzet-blokk két sorrend-mintában (szerkezeti variálódás),
  // plusz a kiválasztott lépések számozott listaként és a meeting-javaslat
  const infoBlocks = (): string[] => {
    const info = [facts, note].filter(Boolean);
    if (info.length === 2 && Math.random() < 0.5) info.reverse();
    const st = (steps ?? []).map((s) => noDash(s.trim())).filter(Boolean);
    if (st.length) info.push(`${pickAvoid(STEP_HEAD, 'stephead')}\n${st.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    if (meeting) info.push(meetingBlock(meeting));
    return info;
  };

  if (kind === 'felkeres') {
    subject = pickAvoid([
      `Felkérés: ${title}`,
      `Közreműködés kérése: ${title}`,
      `${title}: segítséget kérnék`,
      `${title}: közreműködőket keresek`,
      `Számítok Rátok: ${title}`,
    ], 'felkeres.subj');
    const lead = Math.random() < 0.5 ? pickAvoid([
      `Elindult ${aT} előkészítése.`,
      `Közeledik ${aT}, ideje összeállítani a csapatot.`,
      `Szervezés alatt van ${aT}.`,
      `Hamarosan aktuális lesz ${aT}.`,
      `Készülünk ${aT} megszervezésére.`,
      `Napirenden van ${aT}, és most dől el, ki miben vesz részt.`,
    ], 'felkeres.lead') : null;
    const ask = pickAvoid(single ? [
      `Rád gondoltam, hogy segíts ${aT} előkészítésében és megvalósításában.`,
      `Szeretnélek felkérni, hogy működj közre ${aT} kapcsán.`,
      `${aTC} szervezéséhez keresek közreműködőt, és Rád gondoltam.`,
      `Számítanék a közreműködésedre ${aT} körüli munkában.`,
      `Örülnék, ha be tudnál kapcsolódni ${aT} előkészítésébe.`,
      `Segítségre lenne szükségem ${aT} lebonyolításában, és Rád számítok.`,
      `Abban kérném a segítségedet, hogy ${aT} rendben megvalósuljon.`,
    ] : [
      `Rátok gondoltam, hogy segítsetek ${aT} előkészítésében és megvalósításában.`,
      `Szeretnélek felkérni Benneteket, hogy működjetek közre ${aT} kapcsán.`,
      `${aTC} szervezéséhez keresek közreműködőket, és Rátok gondoltam.`,
      `Számítanék a közreműködésetekre ${aT} körüli munkában.`,
      `Örülnék, ha be tudnátok kapcsolódni ${aT} előkészítésébe.`,
      `Segítségre lenne szükségem ${aT} lebonyolításában, és Rátok számítok.`,
      `Abban kérném a segítségeteket, hogy ${aT} rendben megvalósuljon.`,
      `Szeretném, ha közösen vinnénk ${aT} szervezését.`,
    ], 'felkeres.ask');
    const cta = pickAvoid(single ? [
      'Kérlek, küldd el a javaslataidat, és egyeztessünk a részletekről.',
      'Kérlek, oszd meg az ötleteidet, a részleteket együtt dolgozzuk ki.',
      'Várom a gondolataidat, utána egyeztessünk a részletekről.',
      'Írd meg kérlek, miben tudnál részt venni, és utána egyeztetünk.',
      'Jelezd kérlek egy rövid válaszban, hogy számíthatok-e Rád.',
      'Egy sorban jelezd kérlek, ha benne vagy, a többit megbeszéljük.',
    ] : [
      'Kérlek, küldjétek el a javaslataitokat, és kezdjünk el egy párbeszédet erről a feladatról. A részleteket közösen alakítjuk.',
      'Kérlek, osszátok meg az ötleteiteket, javaslataitokat. A részleteket együtt dolgozzuk ki.',
      'Várom a gondolataitokat és javaslataitokat, utána egyeztessünk a részletekről.',
      'Írjátok meg kérlek, ki miben tudna részt venni, és utána egyeztetünk.',
      'Jelezzétek kérlek egy rövid válaszban, hogy számíthatok-e Rátok.',
      'Egy sorban jelezzétek kérlek, ha benne vagytok, a többit megbeszéljük.',
      'Kérlek, írjátok meg, milyen formában tudnátok bekapcsolódni.',
    ], 'felkeres.cta');
    blocks.push([lead, ask].filter(Boolean).join(' '));
    blocks.push(...infoBlocks());
    blocks.push(cta);
    closer = pickAvoid(single ? CLOSER_SG : CLOSER, 'closer');
  } else if (kind === 'meghivo') {
    subject = pickAvoid([
      `Meghívó: ${title}`,
      `${title}: meghívó`,
      `Meghívás: ${title}`,
      `Gyertek el: ${title}`,
      `${title}: várunk Benneteket`,
    ], 'meghivo.subj');
    const invite = pickAvoid(single ? [
      `Meghívlak ${aT} eseményre.`,
      `Ezúton hívlak meg ${aT} alkalmára.`,
      `Várlak ${aT} eseményen.`,
      `Örülnék, ha ott lennél ${aT} eseményen.`,
    ] : [
      `Meghívlak Benneteket ${aT} eseményre.`,
      `Ezúton hívlak meg Titeket ${aT} alkalmára.`,
      `Várlak Benneteket ${aT} eseményen.`,
      `Szeretettel várunk mindenkit ${aT} programján.`,
      `Gyertek el ${aT} eseményre, számítunk a jelenlétetekre.`,
      `Örülnék, ha ott lennétek ${aT} eseményen.`,
    ], 'meghivo.invite');
    const rsvp = pickAvoid(single ? [
      'Kérlek, jelezz vissza, hogy számíthatunk-e a részvételedre.',
      'Kérek egy rövid visszajelzést, hogy el tudsz-e jönni.',
      'Egy sorban jelezd kérlek, ha ott leszel.',
      'Ha tudsz jönni, kérlek, írj egy rövid választ.',
    ] : [
      'Kérlek, jelezzétek vissza, hogy számíthatunk-e a részvételetekre.',
      'Kérek egy rövid visszajelzést, hogy ki tud eljönni.',
      'Egy sorban jelezzétek kérlek, ha ott lesztek.',
      'Ha tudtok jönni, kérlek, írjatok egy rövid választ.',
      'Visszajelzést kérnék a létszám miatt, elég egy sor.',
      'Kérlek, szóljatok, ha számíthatunk Rátok.',
    ], 'meghivo.rsvp');
    blocks.push(invite);
    blocks.push(...infoBlocks());
    blocks.push(rsvp);
    closer = pickAvoid(single ? CLOSER_SG : CLOSER, 'closer');
  } else if (kind === 'emlekezteto') {
    const rel = relativePhrase(e?.day ?? t?.dueDate);
    subject = pickAvoid(rel
      ? [`Emlékeztető: ${title} ${rel}`, `${title}: ${rel}`, `Ne feledjétek: ${title} ${rel}`, `${rel[0].toUpperCase()}${rel.slice(1)}: ${title}`]
      : [`Emlékeztető: ${title}`, `${title}: közeledik`, `Ne feledjétek: ${title}`, `Rövid emlékeztető: ${title}`], 'emlekezteto.subj');
    const remind = pickAvoid(rel
      ? (e ? [
          single ? `Szeretnélek emlékeztetni: ${aT} ${rel} lesz.` : `Szeretnélek emlékeztetni Titeket: ${aT} ${rel} lesz.`,
          `Rövid emlékeztető: ${aT} ${rel} lesz.`,
          `Gyors jelzés: ${aT} ${rel} lesz.`,
          `Csak jelzem, hogy ${aT} ${rel} lesz.`,
          `Emlékeztetőül: ${aT} ${rel} lesz.`,
          `Közeledik ${aT}: ${rel} lesz.`,
        ] : [
          `Szeretnélek emlékeztetni Titeket: ${aT} határideje ${rel} esedékes.`,
          `Rövid emlékeztető: ${aT} határideje ${rel} jár le.`,
          `Gyors jelzés: ${aT} határideje ${rel} esedékes.`,
          `Csak jelzem, hogy ${aT} határideje ${rel} lejár.`,
        ])
      : [
          single ? `Szeretnélek emlékeztetni: ${title}.` : `Szeretnélek emlékeztetni Titeket: ${title}.`,
          `Rövid emlékeztető: közeledik ${aT}.`,
          `Gyors jelzés: ${aT} hamarosan aktuális.`,
          `Csak jelzem, hogy ${aT} hamarosan esedékes.`,
        ], 'emlekezteto.remind');
    const help = pickAvoid(single ? [
      'Kérlek, jelezd, ha kérdésed van, vagy valamiben segítség kell.',
      'Szólj, ha valamiben segíthetek, vagy kérdés merült fel.',
      'Ha bármi akadály van, kérlek, időben jelezd.',
      'Kérdés esetén keress nyugodtan.',
      'Ha kell még valami az előkészülethez, írj.',
    ] : [
      'Kérlek, jelezzétek, ha kérdésetek van, vagy valamiben segítségre van szükségetek.',
      'Szóljatok, ha valamiben segíthetek, vagy kérdés merült fel.',
      'Ha bármi akadály van, kérlek, időben jelezzétek.',
      'Ha valami még nyitott, most érdemes jelezni.',
      'Kérdés esetén keressetek nyugodtan.',
      'Ha kell még valami az előkészülethez, írjatok.',
    ], 'emlekezteto.help');
    blocks.push(remind);
    blocks.push(...infoBlocks());
    blocks.push(help);
    closer = null; // az emlékeztetőnél a segítség-mondat zár
  } else if (kind === 'koszono') {
    subject = pickAvoid([
      `Köszönet: ${title}`,
      `Köszönöm: ${title}`,
      `Köszönet ${aT} kapcsán`,
      `${title}: köszönet mindenkinek`,
    ], 'koszono.subj');
    const thanks = pickAvoid(single ? [
      `Köszönöm a segítségedet és a munkádat ${aT} kapcsán.`,
      `Szeretném megköszönni a közreműködésedet ${aT} során.`,
      `Köszönöm Neked a munkát, amit ${aT} érdekében tettél.`,
      `Hálásan köszönöm a részvételedet és a segítségedet ${aT} alkalmával.`,
    ] : [
      `Köszönöm a segítségeteket és a munkátokat ${aT} kapcsán.`,
      `Szeretném megköszönni a közreműködéseteket ${aT} során.`,
      `Köszönöm Nektek a munkát, amit ${aT} érdekében tettetek.`,
      `Hálásan köszönöm a részvételeteket és a segítségeteket ${aT} alkalmával.`,
      `Köszönöm mindenkinek, aki dolgozott ${aT} sikeréért.`,
      `Köszönöm a befektetett időt és munkát ${aT} kapcsán.`,
    ], 'koszono.thanks');
    const detail = Math.random() < 0.6 ? pickAvoid(single ? [
      'Sokat segített, hogy számíthattam Rád.',
      'Köszönöm a ráfordított időt és energiát.',
      'A közös munkának köszönhetően rendben lezajlott.',
      'Jó volt látni, hogy beálltál mögé.',
    ] : [
      'Sokat segített, hogy számíthattam Rátok.',
      'Köszönöm a ráfordított időt és energiát.',
      'A közös munkának köszönhetően rendben lezajlott.',
      'Jó volt látni, hogy ennyien beálltatok mögé.',
      'A visszajelzések alapján jól sikerült, ez közös eredmény.',
      'Gördülékenyen ment minden, ez a Ti érdemetek is.',
    ], 'koszono.detail') : null;
    blocks.push([thanks, detail].filter(Boolean).join(' '));
    const st = (steps ?? []).map((s) => noDash(s.trim())).filter(Boolean);
    if (st.length) blocks.push(`${single ? pick(['Amiben segítettél:', 'Ami elkészült a közreműködéseddel:']) : pick(['Amiben segítettetek:', 'Ami elkészült a közreműködésetekkel:'])}\n${st.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    closer = pickAvoid(single ? KOSZONO_CLOSER_SG : KOSZONO_CLOSER, 'koszono.closer');
  } else if (kind === 'valasz') {
    const src = target.source ?? null;
    const orig = noDash((src?.subject || '').trim());
    subject = orig
      ? (orig.toLowerCase().startsWith('re:') ? orig : `Re: ${orig}`)
      : pickAvoid([`Válasz: ${title}`, `${title}: válasz a megkeresésedre`], 'valasz.subj');
    const ack = pickAvoid([
      'Köszönöm a megkeresést.',
      'Köszönöm a leveledet.',
      'Köszönöm, hogy írtál, és hogy hozzám fordultál ezzel.',
    ], 'valasz.ack');
    const bodyLine = pickAvoid([
      `${aTC} kapcsán utánanézek a részleteknek, és hamarosan érdemben jelentkezem.`,
      `Átnézem ${aT} kérdését, és rövid időn belül válaszolok.`,
      `A témát megnézem, és visszajelzek a lehetőségekről.`,
      `${aTC} ügyében egyeztetek a kollégákkal, és utána pontos választ adok.`,
    ], 'valasz.body');
    const cta = pickAvoid([
      'Ha közben bármi kiegészítés eszedbe jut, írd meg nyugodtan.',
      'Ha sürgős, keress bátran telefonon.',
      'Kérdés esetén állok rendelkezésre.',
    ], 'valasz.cta');
    blocks.push([ack, bodyLine].join(' '));
    // a válaszba NEM emeljük be a kártya belső jegyzetét és adat-sorait (furcsán hatna
    // a levél írójának szánt belső kontextus) - csak a kifejezetten kért elemeket:
    const st = (steps ?? []).map((s) => noDash(s.trim())).filter(Boolean);
    if (st.length) blocks.push(`${pickAvoid(STEP_HEAD, 'stephead')}\n${st.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    if (meeting) blocks.push(meetingBlock(meeting));
    blocks.push(cta);
    closer = pickAvoid(CLOSER_SG, 'closer'); // a válasz mindig egy embernek szól
  } else {
    subject = title;
    closer = null;
  }

  // válasz-levélnél a feladót név szerint szólítjuk meg; EGY címzettnél szintén név
  // szerint (keresztnévvel); több címzettnél a kör összetétele dönt
  const greet = kind === 'valasz' && target.source?.name
    ? `Kedves ${givenName(target.source.name)}!`
    : single
      ? `Kedves ${recipient?.name ? givenName(recipient.name) : '[Név]'}!`
      : greetingFor(audience);
  const core = blocks.filter(Boolean).join('\n\n');
  // zárás: ha van bekapcsolt titulusos aláírás, azt tesszük; különben rövid elköszönés
  // + Áron keresztneve (a titulusos aláírást ilyenkor az Outlook adja)
  const signOff = signature.trim() ? signature : 'Üdvözlettel,\nÁron';
  const body = `${greet}\n\n${core ? core + '\n\n' : ''}${closer ? closer + '\n\n' : ''}${signOff}`;
  return { subject, body };
}
