// Levél-sablonok: determinisztikus felépítés + véletlenszerű megfogalmazás-változatok,
// hogy a levelek ne tűnjenek gépiesnek. A sablon-gombra újra koppintva új variáció készül.
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

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// A levélbe beemelt adatmezőkből is kigyomláljuk a hosszú gondolatjelet (tiltott a levelekben).
const noDash = (s: string): string => s.replace(/\s*—\s*/g, ', ');

// megszólítás-változatok
const GREET = [
  'Kedves Kollégák!',
  'Kedves Oktatók!',
  'Kedves Kollégák, sziasztok!',
  'Kedves Mindenki!',
];

// záró fordulatok a törzsszöveg és az aláírás közé
const CLOSER = [
  'Előre is köszönöm a segítségeteket.',
  'Köszönöm, hogy időt szántok rá.',
  'Minden visszajelzésnek örülök.',
  'Kérdés esetén keressetek bátran.',
  'Köszönöm a közreműködést.',
];

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

export function buildLetter(kind: LetterKind, target: LetterTarget, signature: string): { subject: string; body: string } {
  const e = target.event ?? null;
  const t = target.task ?? null;
  const title = noDash(e?.title || t?.title || '');
  const note = noDash((e?.note || t?.summary || '').trim());
  const facts = noDash(e ? eventFacts(e) : t ? taskFacts(t) : '');

  let subject = title;
  let core = '';
  let closer: string | null = pick(CLOSER);

  if (kind === 'felkeres') {
    subject = pick([`Felkérés: ${title}`, `Közreműködés kérése: ${title}`, `${title}: segítséget kérnék`]);
    core = pick([
      `Rátok gondoltam, hogy segítsetek a(z) ${title} előkészítésében és megvalósításában.`,
      `Szeretnélek felkérni Benneteket, hogy működjetek közre a(z) ${title} kapcsán.`,
      `A(z) ${title} szervezéséhez keresek közreműködőket, és Rátok gondoltam.`,
    ]) + '\n\n'
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + pick([
        'Kérlek, küldjétek el a javaslataitokat, és kezdjünk el egy párbeszédet erről a feladatról. A részleteket közösen alakítjuk.',
        'Kérlek, osszátok meg az ötleteiteket, javaslataitokat. A részleteket együtt dolgozzuk ki.',
        'Várom a gondolataitokat és javaslataitokat, utána egyeztessünk a részletekről.',
      ]);
  } else if (kind === 'meghivo') {
    subject = pick([`Meghívó: ${title}`, `${title}: meghívó`, `Meghívás a(z) ${title} eseményre`]);
    core = pick([
      `Meghívlak Benneteket a(z) ${title} eseményre.`,
      `Ezúton hívlak meg Titeket a(z) ${title} alkalmára.`,
      `Várlak Benneteket a(z) ${title} eseményen.`,
    ]) + '\n\n'
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + pick([
        'Kérlek, jelezzétek vissza, hogy számíthatunk-e a részvételetekre.',
        'Kérek egy rövid visszajelzést, hogy ki tud eljönni.',
        'Egy sorban jelezzétek kérlek, ha ott lesztek.',
      ]);
  } else if (kind === 'emlekezteto') {
    subject = pick([`Emlékeztető: ${title}`, `${title}: közeledik`, `Ne feledjétek: ${title}`]);
    core = pick([
      `Szeretnélek emlékeztetni Titeket: ${title}.`,
      `Rövid emlékeztető: közeledik a(z) ${title}.`,
      `Gyors jelzés: a(z) ${title} hamarosan aktuális.`,
    ]) + '\n\n'
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + pick([
        'Kérlek, jelezzétek, ha kérdésetek van, vagy valamiben segítségre van szükségetek.',
        'Szóljatok, ha valamiben segíthetek, vagy kérdés merült fel.',
        'Ha bármi akadály van, kérlek, időben jelezzétek.',
      ]);
    closer = null; // az emlékeztetőnél a kérő mondat zár
  } else if (kind === 'koszono') {
    subject = pick([`Köszönet: ${title}`, `Köszönöm: ${title}`, `Köszönet a(z) ${title} kapcsán`]);
    core = pick([
      `Köszönöm a segítségeteket és a munkátokat a(z) ${title} kapcsán.`,
      `Szeretném megköszönni a közreműködéseteket a(z) ${title} során.`,
      `Köszönöm Nektek a munkát, amit a(z) ${title} érdekében tettetek.`,
      `Hálásan köszönöm a részvételeteket és a segítségeteket a(z) ${title} alkalmával.`,
    ]) + '\n\n'
      + pick([
        'Sokat segített, hogy számíthattam Rátok.',
        'Köszönöm a ráfordított időt és energiát.',
        'A közös munkának köszönhetően rendben lezajlott.',
      ]);
    closer = pick([
      'Még egyszer köszönöm mindenkinek.',
      'Még egyszer hálásan köszönöm.',
      'Köszönöm Nektek.',
      'Nagyon köszönöm a munkátokat.',
    ]);
  } else {
    subject = title;
    core = '';
    closer = null;
  }

  const body = `${pick(GREET)}\n\n${core ? core + '\n\n' : ''}${closer ? closer + '\n\n' : ''}${signature}`;
  return { subject, body };
}
