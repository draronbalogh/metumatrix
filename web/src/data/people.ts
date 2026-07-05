// Személyi törzs — FONTOS: a tanárnevek egyetlen forrása a TANTERV (a kurzusok oktató-mezői),
// itt tanároknak csak az elérhetőségeit tároljuk név szerint. A hallgatói (demonstrátor) lista
// viszont itt él, ez az egyetlen forrása. Email + telefon: a későbbi email-értesítéshez.

export interface Person {
  name: string;
  email: string | null;
  phone: string | null;
}

// Egyedi email-csoport (pl. „Kiállítás-csapat") — a tagok az állandó listából (tanár/hallgató nevek).
export interface PeopleGroup {
  name: string;
  members: string[];
}

export interface PeopleDB {
  teachers: Person[]; // csak elérhetőség-kiegészítés a tantervi nevekhez
  students: Person[]; // hallgatók / demonstrátorok — itt az egyetlen listájuk
  groups: PeopleGroup[]; // egyedi email-csoportok
}

export type PersonKind = 'T' | 'H'; // Tanár | Hallgató

export interface RosterEntry {
  name: string;
  kind: PersonKind;
}

export const DEFAULT_PEOPLE: PeopleDB = { teachers: [], students: [], groups: [] };

export const normalizePeople = (p: Partial<PeopleDB>): PeopleDB => ({
  teachers: (p.teachers ?? []).filter((x) => x && x.name),
  students: (p.students ?? []).filter((x) => x && x.name),
  groups: (p.groups ?? []).filter((g) => g && g.name).map((g) => ({ name: g.name, members: g.members ?? [] })),
});

// Egy név elérhetőségének feloldása a törzsből (tanár vagy hallgató).
export const emailOf = (db: PeopleDB, name: string): string | null => {
  const p = db.teachers.find((x) => x.name === name) || db.students.find((x) => x.name === name);
  return p?.email ?? null;
};

// Egységes választólista: tantervi tanárnevek + hallgatók, badge-hez való típussal.
export const buildRoster = (teacherNames: string[], db: PeopleDB): RosterEntry[] => [
  ...teacherNames.map((name) => ({ name, kind: 'T' as const })),
  ...db.students.map((s) => ({ name: s.name, kind: 'H' as const })),
];
