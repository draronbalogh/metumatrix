// Levél-sablonok: slot-alapú összerakás pool-okból + ismétlés-kerülő véletlen választás.
// Cél: sablononként több száz érdemben különböző levél, hogy sose kelljen ugyanazt írni.
// Hangvétel: korrekt, kollegiális. A hosszú gondolatjel (—) használata TILOS a szövegekben.
import { AgendaEvent, AgendaTask } from '@/data/agenda';

export type LetterKind = 'felkeres' | 'meghivo' | 'emlekezteto' | 'koszono' | 'ures';

export const LETTER_KINDS: { id: LetterKind; label: string }[] = [
  { id: 'felkeres', label: 'Felkérés' },
  { id: 'meghivo', label: 'Meghívó' },
  { id: 'emlekezteto', label: 'Emlékeztető' },
  { id: 'koszono', label: 'Köszönő' },
  { id: 'ures', label: 'Üres' },
];

export interface LetterTarget {
  type: 'event' | 'task' | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
}

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

// megszólítás-változatok
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

// záró fordulatok a törzsszöveg és az aláírás közé
const CLOSER = [
  'Előre is köszönöm a segítségeteket.',
  'Köszönöm, hogy időt szántok rá.',
  'Minden visszajelzésnek örülök.',
  'Kérdés esetén keressetek bátran.',
  'Köszönöm a közreműködést.',
  'Számítok Rátok.',
  'Köszönöm előre is.',
  'Ha bármi kérdés van, írjatok nyugodtan.',
  'Bízom benne, hogy össze tudjuk hozni.',
  'Köszönöm, hogy foglalkoztok vele.',
];

// köszönő levél saját zárásai
const KOSZONO_CLOSER = [
  'Még egyszer köszönöm mindenkinek.',
  'Még egyszer hálásan köszönöm.',
  'Köszönöm Nektek.',
  'Nagyon köszönöm a munkátokat.',
  'Jó volt együtt dolgozni ezen.',
  'Remélem, legközelebb is számíthatok Rátok.',
  'Ez közös siker, köszönöm.',
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
  if (gi >= 0 && GREET.includes(lines[gi].trim())) {
    lines[gi] = pick(GREET.filter((g) => g !== lines[gi].trim()));
  }
  for (let i = gi + 1; i < lines.length; i++) {
    const cur = lines[i].trim();
    if (CLOSER.includes(cur)) lines[i] = pick(CLOSER.filter((c) => c !== cur));
    else if (KOSZONO_CLOSER.includes(cur)) lines[i] = pick(KOSZONO_CLOSER.filter((c) => c !== cur));
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

// ---- a levél összerakása ----

// a kiválasztott lépések felvezető sora a levélben
const STEP_HEAD = [
  'A legfontosabb pontok:',
  'Amire most fókuszálunk:',
  'Az aktuális lépések:',
  'Röviden a teendők:',
  'Ezekről lesz szó:',
];

export function buildLetter(kind: LetterKind, target: LetterTarget, signature: string, steps?: string[]): { subject: string; body: string } {
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
  // plusz a kiválasztott lépések számozott listaként
  const infoBlocks = (): string[] => {
    const info = [facts, note].filter(Boolean);
    if (info.length === 2 && Math.random() < 0.5) info.reverse();
    const st = (steps ?? []).map((s) => noDash(s.trim())).filter(Boolean);
    if (st.length) info.push(`${pickAvoid(STEP_HEAD, 'stephead')}\n${st.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
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
    const ask = pickAvoid([
      `Rátok gondoltam, hogy segítsetek ${aT} előkészítésében és megvalósításában.`,
      `Szeretnélek felkérni Benneteket, hogy működjetek közre ${aT} kapcsán.`,
      `${aTC} szervezéséhez keresek közreműködőket, és Rátok gondoltam.`,
      `Számítanék a közreműködésetekre ${aT} körüli munkában.`,
      `Örülnék, ha be tudnátok kapcsolódni ${aT} előkészítésébe.`,
      `Segítségre lenne szükségem ${aT} lebonyolításában, és Rátok számítok.`,
      `Abban kérném a segítségeteket, hogy ${aT} rendben megvalósuljon.`,
      `Szeretném, ha közösen vinnénk ${aT} szervezését.`,
    ], 'felkeres.ask');
    const cta = pickAvoid([
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
    closer = pickAvoid(CLOSER, 'closer');
  } else if (kind === 'meghivo') {
    subject = pickAvoid([
      `Meghívó: ${title}`,
      `${title}: meghívó`,
      `Meghívás: ${title}`,
      `Gyertek el: ${title}`,
      `${title}: várunk Benneteket`,
    ], 'meghivo.subj');
    const invite = pickAvoid([
      `Meghívlak Benneteket ${aT} eseményre.`,
      `Ezúton hívlak meg Titeket ${aT} alkalmára.`,
      `Várlak Benneteket ${aT} eseményen.`,
      `Szeretettel várunk mindenkit ${aT} programján.`,
      `Gyertek el ${aT} eseményre, számítunk a jelenlétetekre.`,
      `Örülnék, ha ott lennétek ${aT} eseményen.`,
    ], 'meghivo.invite');
    const rsvp = pickAvoid([
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
    closer = pickAvoid(CLOSER, 'closer');
  } else if (kind === 'emlekezteto') {
    const rel = relativePhrase(e?.day ?? t?.dueDate);
    subject = pickAvoid(rel
      ? [`Emlékeztető: ${title} ${rel}`, `${title}: ${rel}`, `Ne feledjétek: ${title} ${rel}`, `${rel[0].toUpperCase()}${rel.slice(1)}: ${title}`]
      : [`Emlékeztető: ${title}`, `${title}: közeledik`, `Ne feledjétek: ${title}`, `Rövid emlékeztető: ${title}`], 'emlekezteto.subj');
    const remind = pickAvoid(rel
      ? (e ? [
          `Szeretnélek emlékeztetni Titeket: ${aT} ${rel} lesz.`,
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
          `Szeretnélek emlékeztetni Titeket: ${title}.`,
          `Rövid emlékeztető: közeledik ${aT}.`,
          `Gyors jelzés: ${aT} hamarosan aktuális.`,
          `Csak jelzem, hogy ${aT} hamarosan esedékes.`,
        ], 'emlekezteto.remind');
    const help = pickAvoid([
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
    const thanks = pickAvoid([
      `Köszönöm a segítségeteket és a munkátokat ${aT} kapcsán.`,
      `Szeretném megköszönni a közreműködéseteket ${aT} során.`,
      `Köszönöm Nektek a munkát, amit ${aT} érdekében tettetek.`,
      `Hálásan köszönöm a részvételeteket és a segítségeteket ${aT} alkalmával.`,
      `Köszönöm mindenkinek, aki dolgozott ${aT} sikeréért.`,
      `Köszönöm a befektetett időt és munkát ${aT} kapcsán.`,
    ], 'koszono.thanks');
    const detail = Math.random() < 0.6 ? pickAvoid([
      'Sokat segített, hogy számíthattam Rátok.',
      'Köszönöm a ráfordított időt és energiát.',
      'A közös munkának köszönhetően rendben lezajlott.',
      'Jó volt látni, hogy ennyien beálltatok mögé.',
      'A visszajelzések alapján jól sikerült, ez közös eredmény.',
      'Gördülékenyen ment minden, ez a Ti érdemetek is.',
    ], 'koszono.detail') : null;
    blocks.push([thanks, detail].filter(Boolean).join(' '));
    const st = (steps ?? []).map((s) => noDash(s.trim())).filter(Boolean);
    if (st.length) blocks.push(`${pick(['Amiben segítettetek:', 'Ami elkészült a közreműködésetekkel:'])}\n${st.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    closer = pickAvoid(KOSZONO_CLOSER, 'koszono.closer');
  } else {
    subject = title;
    closer = null;
  }

  const greet = pickAvoid(GREET, 'greet');
  const core = blocks.filter(Boolean).join('\n\n');
  const body = `${greet}\n\n${core ? core + '\n\n' : ''}${closer ? closer + '\n\n' : ''}${signature}`;
  return { subject, body };
}
