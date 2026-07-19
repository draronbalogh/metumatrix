// Címzett-feloldás: nevekből / csoportokból email-lista. Szerveren és kliensen is használható
// (nincs benne fs/nodemailer). A tanár-emailek forrása a személyi törzs teachers[], a hallgatóké
// students[]; a nevek forrása egyébként a tanterv (a törzs csak elérhetőséget ad hozzá).
import { PeopleDB, emailOf, buildRoster, teacherStatusNames, studentStatusNames, studentCohorts, cohortNames, activeStudentNames, type PersonKind } from '@/data/people';
import type { LetterRecipient } from '@/data/agenda';

export interface Resolved {
  emails: string[];     // egyedi, érvényes címek
  missing: string[];    // nevek, akiknek nincs email-címük
}

// Nevek -> email-ek + hiányzók. A duplikátumokat és az üres címeket kiszűri.
export function resolveNames(db: PeopleDB, names: string[]): Resolved {
  const emails: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  names.forEach((n) => {
    const e = emailOf(db, n);
    if (e) { if (!seen.has(e)) { seen.add(e); emails.push(e); } }
    else missing.push(n);
  });
  return { emails, missing };
}

// Beépített csoportok azonosítói (a NotifyModal chipjei ezekre hivatkoznak).
export type StandingGroup = 'minden-tanar' | 'minden-hallgato' | 'mindenki';

// Egy beépített csoport tagjainak nevei. A tanárnevek a hívótól jönnek (tantervből),
// mert a törzs csak elérhetőséget tárol, nem a teljes tanár-névsort.
export function standingGroupNames(g: StandingGroup, teacherNames: string[], db: PeopleDB): string[] {
  const students = db.students.map((s) => s.name);
  if (g === 'minden-tanar') return teacherNames;
  if (g === 'minden-hallgato') return students;
  return [...teacherNames, ...students];
}

// --- Kimeno level (Levelek titkarno): diktalt nevek / csoportok -> LetterRecipient ---
// A tanarnevek forrasa a TANTERV (teacherNames), az emailek a torzsbol (emailOf).

const KIND_STR: Record<PersonKind, string> = {
  T: 'oktato', H: 'hallgato', I: 'intezmenyi', A: 'alumni', O: 'opponens', P: 'piaci',
};

const nrm = (s: string): string => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const loose = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface RecipientResolve { resolved: LetterRecipient[]; unresolved: string[] }

// Diktalt nevek feloldasa cimzettekke a Nevjegyzek roster-abol (tanarnevek a tantervbol).
// Egyezes: pontos -> ekezet-toleran -> minden szo benne van a nevben. Email nelkuli talalat
// is az unresolved-be kerul (nem cimezheto).
export function resolveRecipients(db: PeopleDB, teacherNames: string[], names: string[]): RecipientResolve {
  const roster = buildRoster(teacherNames, db);
  const resolved: LetterRecipient[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const q = (raw ?? '').trim();
    if (!q) continue;
    const nq = nrm(q);
    const lq = loose(q);
    const parts = lq.split(' ').filter(Boolean);
    const entry = roster.find((e) => nrm(e.name) === nq)
      || roster.find((e) => loose(e.name) === lq)
      || roster.find((e) => parts.length >= 2 && parts.every((w) => loose(e.name).includes(w)));
    const email = entry ? emailOf(db, entry.name) : null;
    if (entry && email) {
      const key = email.toLowerCase();
      if (!seen.has(key)) { seen.add(key); resolved.push({ name: entry.name, email, kind: KIND_STR[entry.kind] }); }
    } else {
      unresolved.push(q);
    }
  }
  return { resolved, unresolved };
}

// Nevlista (pl. egy preset tagjai) -> cimzettek, a feloldassal egyutt (email nelkuliek kihagyva).
export function namesToRecipients(db: PeopleDB, teacherNames: string[], names: string[]): LetterRecipient[] {
  return resolveRecipients(db, teacherNames, names).resolved;
}

export interface LetterPreset { id: string; label: string; count: number; names: string[] }

// Csoport-presetek a Nevjegyzek valos mezoire, a meglevo people-helper-ekbol.
export function letterPresets(db: PeopleDB, teacherNames: string[]): LetterPreset[] {
  const list: LetterPreset[] = [];
  const push = (id: string, label: string, names: string[]) => {
    const uniq = [...new Set(names.filter(Boolean))];
    if (uniq.length) list.push({ id, label, count: uniq.length, names: uniq });
  };
  push('oktatok-aktiv', 'Oktatók (aktív, tantervi)', teacherNames);
  push('foallasu-oktatok', 'Főállású oktatók', teacherStatusNames(db, 'főállású'));
  push('oraadok', 'Óraadók', teacherStatusNames(db, 'óraadó'));
  push('hallgatok-aktiv', 'Hallgatók (aktív)', activeStudentNames(db));
  push('demonstratorok', 'Demonstrátorok', studentStatusNames(db, 'demonstrátor'));
  push('kepviselok', 'Képviselők', studentStatusNames(db, 'képviselő'));
  push('szervezok', 'Szervezők', studentStatusNames(db, 'szervező'));
  push('nagykovetek', 'Nagykövetek', studentStatusNames(db, 'nagykövet'));
  for (const c of studentCohorts(db)) push(`cohort-${loose(c).replace(/\s+/g, '-')}`, `${c} évfolyam`, cohortNames(db, c));
  return list;
}

// kevesebb / szemelyes ugy -> personal (sajat megszolitas); nagy kor -> kozos BCC
export function suggestSendMode(recipients: LetterRecipient[]): 'personal' | 'bcc' {
  return recipients.length > 6 ? 'bcc' : 'personal';
}
