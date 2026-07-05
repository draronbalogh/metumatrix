// Címzett-feloldás: nevekből / csoportokból email-lista. Szerveren és kliensen is használható
// (nincs benne fs/nodemailer). A tanár-emailek forrása a személyi törzs teachers[], a hallgatóké
// students[]; a nevek forrása egyébként a tanterv (a törzs csak elérhetőséget ad hozzá).
import { PeopleDB, emailOf } from '@/data/people';

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
