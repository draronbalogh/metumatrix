// Feladat ↔ esemény automatikus összekapcsolási javaslat: a feladat szövegében
// (cím + összefoglaló) keressük az esemény címének szavait. A magyar toldalékokat
// prefix-egyezéssel toleráljuk („előadók" ≈ „előadó", „épületben" ≈ „épület").
// Csak erős találatot javaslunk: az esemény-cím szavainak legalább 60%-a meglegyen.
import { norm } from './normalize';

const STOP = new Set(['egy', 'vagy', 'nem', 'meg', 'mar', 'majd', 'alatt', 'utan', 'elott', 'the', 'and']);
const words = (s: string): string[] =>
  norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));

// két szó egyezik, ha azonosak, vagy (legalább 4 betűs törzzsel) egyik a másik előtagja
const wordHit = (a: string, b: string): boolean =>
  a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

export interface EventRef { id: string; title: string }

export function suggestEventFor(taskText: string, events: EventRef[]): EventRef | null {
  const hay = words(taskText);
  if (!hay.length) return null;
  let best: EventRef | null = null;
  let bestScore = 0;
  for (const e of events) {
    const ws = words(e.title);
    if (!ws.length) continue;
    const hits = ws.filter((w) => hay.some((h) => wordHit(w, h))).length;
    const cover = hits / ws.length;
    if (cover < 0.6) continue;
    // egyszavas esemény-cím csak hosszú (>= 6 betűs) szóra ugorjon be - kevesebb téves találat
    if (ws.length === 1 && ws[0].length < 6) continue;
    const score = hits + cover;
    if (score > bestScore) { bestScore = score; best = { id: e.id, title: e.title }; }
  }
  return best;
}
