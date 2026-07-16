// Feladatok + Események adatmodell és alapértelmezett tartalom.
// A forrás a 2026. júliusi oktatói eligazító munkavázlata (mediadesign_eligazito_vazlat.pdf);
// a felületen minden szabadon szerkeszthető, ez csak az első feltöltés.

export type TaskStatus = 'todo' | 'doing' | 'done';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Teendő',
  doing: 'Folyamatban',
  done: 'Kész',
};
export const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];
export const nextStatus = (s: TaskStatus): TaskStatus =>
  STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];

// Prioritás — 3 szint, a nyitott feladatok alapból e szerint csoportosulnak
export type TaskPriority = 'high' | 'normal' | 'low';
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Magas', normal: 'Közepes', low: 'Alacsony',
};
export const PRIORITY_ORDER: TaskPriority[] = ['high', 'normal', 'low'];
export const nextPriority = (p: TaskPriority): TaskPriority =>
  PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(p) + 1) % PRIORITY_ORDER.length];

// Fix kategória-taxonómia a feladatokhoz (egy kategória / feladat)
export const TASK_CATEGORIES = [
  'Oktatásszervezés', 'Kurzus & tanterv', 'AI', 'Szoftver & eszköz',
  'Kommunikáció & PR', 'Kiállítás & esemény', 'Jog', 'Fejlesztés',
  'Infrastruktúra', 'HR & demonstrátor', 'Web & archívum', 'Egyéb',
] as const;

// A bot által előre megírt választervezet (aláírás NÉLKÜL — azt az app teszi hozzá)
export interface ReplyDraft { label: string; subject: string; body: string }

// A tételt kiváltó bejövő email feladója — neki külön válasz-levél írható.
export interface AgendaSource {
  name: string;
  email: string;
  subject?: string | null; // az eredeti levél tárgya (a Re: válaszhoz)
  date?: string | null;    // a levél érkezési napja (ÉÉÉÉ-HH-NN) — a Posta lista rendezéséhez
  replied?: string | null; // mikor lett megválaszoltnak jelölve (ISO) — üresen még válaszra vár
  gist?: string | null;    // EGY tényszerű mondat: mit kér / mire vár választ a feladó
  cc?: string[] | null;    // levélszálnál a válasz további címzettjei (email-címek)
  replies?: ReplyDraft[] | null; // a bot 3 előre megírt választerve (a levél + agenda + stílusfájl alapján)
}

// Alfeladat: kipipálható lépés, opcionális saját felelőssel és határidővel
export interface TaskStep {
  text: string;
  done: boolean;
  owner?: string | null; // a lépés felelőse — üresen a feladat felelőse viszi
  due?: string | null;   // a lépés pontos határideje (ÉÉÉÉ-HH-NN)
}

export interface AgendaTask {
  id: string;
  title: string;
  summary: string;
  /** @deprecated a régi soronkénti lépéslista — olvasni a taskSteps()-szel kell, mentéskor a steps tükre */
  ideas: string[];
  steps?: TaskStep[];
  status: TaskStatus;
  priority: TaskPriority;   // Magas / Közepes / Alacsony
  category: string | null;  // egy kategória a TASK_CATEGORIES-ból (null = besorolatlan)
  owner: string | null;
  due: string | null;       // szabadszavas határidő a megjelenítéshez (pl. „szeptemberre")
  dueDate: string | null;   // pontos határidő (ÉÉÉÉ-HH-NN) az automatikus emlékeztetőhöz
  people: string[];        // résztvevők: oktatók és/vagy hallgatók — bárki hozzárendelhető
  eventId: string | null;  // ha a feladat egy naptári eseményhez kötődik
  createdAt: string | null; // létrehozás időpontja (ISO) — dátum szerinti rendezéshez és az ÚJ jelzéshez
  source?: AgendaSource | null; // a kiváltó email feladója (válasz-levélhez)
}

export interface AgendaEvent {
  id: string;
  title: string;
  when: string;          // megjelenített időpont, szabad szöveg
  sort: string | null;   // rendezéshez: ÉÉÉÉ-HH — üresen a lista végére kerül
  day: string | null;    // kezdőnap (ÉÉÉÉ-HH-NN), ha már ismert — a naptárban ettől jelölődik
  dayEnd: string | null; // időszak utolsó napja (ÉÉÉÉ-HH-NN) — többnapos eseménynél/időszaknál
  featured: boolean;     // kiemelt esemény — hangsúlyosan jelenik meg (sáv, csillag, vastag csík)
  note: string | null;
  place: string | null;
  owner: string | null;
  people: string[];      // résztvevők
  source?: AgendaSource | null; // a kiváltó email feladója (válasz-levélhez)
}

// Mentett levél (Outlookba másoláshoz készített üzenet) — tételhez (esemény/feladat) köthető
export interface Letter {
  id: string;
  createdAt: string;               // ISO időbélyeg
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  subject: string;
  body: string;
  names: string[];                 // a címzett-nevek a mentés pillanatában
  status?: 'draft' | 'sent';       // vázlat / kiküldve — hiányzó érték = vázlat
}

export interface Agenda {
  intro: string;
  tasks: AgendaTask[];
  events: AgendaEvent[];
  letters: Letter[];
  topicLinks: Record<string, string>; // témasablon-id → 'e:<esemény-id>' / 't:<feladat-id>' rögzített kapcsolat
}

// Új feladat/esemény alapértelmezett felelőse
export const DEFAULT_OWNER = 'Dr. Balogh Áron';

export const emptyTask = (): AgendaTask => ({
  id: `t-${Date.now().toString(36)}`,
  title: '', summary: '', ideas: [], steps: [], status: 'todo', priority: 'normal', category: null, owner: DEFAULT_OWNER, due: null, dueDate: null, people: [], eventId: null,
  createdAt: new Date().toISOString(),
});

// Az alfeladatok EGYETLEN olvasási útja: a régi (csak ideas-os) kártyák soraiból
// pipálatlan lépéseket képez, az újaknál a steps mezőt adja vissza.
export const taskSteps = (t: AgendaTask): TaskStep[] =>
  t.steps ?? (t.ideas ?? []).filter(Boolean).map((text) => ({ text, done: false }));
export const stepsDone = (t: AgendaTask): number => taskSteps(t).filter((s) => s.done).length;
// rövid magyar dátum ISO-ból: "2026-08-12" → "aug. 12."
const HU_MON = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
export const fmtDayHu = (d?: string | null): string =>
  d && d.length >= 10 ? `${HU_MON[Number(d.slice(5, 7)) - 1] ?? ''} ${Number(d.slice(8, 10))}.` : '';

// Strukturált határidő megjelenítése — a dueDate három pontosságot hordozhat:
// 'ÉÉÉÉ-HH' → „szept." (más évnél „2027. szept."), 'ÉÉÉÉ-HH-NN' → „szept. 2.",
// 'ÉÉÉÉ-HH-NN ÓÓ:PP' → „szept. 2. 14:30". Szabadszavas határidő nincs többé.
export const fmtDueHu = (d?: string | null): string => {
  if (!d || d.length < 7) return '';
  const y = Number(d.slice(0, 4));
  const yPfx = y === new Date().getFullYear() ? '' : `${y}. `;
  if (d.length === 7) return `${yPfx}${HU_MON[Number(d.slice(5, 7)) - 1] ?? ''}`;
  const time = d.length >= 16 ? d.slice(11, 16) : '';
  return `${yPfx}${fmtDayHu(d)}${time ? ` ${time}` : ''}`;
};

const HU_MONTH_FULL = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
// Esemény kijelzett időpontja a strukturált mezőkből (szabad szöveg helyett):
// nap → „2026. szept. 2." (+ „ – 10." ha időszak, + „14:30" ha van óra), hónap → „2026. szeptember".
export const fmtEventWhen = (day: string | null, dayEnd: string | null, sortMonth: string | null, time?: string | null): string => {
  if (day && day.length >= 10) {
    let s = `${day.slice(0, 4)}. ${fmtDayHu(day)}`;
    if (dayEnd && dayEnd > day) s += ` – ${dayEnd.slice(0, 7) === day.slice(0, 7) ? `${Number(dayEnd.slice(8, 10))}.` : fmtDayHu(dayEnd)}`;
    if (time) s += ` ${time}`;
    return s;
  }
  if (sortMonth && sortMonth.length === 7) return `${sortMonth.slice(0, 4)}. ${HU_MONTH_FULL[Number(sortMonth.slice(5, 7)) - 1] ?? ''}`;
  return 'időpont egyeztetés alatt';
};

// A régi szabadszavas határidők egyszeri migrációja: ha hónapnév szerepel a
// szövegben („szeptemberre kész"), abból ÉÉÉÉ-HH lesz — a legközelebbi ilyen hónap.
const HU_MONTH_STEMS = ['jan', 'febr', 'márc', 'ápr', 'máj', 'jún', 'júl', 'aug', 'szept', 'okt', 'nov', 'dec'];
export const parseLooseDue = (text?: string | null): string | null => {
  if (!text) return null;
  const lo = text.toLowerCase();
  const ix = HU_MONTH_STEMS.findIndex((m) => lo.includes(m));
  if (ix < 0) return null;
  const now = new Date();
  const year = ix >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
  return `${year}-${String(ix + 1).padStart(2, '0')}`;
};
export const emptyEvent = (): AgendaEvent => ({
  id: `e-${Date.now().toString(36)}`,
  title: '', when: '', sort: null, day: null, dayEnd: null, featured: false, note: null, place: null, owner: DEFAULT_OWNER, people: [],
});

// Korábban mentett (régebbi sémájú) adat kiegészítése az új mezőkkel.
// A steps itt materializálódik az ideas-ból, és az ideas a steps tükre marad —
// az első mentés így az egész fájlt átviszi az új sémára, adatvesztés nélkül.
export const normalizeAgenda = (a: Partial<Agenda>): Agenda => ({
  intro: a.intro ?? DEFAULT_AGENDA.intro,
  tasks: (a.tasks ?? []).map((t) => {
    const steps = taskSteps(t);
    // szöveges határidő → strukturált, ha kiolvasható belőle hónap (egyszeri migráció)
    const migrated = !t.dueDate && t.due ? parseLooseDue(t.due) : null;
    return { ...t, steps, ideas: steps.map((s) => s.text), people: t.people ?? [], eventId: t.eventId ?? null, dueDate: t.dueDate ?? migrated, due: migrated ? null : t.due ?? null, priority: t.priority ?? 'normal', category: t.category ?? null, createdAt: t.createdAt ?? null, source: t.source ?? null };
  }),
  events: (a.events ?? []).map((e) => ({ ...e, people: e.people ?? [], day: e.day ?? null, dayEnd: e.dayEnd ?? null, featured: e.featured ?? false, source: e.source ?? null })),
  letters: a.letters ?? [],
  topicLinks: a.topicLinks ?? {},
});

// Egy névhez tartozó feladatok/események (felelősként vagy résztvevőként).
export const taskHasPerson = (t: AgendaTask, name: string): boolean =>
  !!name && (t.owner === name || t.people.includes(name));
export const eventHasPerson = (e: AgendaEvent, name: string): boolean =>
  !!name && (e.owner === name || e.people.includes(name));

// Minden név, ami a feladatokban/eseményekben előfordul (szűrőlistához).
export const agendaPeople = (a: Agenda): string[] => {
  const s = new Set<string>();
  a.tasks.forEach((t) => { if (t.owner) s.add(t.owner); t.people.forEach((p) => s.add(p)); });
  a.events.forEach((e) => { if (e.owner) s.add(e.owner); e.people.forEach((p) => s.add(p)); });
  return [...s];
};

const DEFAULT_INTRO = 'Aktuálisan a 2026/27-es tanév őszi félévében az alábbi feladatok várnak ránk — az oktatói eligazító munkavázlata alapján, szabadon bővíthető és szerkeszthető.';

// Az előtöltött tartalom a régi (szűkebb) sémával van felírva; a hiányzó mezőket lentebb pótoljuk.
type RawTask = Omit<AgendaTask, 'people' | 'eventId' | 'dueDate' | 'priority' | 'category' | 'createdAt'>
  & { people?: string[]; eventId?: string | null; dueDate?: string | null; priority?: TaskPriority; category?: string | null; createdAt?: string | null };
type RawEvent = Omit<AgendaEvent, 'people' | 'day' | 'dayEnd' | 'featured'> & { people?: string[]; day?: string | null; dayEnd?: string | null; featured?: boolean };

// A 30 előtöltött feladat kategória-besorolása és időkritikus prioritásai (id szerint).
const TASK_CATEGORY_BY_ID: Record<string, string> = {
  t1: 'Infrastruktúra', t2: 'Oktatásszervezés', t3: 'Oktatásszervezés', t4: 'Oktatásszervezés',
  t5: 'Kommunikáció & PR', t6: 'Kommunikáció & PR', t7: 'HR & demonstrátor', t8: 'AI',
  t9: 'Szoftver & eszköz', t10: 'Jog', t11: 'Kiállítás & esemény', t12: 'Szoftver & eszköz',
  t13: 'Kurzus & tanterv', t14: 'Egyéb', t15: 'Oktatásszervezés', t16: 'Fejlesztés',
  t17: 'Fejlesztés', t18: 'Oktatásszervezés', t19: 'Web & archívum', t20: 'Web & archívum',
  t21: 'Infrastruktúra', t22: 'Kiállítás & esemény', t23: 'Kommunikáció & PR', t24: 'Kurzus & tanterv',
  t25: 'Kurzus & tanterv', t26: 'Kiállítás & esemény', t27: 'Fejlesztés', t28: 'Egyéb',
  t29: 'Oktatásszervezés', t30: 'Kurzus & tanterv',
};
const TASK_PRIORITY_BY_ID: Record<string, TaskPriority> = {
  t8: 'high', t11: 'high', t12: 'high', t25: 'high', t29: 'high',
};

const RAW_TASKS: RawTask[] = [
    { id: 't1', title: 'Raktárszoftver fejlesztése', status: 'todo', owner: null, due: 'jövő évi cél',
      summary: 'A félév során több gondot okozott, fejlesztésre szorul.',
      ideas: ['Tisztázni, pontosan mi akadt el: nyilvántartás, kivitel–visszahozatal követése, eszköz-elérhetőség', 'Döntés: saját fejlesztés vagy kész eszközkölcsönző / leltárrendszer', 'Saját fejlesztés esetén kiváló hallgatói projekt vagy diplomamunka téma', 'Egyszerű első lépés: QR/vonalkódos ki- és bejelentkeztetés, akár megosztott táblázattal'] },
    { id: 't2', title: 'Hallgatói hiányzások', status: 'todo', owner: null, due: null,
      summary: 'Egységes hiányzáskezelés kell minden oktatónál.',
      ideas: ['Egységes hiányzási szabály és küszöb (ne legyen oktatónként más)', 'Megengedett hiányzások száma és a következmények rögzítése', 'Igazolt és igazolatlan hiányzás kezelése', 'Hol vezetjük: Neptun vagy közös felület'] },
    { id: 't3', title: 'Értékelési protokoll (közös, nem egyéni)', status: 'todo', owner: null, due: null,
      summary: 'A hallgatókat közösen, mindenki előtt értékeljük — ezt protokollként rögzítsük.',
      ideas: ['A nyilvános értékelés menetének rögzítése (ki, mikor, milyen sorrendben)', 'Egységes értékelési szempontrendszer', 'Pótértékelés rendje, ha valaki kimarad'] },
    { id: 't4', title: 'Vállalások mérete — szkóp definiálása', status: 'todo', owner: null, due: null,
      summary: 'Diploma- és szakdolgozati projektek elvárásainak egységesítése oktatók között.',
      ideas: ['Minimum és maximum elvárás rögzítése', 'Terhelés kiegyenlítése hallgatók és témavezetők között', 'Projekt eleji rövid szkóp-megállapodás', 'Írott támpont: mi számít teljes BA vagy MA munkának'] },
    { id: 't5', title: 'Kiállítások, marketing, kommunikáció', status: 'todo', owner: null, due: null,
      summary: 'Csatornák és rendszerek kialakítása befelé és kifelé.',
      ideas: ['Belső infómegosztás: közös naptár, csatorna', 'Külső kommunikáció: közösségi média, sajtó, egyetemi felületek — felelősökkel', 'Kiállítási sablon és visszaszámláló ütemterv (checklist)', 'Fotó–videó dokumentáció minden kiállításról', 'Nyitott kérdés: ki keresi a helyszínt'] },
    { id: 't6', title: 'Külső partnerkapcsolatok gondozása', status: 'todo', owner: null, due: null,
      summary: 'A szálak felvétele, gondozása és ápolása.',
      ideas: ['Partnerlista egy helyen (kapcsolattartó, státusz, utolsó egyeztetés)', 'Felelősök kapcsolatonként', 'Rendszeres ráérdeklődés, hogy ne aludjon el'] },
    { id: 't7', title: 'Hallgatói demonstrátor', status: 'todo', owner: null, due: null,
      summary: 'Segítő kell, mert mindenki kapacitása terhelt. Konkrét jelölt: Kovács Ajda (DIGIC).',
      ideas: ['Szerep és feladatok meghatározása (kommunikáció, kiállítás-logisztika, raktár)', 'Kiválasztás szempontjai, óraszám, javadalmazás vagy kreditbeszámítás', 'Akár több kisebb demonstrátori szerep területenként', 'Kérdés: felkérjük, vagy csak megnevezzük'] },
    { id: 't8', title: 'AI integráció', status: 'todo', owner: null, due: 'szeptemberre kész álláspont',
      summary: 'Elébe kell mennünk, mielőtt a hallgatók vagy a vezetőség rákényszerít.',
      ideas: ['Szabályozás: mi megengedett és mi elvárt a hallgatói munkákban', 'Tantervi beépítés: melyik tárgyban, hogyan', 'Oktatói felkészítés (a Pikaso-workshop mintájára)', 'Etikai és hivatkozási iránymutatás'] },
    { id: 't9', title: 'Szoftverek túlhalmozása, kitettség', status: 'todo', owner: null, due: null,
      summary: 'Túl sok eszköz, és függőség alakult ki — átvilágítás kell.',
      ideas: ['Jelenlegi szoftverek és licencek átvilágítása', 'Átfedések kiszűrése (több eszköz ugyanarra)', 'Függőség és kiszolgáltatottság csökkentése', 'Indokolt helyen nyílt forráskódú vagy saját üzemeltetésű alternatíva'] },
    { id: 't10', title: 'Jogi aspektusok', status: 'todo', owner: null, due: null,
      summary: 'A kiállításokhoz és a hallgatói munkákhoz kapcsolódó jogi kérdések rendezése.',
      ideas: ['Szerzői jog: hallgatói munkák felhasználása, megnevezés, engedély', 'Képmáshoz fűződő jog és GDPR a kiállítási fotóknál, videóknál', 'Szerződések a helyszínekkel és a külső partnerekkel', 'Biztosítás: eszközök és kiállítások', 'AI-generált tartalom jogi státusza'] },
    { id: 't11', title: 'Őszi események előkészítése', status: 'todo', owner: null, due: 'augusztustól',
      summary: 'Dátumhoz kötött vállalások, visszafelé tervezett határidőkkel — a részletek az Események fülön.',
      ideas: ['Közös ütemterv és felelősök eseményenként', 'Helyszín-, eszköz- és hallgatói igények előre', 'Összehangolás a kurzusokkal, hogy a hallgatói munka beleférjen a tanmenetbe'] },
    { id: 't12', title: 'Szoftver- és hardverbeszerzés', status: 'todo', owner: null, due: 'szeptemberre',
      summary: 'Igények összegyűjtése és beszerzés, hogy szeptemberre meglegyen.',
      ideas: ['Igénylista az oktatóktól, prioritással', 'Költségkeret és beszerzési határidők', 'VR szemüvegek beszerzése és integrálása', 'Licenc vagy egyszeri vásárlás mérlegelése'] },
    { id: 't13', title: 'Kurzuskínálat áttekintése', status: 'todo', owner: null, due: null,
      summary: 'A meglévő és a tervezett kurzusok áttekintése.',
      ideas: ['Jelenlegi kurzusok felülvizsgálata, hiányzó témák (pl. AI) pótlása', 'Átfedések kiszűrése, ki tanít mit', 'Új kurzusok igénye, leírások frissítése', 'Félévi óratervezés a fejlesztésekhez igazítva'] },
    { id: 't14', title: 'Csatlakozás külső szakképzésekhez', status: 'todo', owner: null, due: null,
      summary: 'Cél: több munkalehetőség és bevétel az oktatóknak.',
      ideas: ['Lehetséges partnerek és platformok azonosítása', 'Piaci keresletű témák (AI-tudás, kurzuskínálat)', 'Saját rövid tanfolyamok a szak nevében vagy partneren keresztül', 'Kapacitás, díjazás, akkreditációs feltételek'] },
    { id: 't15', title: 'Hallgatói normák', status: 'todo', owner: null, due: null,
      summary: 'Egységes elvárások: e-mail, kommunikáció, óralátogatás, szoftverhasználat.',
      ideas: ['Egyoldalas hallgatói kódex a tanév elején, élőszóban is bevezetve', 'E-mail aláírás minta, elvárt hangnem és csatornák', 'Szoftverválasztás kötött az alsóbb években, szabadabb a diplomaprojektekben'] },
    { id: 't16', title: 'Belső fejlesztésű alkalmazások', status: 'todo', owner: null, due: null,
      summary: 'Saját eszközök a működés támogatására (a raktárszoftver is ide tartozik).',
      ideas: ['Kiértékelési és kipakolási menetrend kezelő alkalmazás', 'Bálint sorsoló órája (véletlenszerű beosztó)', 'Melyik alkalmazás mit old meg — átfedések tisztázása', 'Felelős és karbantartó mindegyikhez'] },
    { id: 't17', title: 'Interaktív publikációs platform', status: 'doing', owner: 'Tamás', due: null,
      summary: 'Felület, ahol mindenki publikálhatja a munkáit — a megvalósítás elindult.',
      ideas: ['Hol tart most, mi kell a folytatáshoz', 'Cél tisztázása: hallgatói portfólió, szakos kirakat vagy belső megosztó', 'Kapcsolat a szakos weboldallal és az archívummal'] },
    { id: 't18', title: 'Szakdolgozati témavezetés', status: 'todo', owner: null, due: null,
      summary: 'Ki mennyit és hol vállal — átlátható elosztás.',
      ideas: ['Témavezetői terhelés elosztása (hány hallgató jut egy oktatóra)', 'Ki mely területen vállal témát', 'Kapcsolódik a szkóp-egységesítéshez (4. pont)'] },
    { id: 't19', title: 'Szakos weboldal rendbetétele', status: 'todo', owner: null, due: null,
      summary: 'A szak weboldalát rendbe kell tenni.',
      ideas: ['Mi hiányzik vagy elavult (tartalom, képek, kurzusinfó)', 'Felelős és frissítési ritmus kijelölése', 'Kapcsolat a kommunikációval (5.) és a publikációs platformmal (17.)'] },
    { id: 't20', title: 'Archiválás és felhőbe töltés', status: 'todo', owner: null, due: null,
      summary: 'Az archivált anyagokat és a diplomamunkákat fel kell tölteni a felhőbe.',
      ideas: ['Egységes mappastruktúra és elnevezés', 'Hol tároljuk: felhő, jogosultságok, biztonsági mentés', 'A diplomamunka-archiválás rendje évről évre'] },
    { id: 't21', title: 'Stúdiótér az i épületben', status: 'todo', owner: null, due: 'a félév 5–6. hetétől',
      summary: 'Jövőre stúdióteret kapunk az i épület aljában.',
      ideas: ['Mire használjuk: forgatás, hang, kiállítás-előkészítés, oktatás', 'Foglalási rend és felelős kijelölése', 'Eszközigény (kapcsolódik a beszerzéshez, 12. pont)'] },
    { id: 't22', title: 'Projekt hét előadók', status: 'todo', owner: null, due: null,
      summary: 'A projekt hétre előadókat kell szervezni.',
      ideas: ['Kit hívjunk, milyen témákban', 'Időben felkérni és egyeztetni', 'Kapcsolódhat a külső partnerekhez (6. pont)'] },
    { id: 't23', title: 'Rokoko egyeztetés', status: 'todo', owner: null, due: null,
      summary: 'Hogy állunk most, mi a helyzet — a státusz tisztázása.',
      ideas: ['Jelenlegi státusz és következő lépés', 'Felelős a kapcsolattartásért'] },
    { id: 't24', title: 'Sztenderdek: prezentáció, showreel, 3D', status: 'todo', owner: null, due: null,
      summary: 'Egységes minőségi sztenderdek a prezentációkhoz, showreelekhez és 3D anyagokhoz.',
      ideas: ['Prezentációs sablon és minőségi elvárások', 'Showreel irányelvek: hossz, felépítés, formátum', 'A 3D turntable anyagok egységes publikálása'] },
    { id: 't25', title: 'Angol nyelvű szak indulása', status: 'doing', owner: null, due: 'szeptember',
      summary: 'Jelenleg körülbelül 90%-os eséllyel indul szeptembertől.',
      ideas: ['Mi kell még a biztos induláshoz (jelentkezők, oktatók, angol kurzusleírások)', 'Ki tanít angolul, nyelvi felkészültség', 'Anyagok és kommunikáció angol nyelvű változata'] },
    { id: 't26', title: 'Workshopok', status: 'todo', owner: null, due: null,
      summary: 'Külső vagy belső workshopok — kérdés, hogy a szak kéri-e (pl. Dremel Áron workshopja).',
      ideas: ['Cél és célközönség: hallgatók, oktatók, kívülállók', 'Időzítés, helyszín, eszközigény', 'Kapcsolódhat a Kutatók Éjszakájához és a demonstrátori körhöz (7.)'] },
    { id: 't27', title: 'Biofeedback és új fejlesztési irányok', status: 'todo', owner: null, due: null,
      summary: 'Kérdés: van-e létjogosultsága.',
      ideas: ['Cél tisztázása: oktatás, hallgatói projekt vagy kutatási–installációs irány', 'Kis kísérleti projekt, mielőtt nagyot vállalunk', 'Kapcsolódhat a VR-hez és az installációs eseményekhez (11., 12.)'] },
    { id: 't28', title: 'Norvi (tisztázandó)', status: 'todo', owner: null, due: null,
      summary: 'Nyitott kérdés: mit csináljunk a Norvival.',
      ideas: ['Tisztázni, pontosan mi a kérdés és mi a tét', 'Felelős és következő lépés kijelölése'] },
    { id: 't29', title: 'Tanév rendje (dátumok)', status: 'todo', owner: null, due: null,
      summary: 'A „Tanév rendje" dokumentum megosztása, a pontos dátumok átvétele.',
      ideas: ['Megosztás az oktatókkal, hogy mindenki ugyanazt a naptárt lássa', 'Fő dátumok átvezetése a pontokhoz: félévkezdés, vizsgaidőszak, projekt hét, szünetek', 'A stúdió-kezdés naptári hetének kiszámítása (5–6. hét)'] },
    { id: 't30', title: 'Interaktív film', status: 'todo', owner: null, due: null,
      summary: 'Interaktív film mint irány: oktatás, hallgatói projekt vagy installáció.',
      ideas: ['Cél tisztázása: kurzustéma, diplomaprojekt vagy kiállítási formátum', 'Technológia: elágazó narratíva, valós idejű választás, VR vagy biofeedback bemenet', 'Kapcsolódhat a VR-hez (12.), a publikációs platformhoz (17.) és a biofeedbackhez (27.)'] },
];

const RAW_EVENTS: RawEvent[] = [
    { id: 'e1', title: 'Pótfelvételi', when: '2026. augusztus', sort: '2026-08', place: null, owner: null,
      note: 'Előre készülni: kommunikáció, jelentkezők fogadása.' },
    { id: 'e2', title: 'Kutatók Éjszakája', when: '2026. szeptember', sort: '2026-09', place: null, owner: null,
      note: 'Bemutatók, workshopok — kapcsolódhat a demonstrátori körhöz és a workshopokhoz.' },
    { id: 'e3', title: 'Angol nyelvű szak indulása', when: '2026. szeptember', sort: '2026-09', place: null, owner: null,
      note: 'Kb. 90% eséllyel indul — angol kurzusleírások és kommunikáció kell hozzá.' },
    { id: 'e4', title: 'Ars Electronica Fesztivál', when: '2026. szeptember', sort: '2026-09', place: 'Linz', owner: null,
      note: null },
    { id: 'e5', title: 'Épületvetítés — körépület kivilágítása', when: 'szeptember vagy október eleje', sort: '2026-09', place: 'METU körépület', owner: null,
      note: 'Fény- vagy projekciós projekt; hallgatói munkák bevonásával.' },
    { id: 'e6', title: 'Futuroszkóp', when: 'szeptember vagy október eleje', sort: '2026-10', place: null, owner: null,
      note: 'Az installációk bemutatása.' },
    { id: 'e7', title: 'Stúdiótér birtokbavétele (i épület)', when: 'a félév 5–6. hetétől', sort: '2026-10', place: 'i épület', owner: null,
      note: 'Foglalási rend és eszközigény tisztázandó.' },
    { id: 'e8', title: 'Game Jam / Hun Jam', when: 'időpont egyeztetés alatt', sort: null, place: null, owner: null,
      note: 'Összehangolás a kurzusokkal, hogy a hallgatói munka beleférjen a tanmenetbe.' },
    { id: 'e9', title: 'Projekt hét', when: 'dátum a Tanév rendje szerint', sort: null, place: null, owner: null,
      note: 'Előadók szervezése folyamatban (22. pont).' },
];

export const DEFAULT_AGENDA: Agenda = {
  intro: DEFAULT_INTRO,
  tasks: RAW_TASKS.map((t) => ({
    ...t,
    people: t.people ?? [], eventId: t.eventId ?? null, dueDate: t.dueDate ?? null,
    priority: t.priority ?? TASK_PRIORITY_BY_ID[t.id] ?? 'normal',
    category: t.category ?? TASK_CATEGORY_BY_ID[t.id] ?? null,
    createdAt: t.createdAt ?? null,
  })),
  events: RAW_EVENTS.map((e) => ({ ...e, people: e.people ?? [], day: e.day ?? null, dayEnd: e.dayEnd ?? null, featured: e.featured ?? false })),
  letters: [],
  topicLinks: {},
};
