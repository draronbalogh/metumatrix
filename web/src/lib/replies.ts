// Válaszjavaslatok az „Elmaradt levelek megválaszolása" folyamathoz: a bejövő levél
// (source) + a hozzá kapcsolt feladat/esemény adataiból HÁROM, eltérő mélységű
// válaszlevelet állítunk elő a felhasználó stílusában. A fordulatok a
// grid/valasz-stilus.md tanuló fájlból jönnek (/api/style), így a stílus a
// sablonok és a korábbi levelezés alapján folyamatosan bővíthető.
import { AgendaEvent, AgendaSource, AgendaTask, fmtDueHu, taskSteps } from '@/data/agenda';

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

// magyar keresztnév: az utolsó (nem titulus) névtag — „Dr. Végh Zoltán" → „Zoltán"
export const givenNameHu = (full: string): string => {
  const parts = full.trim().split(/\s+/).filter((p) => !/^(dr|habil|prof)\.?$/i.test(p));
  return parts[parts.length - 1] ?? full;
};

const pick = (arr: string[], seed: number): string => arr[seed % arr.length] ?? '';

export interface ReplyVariant { id: string; label: string; subject: string; body: string }

// A három javaslat: 1) rövid nyugtázás 2) érdemi válasz a kapcsolt tétel adataival
// 3) egyeztetést kérő. A {keresztnév} helyére a feladó keresztneve kerül; a dátum,
// helyszín, határidő és a következő lépés a kapcsolt feladatból/eseményből jön.
export function replyVariants(src: AgendaSource, task: AgendaTask | null, event: AgendaEvent | null, bank: StyleBank, seed = 0): ReplyVariant[] {
  const greet = pick(bank.greet, seed).split('{keresztnév}').join(givenNameHu(src.name || ''));
  const subject = src.subject?.trim() ? (src.subject.trim().toLowerCase().startsWith('re:') ? src.subject.trim() : `Re: ${src.subject.trim()}`) : `Re: ${task?.title ?? event?.title ?? ''}`;
  const title = task?.title ?? event?.title ?? '';
  const due = task?.dueDate ? fmtDueHu(task.dueDate) : '';
  const when = event ? (event.when || (event.day ? fmtDueHu(event.day) : '')) : '';
  const place = event?.place ?? '';
  const nextStep = task ? taskSteps(task).find((s) => !s.done)?.text ?? '' : '';

  const facts: string[] = [];
  if (when) facts.push(`Az időpont a naptárunkban: ${when}${place ? ` (${place})` : ''}.`);
  else if (place) facts.push(`Helyszín: ${place}.`);
  if (due) facts.push(`A határidőt ${due} dátummal jegyeztem elő.`);
  if (nextStep) facts.push(`A következő lépés nálunk: ${nextStep.toLowerCase().startsWith('a ') ? nextStep : nextStep.charAt(0).toLowerCase() + nextStep.slice(1)}.`);

  const v1 = [greet, '', `${pick(bank.ack, seed)}${due ? ` A határidőt (${due}) előjegyeztem.` : ''}`, pick(bank.promise, seed), '', pick(bank.close, seed)].join('\n');
  const v2 = [greet, '', `Köszönöm a leveled${title ? ` a(z) „${title}" ügyében` : ''}.`, ...(facts.length ? [facts.join(' ')] : ['Átnéztem, és beütemeztük a teendőt.']), pick(bank.promise, (seed + 1)), '', pick(bank.close, (seed + 1))].join('\n');
  const v3 = [greet, '', `Köszönöm a leveled${title ? ` a(z) „${title}" kapcsán` : ''}. ${pick(bank.meet, seed)}`, when ? `Jó lenne még ${when} előtt sort keríteni rá.` : '', '', pick(bank.close, (seed + 2))].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');

  return [
    { id: 'ack', label: 'Nyugtázó', subject, body: v1 },
    { id: 'full', label: 'Érdemi', subject, body: v2 },
    { id: 'meet', label: 'Egyeztető', subject, body: v3 },
  ];
}
