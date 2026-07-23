// Válaszjavaslatok az „Elmaradt levelek megválaszolása" folyamathoz: a bejövő levél
// (source) + a hozzá kapcsolt feladat/esemény adataiból HÁROM, eltérő mélységű
// válaszlevelet állítunk elő a felhasználó stílusában. A fordulatok a
// grid/valasz-stilus.md tanuló fájlból jönnek (/api/style), így a stílus a
// sablonok és a korábbi levelezés alapján folyamatosan bővíthető.
import { AgendaEvent, AgendaSource, AgendaTask } from '@/data/agenda';

export interface StyleBank {
  greet: string[];
  ack: string[];
  promise: string[];
  meet: string[];
  close: string[];
}

const DEFAULT_BANK: StyleBank = {
  greet: ['Kedves {keresztnév}!'],
  ack: ['Köszönöm a leveled, rögzítettem a feladataink között.'],
  promise: ['Amint érdemi előrelépés van, jelzem.'],
  meet: ['Szeretnék róla röviden egyeztetni, írj kérlek néhány neked alkalmas időpontot.'],
  close: ['Köszönöm az együttműködést!'],
};

// a stílus-md szakaszai („## Cím" alatt „- " sorok) → fordulat-készletek
export function parseStyleBank(md: string | null): StyleBank {
  if (!md) return DEFAULT_BANK;
  const sec = (title: string): string[] => {
    const m = md.match(new RegExp(`##\\s*${title}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i'));
    if (!m) return [];
    return m[1].split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()).filter(Boolean);
  };
  const bank: StyleBank = {
    greet: sec('Megszólítás'),
    ack: sec('Nyugtázás'),
    promise: sec('Visszajelzés-ígéret'),
    meet: sec('Egyeztetés-kérés'),
    close: sec('Zárás'),
  };
  (Object.keys(bank) as (keyof StyleBank)[]).forEach((k) => { if (!bank[k].length) bank[k] = DEFAULT_BANK[k]; });
  return bank;
}

// magyar keresztnév: az utolsó (nem titulus) névtag - „Dr. Végh Zoltán" → „Zoltán"
export const givenNameHu = (full: string): string => {
  const parts = full.trim().split(/\s+/).filter((p) => !/^(dr|habil|prof)\.?$/i.test(p));
  return parts[parts.length - 1] ?? full;
};

const pick = (arr: string[], seed: number): string => arr[seed % arr.length] ?? '';

export interface ReplyVariant { id: string; label: string; subject: string; body: string }

// A három javaslat (2026-07-23 user-döntés): MINDHÁROM NYUGTÁZÓ - kérdést nem tesz
// fel, időpontot/menetrendet nem erősít meg, vállalást nem talál ki. Az érdemi választ
// Áron a Titkárnővel diktálja; a terv gyors "köszönöm, megkaptam, láttam" nyugta.
// A három változat hosszban és melegségben tér el.
export function replyVariants(src: AgendaSource, task: AgendaTask | null, event: AgendaEvent | null, bank: StyleBank, seed = 0): ReplyVariant[] {
  const greet = pick(bank.greet, seed).split('{keresztnév}').join(givenNameHu(src.name || ''));
  const subject = src.subject?.trim() ? (src.subject.trim().toLowerCase().startsWith('re:') ? src.subject.trim() : `Re: ${src.subject.trim()}`) : `Re: ${task?.title ?? event?.title ?? ''}`;
  const title = task?.title ?? event?.title ?? '';

  // 1) rövid: köszönöm + zárás; 2) + feltételes visszajelzés-ígéret ("megnézem és
  // jelzek" jellegű, a stílusbankból); 3) bővebb, melegebb nyugta a levélre utalva
  const v1 = [greet, '', pick(bank.ack, seed), '', pick(bank.close, seed)].join('\n');
  const v2 = [greet, '', pick(bank.ack, seed + 1), pick(bank.promise, seed), '', pick(bank.close, seed + 1)].join('\n');
  const v3 = [greet, '', `Köszönöm a leveled${title ? ` a(z) „${title}" ügyében` : ''} - megkaptam, és köszönöm, hogy foglalkoztál vele.`, pick(bank.promise, seed + 1), '', pick(bank.close, seed + 2)].join('\n');

  return [
    { id: 'ack', label: 'Nyugtázom (rövid)', subject, body: v1 },
    { id: 'ack2', label: 'Nyugtázom + jelzek', subject, body: v2 },
    { id: 'ack3', label: 'Nyugtázom (bővebb)', subject, body: v3 },
  ];
}
