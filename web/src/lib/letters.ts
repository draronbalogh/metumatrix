// Levél-sablonok: determinisztikus felépítés + VÉLETLENSZERŰ megfogalmazás-változatok,
// hogy a levelek ne tűnjenek gépiesnek. A sablon-gombra újra koppintva új variáció készül.
// Futásidőben nincs AI-hívás — a változatokat előre megírtuk.
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

// megszólítás-változatok
const GREET = [
  'Kedves Kollégák!',
  'Kedves Oktatók!',
  'Kedves Kollégák, sziasztok!',
  'Kedves Mindenki!',
  'Sziasztok, kedves Kollégák!',
];

// záró fordulatok a törzsszöveg és az aláírás közé
const CLOSER = [
  'Előre is köszönöm a segítségeteket!',
  'Köszönöm, hogy időt szántok rá!',
  'Számítok Rátok — köszönöm!',
  'Minden visszajelzésnek örülök.',
  'Kérdés esetén keressetek bátran.',
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
  const title = e?.title || t?.title || '';
  const note = (e?.note || t?.summary || '').trim();
  const facts = e ? eventFacts(e) : t ? taskFacts(t) : '';

  let subject = title;
  let core = '';
  let closer: string | null = pick(CLOSER);

  if (kind === 'felkeres') {
    subject = pick([`Felkérés: ${title} — közreműködés`, `${title} — közreműködést kérnék`, `Segítséget kérnék: ${title}`]);
    core = pick([
      `Rátok gondoltam, hogy segítsetek a(z) ${title} előkészítésében és megvalósításában.`,
      `Szeretnélek felkérni Benneteket, hogy működjetek közre a(z) ${title} kapcsán.`,
      `A(z) ${title} szervezéséhez keresek közreműködőket, és Rátok gondoltam.`,
    ]) + '\n\n'
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + pick([
        'Kérlek, küldjétek el a javaslataitokat, ötleteiteket — kezdjünk el egy párbeszédet erről. Minden felvetésnek örülök, a részleteket közösen alakítjuk.',
        'Örülnék, ha megosztanátok az ötleteiteket, javaslataitokat — a részleteket együtt formáljuk majd.',
        'Várom a gondolataitokat, javaslataitokat — beszéljük át közösen, hogyan lenne a legjobb.',
      ]);
  } else if (kind === 'meghivo') {
    subject = pick([`Meghívó: ${title}`, `${title} — meghívó`, `Gyertek: ${title}`]);
    core = pick([
      `Szeretettel meghívlak Titeket a(z) ${title} eseményre.`,
      `Sok szeretettel várlak Benneteket a(z) ${title} eseményen.`,
      `Ezúton hívlak meg Titeket a(z) ${title} alkalmára.`,
    ]) + '\n\n'
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + pick([
        'Kérlek, jelezzétek vissza, hogy számíthatunk-e a részvételetekre.',
        'Örülnék egy rövid visszajelzésnek, hogy ki tud eljönni.',
        'Egy sorban jelezzétek kérlek, ha ott lesztek.',
      ]);
  } else if (kind === 'emlekezteto') {
    subject = pick([`Emlékeztető: ${title}`, `${title} — közeledik!`, `Ne feledjétek: ${title}`]);
    core = pick([
      `Szeretnélek emlékeztetni Titeket: ${title}.`,
      `Rövid emlékeztető: közeledik a(z) ${title}.`,
      `Csak egy gyors jelzés: ${title} hamarosan aktuális.`,
    ]) + '\n\n'
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + pick([
        'Kérlek, jelezzétek, ha bármiben elakadtatok, kérdésetek van, vagy segítségre van szükségetek.',
        'Szóljatok, ha valamiben segíthetek, vagy kérdés merült fel.',
        'Ha bármi akadály van, kérlek, időben jelezzétek.',
      ]);
    closer = null; // az emlékeztetőnél a kérő mondat zár
  } else if (kind === 'koszono') {
    subject = pick([`Köszönet: ${title}`, `Köszönöm — ${title}`, `Hálás köszönet a(z) ${title} kapcsán`]);
    core = pick([
      `Köszönöm a segítségeteket és a munkátokat a(z) ${title} kapcsán!`,
      `Szeretném megköszönni a közreműködéseteket a(z) ${title} során.`,
      `Nagyon köszönöm Nektek, amit a(z) ${title} érdekében tettetek!`,
      `Hálásan köszönöm a részvételeteket és a segítségeteket a(z) ${title} alkalmával.`,
    ]) + '\n\n'
      + pick([
        'Sokat jelentett, hogy számíthattam Rátok — nélkületek nem sikerült volna.',
        'Jó volt látni, mennyi energiát tettetek bele. Büszke vagyok a csapatra!',
        'Igazán színvonalasra sikerült — ez a Ti érdemetek is.',
      ]);
    closer = pick([
      'Még egyszer köszönöm mindenkinek!',
      'Még egyszer hálásan köszönöm!',
      'Köszönöm Nektek!',
      'Nagyon köszönöm még egyszer a munkátokat!',
    ]);
  } else {
    subject = title;
    core = '';
    closer = null;
  }

  const body = `${pick(GREET)}\n\n${core ? core + '\n\n' : ''}${closer ? closer + '\n\n' : ''}${signature}`;
  return { subject, body };
}
