// Levél-sablonok: determinisztikus szöveg-generálás eseményből/feladatból.
// Futásidőben nincs AI-hívás — a sablonokat előre megírtuk, a tétel mezőiből épülnek.
import { AgendaEvent, AgendaTask } from '@/data/agenda';

export type LetterKind = 'felkeres' | 'meghivo' | 'emlekezteto' | 'ures';

export const LETTER_KINDS: { id: LetterKind; label: string }[] = [
  { id: 'felkeres', label: 'Felkérés' },
  { id: 'meghivo', label: 'Meghívó' },
  { id: 'emlekezteto', label: 'Emlékeztető' },
  { id: 'ures', label: 'Üres' },
];

export interface LetterTarget {
  type: 'event' | 'task' | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
}

const GREET = 'Kedves Kollégák!';

// dátum-sor egy eseményhez ("Időpont: … · Helyszín: …")
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

  if (kind === 'felkeres') {
    subject = `Felkérés: ${title} — közreműködés`;
    core = `Rátok gondoltam, hogy segítsetek a(z) ${title} előkészítésében és megvalósításában.\n\n`
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + 'Kérlek, küldjétek el a javaslataitokat, ötleteiteket — kezdjünk el egy párbeszédet erről a feladatról. Minden felvetésnek örülök, a részleteket közösen alakítjuk.';
  } else if (kind === 'meghivo') {
    subject = `Meghívó: ${title}`;
    core = `Szeretettel meghívlak Titeket a(z) ${title} eseményre.\n\n`
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + 'Kérlek, jelezzétek vissza, hogy számíthatunk-e a részvételetekre.';
  } else if (kind === 'emlekezteto') {
    subject = `Emlékeztető: ${title}`;
    core = `Szeretnélek emlékeztetni Titeket: ${title}.\n\n`
      + (facts ? facts + '\n\n' : '')
      + (note ? note + '\n\n' : '')
      + 'Kérlek, jelezzétek, ha bármiben elakadtatok, kérdésetek van, vagy segítségre van szükségetek.';
  } else {
    subject = title;
    core = '';
  }

  const body = `${GREET}\n\n${core ? core + '\n\n' : ''}${signature}`;
  return { subject, body };
}
