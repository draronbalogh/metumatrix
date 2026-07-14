// Személyi törzs — FONTOS: a tanárnevek egyetlen forrása a TANTERV (a kurzusok oktató-mezői),
// itt tanároknak csak az elérhetőségeit tároljuk név szerint. A hallgatói (demonstrátor) lista
// viszont itt él, ez az egyetlen forrása. Email + telefon: a későbbi email-értesítéshez.
// A név ÍRÁSMÓDJÁNAK (titulusok, pl. "Dr.") forrása viszont a Névjegyzék: buildCanonicalNames.

import { normName } from '@/lib/normalize';

export interface Person {
  name: string;
  email: string | null;
  phone: string | null;
  title?: string | null; // titulus / beosztás — MINDEN listán egységesen
  field?: string | null; // terület, ahol dolgozik / amiért kereshető — MINDEN listán egységesen
  status?: string | null; // tanárnál: főállású / óraadó / volt-külsős · hallgatónál: szervező / nagykövet / képviselő / demonstrátor
  cohort?: string | null; // hallgatónál/alumninál az évfolyam (pl. 'BA 2024', 'MA 2025') — szűrőkhöz
}

// Választható státusz-címkék — ezekből lesznek a levél-címzett gyorskörök.
export const TEACHER_STATUSES = ['főállású', 'óraadó', 'volt/külsős'] as const;
export const STUDENT_STATUSES = ['szervező', 'nagykövet', 'képviselő', 'demonstrátor'] as const;

// Volt / külsős oktató-kontaktok: a Névjegyzékben 'volt/külsős'-re CÍMKÉZETTEK, plusz
// tartalékként a címkézetlen, a tantervben már nem szereplő kontaktok (ne tűnjön el senki).
export const formerTeacherNames = (teacherNames: string[], db: PeopleDB): string[] =>
  db.teachers.filter((p) => p.status === 'volt/külsős' || (!p.status && !teacherNames.includes(p.name))).map((p) => p.name);
// Oktatók adott státusszal — a Névjegyzék-adatbázis címkéje az EGYETLEN forrás.
export const teacherStatusNames = (db: PeopleDB, status: string): string[] =>
  db.teachers.filter((p) => p.status === status).map((p) => p.name);
// A hallgatói évfolyamok (cohortok) az adatbázisból, rendezve — szűrőkhöz és körökhöz.
export const studentCohorts = (db: PeopleDB): string[] =>
  [...new Set(db.students.map((p) => p.cohort).filter((c): c is string => !!c))].sort();
export const cohortNames = (db: PeopleDB, cohort: string): string[] =>
  db.students.filter((p) => p.cohort === cohort).map((p) => p.name);
// Adott státuszú hallgatók (szervező / nagykövet / képviselő / demonstrátor).
export const studentStatusNames = (db: PeopleDB, status: string): string[] =>
  db.students.filter((p) => p.status === status).map((p) => p.name);
// Hallgatói szervezői kör: szervezők + nagykövetek + képviselők (a demonstrátor külön szerep).
export const studentOrganizerNames = (db: PeopleDB): string[] =>
  db.students.filter((p) => p.status && p.status !== 'demonstrátor').map((p) => p.name);

// Egyedi email-csoport (pl. „Kiállítás-csapat") — a tagok az állandó listából (tanár/hallgató nevek).
export interface PeopleGroup {
  name: string;
  members: string[];
}

export interface PeopleDB {
  teachers: Person[]; // csak elérhetőség-kiegészítés a tantervi nevekhez
  students: Person[]; // hallgatók / demonstrátorok — itt az egyetlen listájuk
  institution: Person[]; // intézményi kapcsolatok: marketing, PR, továbbképzési központ, más tanszékek
  alumni: Person[]; // METU-t végzett volt hallgatók (titulus + terület)
  opponents: Person[]; // opponensek és diploma-opponensek — külön címzett-kör
  market: Person[]; // piaci / ipari kapcsolatok (titulus + terület)
  groups: PeopleGroup[]; // egyedi email-csoportok
  signature: string; // hivatalos aláírás-blokk — a levélben KI-BE kapcsolható
  signatureLinks: string; // szakos linkek — MINDIG a levél legaljára kerül, elválasztó vonallal
}

// Hivatalos aláírás (a levélben ki-be kapcsolható); a Névjegyzékben bármikor átírható.
export const DEFAULT_SIGNATURE = `Üdvözlettel,
Dr. Balogh Áron

Szakvezető | Média Design szak
(magyar nyelvű BA és MA képzések)
Főiskolai docens, Animáció és Média Design Tanszék
+36 30 115 0594
abalogh@metropolitan.hu
Infopark D, 1117 Budapest, Neumann János utca 2.
Budapesti Metropolitan Egyetem | metropolitan.hu`;

// Szakos linkek — minden levél legaljára kerülnek, az elválasztó vonal után.
export const DEFAULT_SIGNATURE_LINKS = `Web: https://www.metumediadesign.hu
Facebook oktatói csoport: https://www.facebook.com/groups/metumediadesign
Facebook: https://www.facebook.com/metumediadesign
Instagram: https://www.instagram.com/metumediadesign
TikTok: https://www.tiktok.com/@metumediadesign

A Facebookon is folytathatjuk az egyeztetést, és Discord szerverünkön is szívesen várunk: https://discord.gg/KrmxpDS5T`;

export const SIGNATURE_SEPARATOR = '---------------------';

// A levél lábléce: opcionális hivatalos aláírás + mindig a link-blokk, elválasztó vonallal.
export const buildFooter = (db: PeopleDB, withSignature: boolean): string =>
  `${withSignature ? db.signature + '\n\n' : ''}${SIGNATURE_SEPARATOR}\n${db.signatureLinks}`;

export type PersonKind = 'T' | 'H' | 'I' | 'A' | 'O' | 'P'; // Tanár | Hallgató | Intézményi | Alumni | Opponens | Piaci
export const KIND_LABEL: Record<PersonKind, string> = {
  T: 'Tanár', H: 'Hallgató', I: 'Intézményi', A: 'Alumni', O: 'Opponens', P: 'Piaci',
};

export interface RosterEntry {
  name: string;
  kind: PersonKind;
}

export const DEFAULT_PEOPLE: PeopleDB = { teachers: [], students: [], institution: [], alumni: [], opponents: [], market: [], groups: [], signature: DEFAULT_SIGNATURE, signatureLinks: DEFAULT_SIGNATURE_LINKS };

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

const normPerson = (x: Person): Person => ({ name: x.name, email: x.email ?? null, phone: normalizePhone(x.phone ?? null), title: x.title ?? null, field: x.field ?? null, status: x.status ?? null, cohort: x.cohort ?? null });

export const normalizePeople = (p: Partial<PeopleDB>): PeopleDB => {
  // régi, egyben tárolt aláírás szétválasztása: a "Web: ..."-tól kezdődő rész a link-blokk
  const raw = (p.signature ?? '').trim();
  const wi = raw.indexOf('Web: https://');
  const sig = (wi >= 0 ? raw.slice(0, wi) : raw).trim();
  const inheritedLinks = wi >= 0 ? raw.slice(wi).trim() : '';
  return {
    teachers: (p.teachers ?? []).filter((x) => x && x.name).map(normPerson),
    students: (p.students ?? []).filter((x) => x && x.name).map(normPerson),
    institution: (p.institution ?? []).filter((x) => x && x.name).map(normPerson),
    alumni: (p.alumni ?? []).filter((x) => x && x.name).map(normPerson),
    opponents: (p.opponents ?? []).filter((x) => x && x.name).map(normPerson),
    market: (p.market ?? []).filter((x) => x && x.name).map(normPerson),
    groups: (p.groups ?? []).filter((g) => g && g.name).map((g) => ({ name: g.name, members: g.members ?? [] })),
    signature: sig || DEFAULT_SIGNATURE,
    signatureLinks: (p.signatureLinks ?? '').trim() || inheritedLinks || DEFAULT_SIGNATURE_LINKS,
  };
};

// A név KANONIKUS (Névjegyzék-beli) írásmódja titulussal — pl. "Balogh Áron" (Excel-forma)
// → "Dr. Balogh Áron". Az illesztés dr./habil- és ékezet-toleráns; a Névjegyzékben nem
// szereplő név változatlanul jön vissza. Az ADAT nem változik, csak a megjelenítés.
export const buildCanonicalNames = (db: PeopleDB): Map<string, string> => {
  const m = new Map<string, string>();
  [...db.teachers, ...db.institution, ...db.alumni, ...db.opponents].forEach((p) => {
    const k = normName(p.name);
    if (!m.has(k)) m.set(k, p.name);
  });
  return m;
};

// Egy név elérhetőségének feloldása a törzsből (bármelyik állandó listából).
export const emailOf = (db: PeopleDB, name: string): string | null => {
  const p = db.teachers.find((x) => x.name === name)
    || db.students.find((x) => x.name === name)
    || db.institution.find((x) => x.name === name)
    || db.alumni.find((x) => x.name === name)
    || db.opponents.find((x) => x.name === name)
    || db.market.find((x) => x.name === name);
  return p?.email ?? null;
};

// Egységes választólista: minden állandó lista egyben, badge-hez való típussal.
// Címzettet, felelőst, résztvevőt MINDIG ezekből választunk (a listák a Névjegyzékben bővíthetők).
// A volt / külsős oktató-kontaktok is választhatók (T badge-dzsel), hogy nekik is lehessen írni.
export const buildRoster = (teacherNames: string[], db: PeopleDB): RosterEntry[] => [
  ...teacherNames.map((name) => ({ name, kind: 'T' as const })),
  ...formerTeacherNames(teacherNames, db)
    .filter((name) => !teacherNames.includes(name) && !db.alumni.some((a) => a.name === name)) // se tantervi, se alumni duplikátum
    .map((name) => ({ name, kind: 'T' as const })),
  ...db.students.map((s) => ({ name: s.name, kind: 'H' as const })),
  ...db.institution.map((s) => ({ name: s.name, kind: 'I' as const })),
  ...db.alumni.map((s) => ({ name: s.name, kind: 'A' as const })),
  ...db.opponents.map((s) => ({ name: s.name, kind: 'O' as const })),
  ...db.market.map((s) => ({ name: s.name, kind: 'P' as const })),
];
