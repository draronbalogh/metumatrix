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

// Telefonszám-normalizálás: minden magyar szám +36-tal kezdődjön (06/0036/36 helyett).
export const normalizePhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const t = phone.replace(/[\s\-()./]/g, '');
  if (!t) return null;
  if (t.startsWith('+36')) return t;
  if (t.startsWith('0036')) return '+36' + t.slice(4);
  if (t.startsWith('06')) return '+36' + t.slice(2);
  if (/^36\d{8,}$/.test(t)) return '+' + t;
  return t; // külföldi vagy egyéb formátum — hagyjuk békén
};

const normPerson = (x: Person): Person => ({ name: x.name, email: x.email ?? null, phone: normalizePhone(x.phone ?? null) });

export const normalizePeople = (p: Partial<PeopleDB>): PeopleDB => ({
  teachers: (p.teachers ?? []).filter((x) => x && x.name).map(normPerson),
  students: (p.students ?? []).filter((x) => x && x.name).map(normPerson),
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
