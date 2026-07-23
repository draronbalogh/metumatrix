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

// Prioritás - 3 szint, a nyitott feladatok alapból e szerint csoportosulnak
export type TaskPriority = 'high' | 'normal' | 'low';
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Magas', normal: 'Közepes', low: 'Alacsony',
};
export const PRIORITY_ORDER: TaskPriority[] = ['high', 'normal', 'low'];
export const nextPriority = (p: TaskPriority): TaskPriority =>
  PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(p) + 1) % PRIORITY_ORDER.length];

// Kézi ⭐ felülbírálat a Legfontosabbak sávhoz
export type TaskStar = 'on' | 'off';
// Egy javasolt Meet-időpont (a lib/letters MeetSlot-tal mező-kompatibilis, de itt
// definiálva, hogy az adatmodell ne függjön a levél-libtől)
export interface AgendaMeetSlot { day: string; start?: string | null; end?: string | null }

// Fix kategória-taxonómia a feladatokhoz (egy kategória / feladat)
export const TASK_CATEGORIES = [
  'Oktatásszervezés', 'Kurzus & tanterv', 'AI', 'Szoftver & eszköz',
  'Kommunikáció & PR', 'Kiállítás & esemény', 'Jog', 'Fejlesztés',
  'Infrastruktúra', 'HR & demonstrátor', 'Web & archívum', 'Egyéb',
] as const;

// A bot által előre megírt választervezet (aláírás NÉLKÜL - azt az app teszi hozzá)
export interface ReplyDraft { label: string; subject: string; body: string }

// A Posta állapotgépe - minden bejövő levél pontosan EGY állapotban van:
// pending → rám várnak · snoozed → halasztva (csak felbukkanási dátum, határidőt sosem
// módosít) · waiting → rájuk várok (válaszoltam, követési dátummal) · replied →
// megválaszolva · noreply → lezárva, nem igényelt választ. Lezárt/várakozó állapotból
// új bejövő levél automatikusan visszanyit pending-be (auto-reopen, a bot végzi).
// 'drafted': a válasz MEGÍRVA és mentve (Titkárnő), de MÉG NEM ment el - a felhasználó
// átmásolja a levelezőjébe, és utána zárja le. Külön „Másolható" blokkban él.
export type SourceStatus = 'pending' | 'snoozed' | 'waiting' | 'drafted' | 'replied' | 'noreply';
export const SOURCE_STATUSES: SourceStatus[] = ['pending', 'snoozed', 'waiting', 'drafted', 'replied', 'noreply'];
export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  pending: 'válaszra vár', snoozed: 'halasztva', waiting: 'rájuk várok',
  drafted: 'másolásra kész', replied: 'megválaszolva', noreply: 'lezárva',
};

// A szál-idővonal egy bejegyzése: ki írt, mikor, melyik irányba, egy mondatban mit.
// A bejövőket a bot fűzi hozzá (append-only), a kimenőket az app a válasz elküldésekor.
export interface ThreadMsg {
  at: string;            // ISO vagy ÉÉÉÉ-HH-NN
  from: string;          // a küldő neve
  dir: 'in' | 'out';     // bejövő / a mi kimenő üzenetünk
  gist: string;          // egy mondat a lényegről
}

// Egy email-melléklet: a bot letölti a mail-attachments/<day>/ mappába, és a kártya
// source-jába jegyzi (name + day). A UI innen kínálja letöltésre/megnyitásra.
export interface AgendaAttachment {
  name: string;         // fájlnév (a mail-attachments/<day>/ alatt)
  day?: string | null;  // az archív alkönyvtár napja (ÉÉÉÉ-HH-NN); enélkül nem nyitható meg
  note?: string | null; // opcionális (pl. "linkelt dokumentum", méret)
}

// A tételt kiváltó bejövő email feladója - neki külön válasz-levél írható.
// bodyFile: a legutóbbi bejövő levél TELJES szövege a mail-attachments archívumban
// ("ÉÉÉÉ-HH-NN/<kártya-id>-level.txt") - a Posta ebből mutatja/olvassa fel az eredetit.
export interface AgendaSource {
  bodyFile?: string | null;
  name: string;
  email: string;
  subject?: string | null; // az eredeti levél tárgya (a Re: válaszhoz)
  date?: string | null;    // a legutóbbi levél érkezési napja (ÉÉÉÉ-HH-NN)
  /** @deprecated → repliedAt; a migráció olvassa be, mentéskor már nem íródik */
  replied?: string | null;
  gist?: string | null;    // EGY tényszerű mondat: mit kér / mire vár választ a feladó
  cc?: string[] | null;    // levélszálnál a válasz további címzettjei (email-címek)
  replies?: ReplyDraft[] | null; // a bot 3 előre megírt választerve (a levél + agenda + stílusfájl alapján)
  status?: SourceStatus;        // állapotgép - hiányzó érték betöltéskor migrálódik
  repliedAt?: string | null;    // mikor ment el a válasz (ISO)
  snoozeUntil?: string | null;  // halasztás felbukkanási napja (ÉÉÉÉ-HH-NN)
  followUpAt?: string | null;   // rájuk-várok: eddig várunk a válaszukra, utána visszatér
  waitingSince?: string | null; // a legrégebbi megválaszolatlan bejövő napja - a bot származtatja újra
  repliesFor?: string | null;   // melyik bejövőhöz készültek a tervek (ISO) - elavulás-jelzéshez
  lastInboundAt?: string | null; // a legutolsó bejövő levél ISO időbélyege - elavulás: lastInboundAt > repliesFor
  returned?: string | null;     // ébresztés/újranyitás időpontja (ISO) - a Visszatért sáv jelzője
  scheduledFor?: string | null; // hajnali ÜTEMEZETT küldés tervezett ideje (helyi "ÉÉÉÉ-HH-NNTÓÓ:PP:MM"); APP-tulajdon, a bot nem írja
  draftMode?: 'reply' | 'ping' | null; // 'ping': a tervek követő-emlékeztetők (T7 ébresztés után), nem válaszok
  thread?: ThreadMsg[] | null;  // a szál idővonala (bot: bejövők, app: kimenők)
  attachments?: AgendaAttachment[] | null; // az eredeti levél mellékletei (a bot archiválja, a UI megnyithatja)
  shadow?: boolean;             // árnyék-forrás kapcsolt feladat–esemény ikernél: a Posta-sor és az állapot a feladaton él
  rawReply?: string | null;     // Titkárnő gyűjtő-mód: a felhasználó NYERS döntése, a kötegelt megfogalmazásig
  meetLink?: string | null;     // a levélhez/kártyához kötött Google Meet-link (megjelenítéshez)
}

// Kimenő bejegyzés hozzáfűzése a szál-idővonalhoz (válasz elküldésekor / kézi jelöléskor)
export const withOutEntry = (s: AgendaSource, gist: string): ThreadMsg[] =>
  [...(s.thread ?? []), { at: new Date().toISOString(), from: DEFAULT_OWNER, dir: 'out' as const, gist }];

// A tervek elavultak-e: érkezett-e újabb bejövő, mint amihez a tervek készültek
export const draftsStale = (s: AgendaSource): boolean => {
  if (!s.replies?.length || !s.repliesFor) return false;
  if (s.lastInboundAt) return s.lastInboundAt > s.repliesFor;
  return !!s.date && s.date > s.repliesFor.slice(0, 10);
};

// Alfeladat: kipipálható lépés, opcionális saját felelőssel és határidővel
export interface TaskStep {
  text: string;
  done: boolean;
  owner?: string | null; // a lépés felelőse - üresen a feladat felelőse viszi
  due?: string | null;   // a lépés pontos határideje (ÉÉÉÉ-HH-NN)
}

export interface AgendaTask {
  id: string;
  title: string;
  summary: string;
  /** @deprecated a régi soronkénti lépéslista - olvasni a taskSteps()-szel kell, mentéskor a steps tükre */
  ideas: string[];
  steps?: TaskStep[];
  status: TaskStatus;
  priority: TaskPriority;   // Magas / Közepes / Alacsony
  category: string | null;  // egy kategória a TASK_CATEGORIES-ból (null = besorolatlan)
  owner: string | null;
  due: string | null;       // szabadszavas határidő a megjelenítéshez (pl. „szeptemberre")
  dueDate: string | null;   // pontos határidő (ÉÉÉÉ-HH-NN) az automatikus emlékeztetőhöz
  people: string[];        // résztvevők: oktatók és/vagy hallgatók - bárki hozzárendelhető
  eventId: string | null;  // ha a feladat egy naptári eseményhez kötődik
  createdAt: string | null; // létrehozás időpontja (ISO) - dátum szerinti rendezéshez és az ÚJ jelzéshez
  source?: AgendaSource | null; // a kiváltó email feladója (válasz-levélhez)
  meetLink?: string | null; // a feladathoz kötött Google Meet-link (megjelenítéshez)
  star?: TaskStar | null;   // kézi ⭐ felülbírálat: 'on' = mindig a Legfontosabbak sávban, 'off' = soha; null/hiányzik = automatikus
  starAt?: string | null;   // a kézi állítás időbélyege (ISO) - az 'off' ez alapján jár le új bejövőnél
}

export interface AgendaEvent {
  id: string;
  title: string;
  when: string;          // megjelenített időpont, szabad szöveg
  sort: string | null;   // rendezéshez: ÉÉÉÉ-HH - üresen a lista végére kerül
  day: string | null;    // kezdőnap (ÉÉÉÉ-HH-NN), ha már ismert - a naptárban ettől jelölődik
  dayEnd: string | null; // időszak utolsó napja (ÉÉÉÉ-HH-NN) - többnapos eseménynél/időszaknál
  featured: boolean;     // kiemelt esemény - hangsúlyosan jelenik meg (sáv, csillag, vastag csík)
  note: string | null;
  place: string | null;
  owner: string | null;
  people: string[];      // résztvevők
  source?: AgendaSource | null; // a kiváltó email feladója (válasz-levélhez)
  googleEventId?: string | null; // a kapcsolt Google Calendar esemény id-je (Meet)
  meetLink?: string | null;      // a Google Meet-link (naptár, feladat, levél, Posta)
  mstatus?: 'tentative' | 'confirmed' | null; // egyeztetés alatt / véglegesítve
  extSource?: 'outlook' | null;  // az abalogh@metropolitan.hu Outlook-naptárból importált tükör-esemény
  extId?: string | null;         // az Outlook GlobalAppointmentID (dedup/frissítés a szinkronnál)
  meetSlots?: AgendaMeetSlot[] | null; // függő Meet-időpontjavaslatok (csak mstatus:'tentative' mellett) - a naptár halványan mutatja őket
  googleEndEventId?: string | null; // hosszú időszaknál (>21 nap) a Google-ba csak KEZDŐ + ZÁRÓ jelölő megy - ez a záró jelölő id-je
}

// Egy feloldott címzett a kimenő (Levelek-kezdeményezett) levélhez
export interface LetterRecipient { name: string; email: string; kind: string }

// Mentett levél (Outlookba másoláshoz készített üzenet) - tételhez (esemény/feladat) köthető
export interface Letter {
  id: string;
  createdAt: string;               // ISO időbélyeg
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  subject: string;
  body: string;
  names: string[];                 // a címzett-nevek a mentés pillanatában
  status?: 'draft' | 'sent' | 'outbox'; // vázlat / kiküldve / kimenő (küldésre kész)
  dir?: 'out';                     // Levelek-kezdeményezett kimenő levél
  recipients?: LetterRecipient[];  // feloldott címzettek (név + email + típus)
  sendMode?: 'personal' | 'bcc';   // személyre szabott egyenként / közös levél ('bcc' örökölt név - 2026-07-23 óta a közös levél MINDEN címzettet láthatóan a To-ba tesz, rejtett BCC nincs)
  sendGoogleInvite?: boolean;      // a Google is küldjön .ics naptár-meghívót
  scheduledFor?: string | null;    // hajnali ütemezett küldés (helyi ISO)
  templateId?: string;             // a scaffold sablon id-je
  meetLink?: string;               // a levélbe kerülő Google Meet-link
}

export interface Agenda {
  intro: string;
  tasks: AgendaTask[];
  events: AgendaEvent[];
  letters: Letter[];
  topicLinks: Record<string, string>; // témasablon-id → 'e:<esemény-id>' / 't:<feladat-id>' rögzített kapcsolat
  hiddenExtIds?: string[]; // az appban törölt Outlook-tükör események kulcsai - a szinkron nem hozza vissza őket
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

// Strukturált határidő megjelenítése - a dueDate három pontosságot hordozhat:
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
// szövegben („szeptemberre kész"), abból ÉÉÉÉ-HH lesz - a legközelebbi ilyen hónap.
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

// ---- Dátum-helperek a Posta állapotgépéhez (Date-string-parse NÉLKÜL - Safari!) ----
const pad2 = (n: number): string => String(n).padStart(2, '0');
export const localTodayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
export const addDaysYmd = (base: string, days: number): string => {
  const d = new Date(Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1, Number(base.slice(8, 10)) + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
export const tomorrowYmd = (): string => addDaysYmd(localTodayYmd(), 1);
// mindig a KÖVETKEZŐ hétfő, szigorúan a mai nap után (hétfőn = +7 nap)
export const nextMondayYmd = (): string => {
  const dow = new Date().getDay();
  return addDaysYmd(localTodayYmd(), ((8 - dow) % 7) || 7);
};
// n munkanap hozzáadása (szombat/vasárnap átugrása) - a követési dátumhoz
export const addWorkdaysYmd = (days: number): string => {
  let d = localTodayYmd();
  let left = days;
  while (left > 0) {
    d = addDaysYmd(d, 1);
    const dow = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return d;
};
// Határidő időbélyege rendezéshez: 'ÉÉÉÉ-HH' → a hónap utolsó napja 23:59,
// 'ÉÉÉÉ-HH-NN[ ÓÓ:PP]' → pontos. Hónap-pontosságú érték a 48 órás sávba nem mehet.
export const dueTs = (d?: string | null): number | null => {
  if (!d || d.length < 7) return null;
  const y = Number(d.slice(0, 4));
  const mo = Number(d.slice(5, 7));
  if (!y || !mo) return null;
  if (d.length < 10) return new Date(y, mo, 0, 23, 59).getTime();
  const day = Number(d.slice(8, 10));
  const hh = d.length >= 16 ? Number(d.slice(11, 13)) : 23;
  const mm = d.length >= 16 ? Number(d.slice(14, 16)) : 59;
  return new Date(y, mo - 1, day, hh, mm).getTime();
};
export const duePrecise = (d?: string | null): boolean => !!d && d.length >= 10;

// Helyszín-ikon: online meetinghez kamera, fizikai helyhez térkép-tű - az online
// egyeztetést SOHA nem jelöljük tűvel/pinnel (user-döntés, 2026-07-20)
export const placeIcon = (p?: string | null): string =>
  (p && p.trim().toLowerCase().startsWith('online') ? '📹' : '📍');

// A Posta-lista és a menü-számláló EGYETLEN predikátuma: kire várunk még válaszért.
export const isAwaiting = (s?: AgendaSource | null): boolean =>
  !!s && !!s.email && !s.shadow && (s.status ?? 'pending') === 'pending';

// ---- Legfontosabbak sáv: számított rang + kézi ⭐ felülbírálat ----
// A kézi 'off' LEJÁR, ha a levétel óta új bejövő érkezett a szálban
// (lastInboundAt > starAt) - ilyenkor a számított kiemelés él újra.
export const starOverride = (t: AgendaTask): TaskStar | null => {
  if (!t.star) return null;
  if (t.star === 'off' && t.starAt && t.source?.lastInboundAt && t.source.lastInboundAt > t.starAt) return null;
  return t.star;
};
// pontos határidő ms-ben (ÉÉÉÉ-HH-NN), enélkül null
export const dueMsOf = (t: AgendaTask): number | null => {
  const d = t.dueDate;
  if (!d || d.length < 10) return null;
  const ms = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime();
  return Number.isNaN(ms) ? null : ms;
};
// a sáv KÉZI FELÜLBÍRÁLAT NÉLKÜLI rangja: kisebb = előrébb; 99 = nincs bent.
// Levél-ügyek elöl (új válasz kell / válaszra vár / kész válasz), majd közeli határidő, majd magas prioritás.
export const baseUrgencyRank = (t: AgendaTask, soon: number): number => {
  if (t.source?.returned) return 0;
  if (isAwaiting(t.source)) return 1;
  if (t.source?.status === 'drafted') return 2;
  const dm = dueMsOf(t);
  if (dm !== null && dm <= soon) return 3;
  if (t.priority === 'high') return 4;
  return 99;
};
// a hatályos rang: kézi 'on' → 0 (mindig bent, elöl), hatályos 'off' → 99 (soha), különben számított
export const urgencyRank = (t: AgendaTask, soon: number): number => {
  const s = starOverride(t);
  if (s === 'on') return 0;
  if (s === 'off') return 99;
  return baseUrgencyRank(t, soon);
};
// a ⭐ gomb következő tárolt értéke: ha az új kívánt állapot megegyezik a számítottal,
// null tárolódik (nincs felesleges felülbírálat, az automatika él tovább)
export const nextStarFor = (t: AgendaTask, soon: number): TaskStar | null => {
  const inBand = urgencyRank(t, soon) < 99;
  const baseIn = baseUrgencyRank(t, soon) < 99;
  if (inBand) return baseIn ? 'off' : null;
  return baseIn ? null : 'on';
};

// Korábban mentett (régebbi sémájú) adat kiegészítése az új mezőkkel.
// A steps itt materializálódik az ideas-ból, és az ideas a steps tükre marad -
// az első mentés így az egész fájlt átviszi az új sémára, adatvesztés nélkül.
// a source csak érvényes feladó-objektumként fogadható el; a tévesen ide írt
// forrásmegjelölés-szöveg (pl. "Tanév rendje xlsx") a note/summary végére kerül
const cleanSource = (raw: unknown): { src: AgendaSource | null; provenance: string | null } => {
  if (raw && typeof raw === 'object') {
    const o = raw as AgendaSource;
    if (typeof o.email === 'string') return { src: o, provenance: null };
    // hibás bot-írás (pl. email:null): üres emailre javítjuk, NEM dobjuk - az
    // állapot-mezők nem veszhetnek el; email nélkül a Posta úgysem listázza
    if (typeof o.name === 'string' && o.name.trim()) return { src: { ...o, email: '' }, provenance: null };
  }
  if (typeof raw === 'string' && raw.trim()) return { src: null, provenance: raw.trim() };
  return { src: null, provenance: null };
};

// A source állapot-mezőinek migrációja + a kliens-oldali ébresztések:
// hiányzó status a szülő-tétel alapján kap értéket (kész feladat / elmúlt esemény →
// 'noreply', élő tétel → 'pending'); lejárt halasztás vagy követési dátum → vissza
// 'pending'-be, returned-jelöléssel (<= összehasonlítás: az elmulasztott nap is tüzel).
const VALID_STATUS = new Set<string>(SOURCE_STATUSES);
const migrateSource = (raw: AgendaSource, closedHint: boolean): AgendaSource => {
  const repliedAt = raw.repliedAt ?? raw.replied ?? null;
  let status: SourceStatus = VALID_STATUS.has(raw.status as string)
    ? (raw.status as SourceStatus)
    : repliedAt ? 'replied' : closedHint ? 'noreply' : 'pending';
  let snoozeUntil = raw.snoozeUntil ?? null;
  let followUpAt = raw.followUpAt ?? null;
  let returned = raw.returned ?? null;
  const today = localTodayYmd();
  if (status === 'snoozed' && (!snoozeUntil || snoozeUntil.slice(0, 10) <= today)) {
    status = 'pending'; snoozeUntil = null; returned = returned ?? new Date().toISOString();
  }
  if (status === 'waiting' && followUpAt && followUpAt.slice(0, 10) <= today) {
    status = 'pending'; followUpAt = null; returned = returned ?? new Date().toISOString();
  }
  const out: AgendaSource = {
    ...raw, status, repliedAt, snoozeUntil, followUpAt, returned,
    waitingSince: raw.waitingSince ?? raw.date ?? null,
  };
  delete out.replied;
  return out;
};
const withProvenance = (text: string | null | undefined, p: string | null): string | null => {
  const t = text ?? null;
  if (!p) return t;
  if (t && t.includes(p)) return t;
  return `${t ? `${t}\n` : ''}Forrás: ${p}`;
};

export const normalizeAgenda = (a: Partial<Agenda>): Agenda => {
  const today = localTodayYmd();
  const emailKey = (s?: AgendaSource | null): string => (s?.email ?? '').trim().toLowerCase();
  const tasks = (a.tasks ?? []).map((t) => {
    const steps = taskSteps(t);
    // szöveges határidő → strukturált, ha kiolvasható belőle hónap (egyszeri migráció)
    const migrated = !t.dueDate && t.due ? parseLooseDue(t.due) : null;
    const { src, provenance } = cleanSource(t.source as unknown);
    const source = src ? migrateSource(src, t.status === 'done') : null;
    return { ...t, steps, ideas: steps.map((s) => s.text), people: t.people ?? [], eventId: t.eventId ?? null, dueDate: t.dueDate ?? migrated, due: migrated ? null : t.due ?? null, priority: t.priority ?? 'normal', category: t.category ?? null, createdAt: t.createdAt ?? null, source, summary: withProvenance(t.summary, provenance) ?? '' };
  });
  const events = (a.events ?? []).map((e) => {
    const { src, provenance } = cleanSource(e.source as unknown);
    const last = e.dayEnd ?? e.day ?? null;
    const past = last ? last < today : !!(e.sort && e.sort < today.slice(0, 7));
    let source = src ? migrateSource(src, past) : null;
    // kapcsolt feladat–esemény iker ugyanazzal a feladóval: az állapot EGYETLEN
    // írója a feladat - az esemény forrása árnyékká válik (provenance marad,
    // állapot- és draft-mezők nélkül), így a Posta nem mutat két sort egy levélre
    if (source && emailKey(source)) {
      const twin = tasks.find((t) => t.eventId === e.id && emailKey(t.source) === emailKey(source));
      if (twin) source = { name: source.name, email: source.email, subject: source.subject ?? null, date: source.date ?? null, gist: source.gist ?? null, shadow: true };
    }
    return { ...e, people: e.people ?? [], day: e.day ?? null, dayEnd: e.dayEnd ?? null, featured: e.featured ?? false, source, note: withProvenance(e.note, provenance) };
  });
  return { intro: a.intro ?? DEFAULT_AGENDA.intro, tasks, events, letters: a.letters ?? [], topicLinks: a.topicLinks ?? {}, hiddenExtIds: a.hiddenExtIds ?? [] };
};

// Három-utas összefésülés 409-es ütközés után: tételszinten a HELYBEN módosított
// elem nyer, minden más a szerver állapotát követi; a helyi és a távoli új tételek
// megmaradnak; a helyi törlés csak akkor él, ha a tétel a szerveren nem változott.
export const mergeAgendaDocs = (base: Agenda | null, local: Agenda, remote: Agenda): Agenda => {
  const b = base ?? remote;
  const mergeList = <T extends { id: string }>(bl: T[], ll: T[], rl: T[]): T[] => {
    const bm = new Map(bl.map((x) => [x.id, JSON.stringify(x)]));
    const lm = new Map(ll.map((x) => [x.id, x]));
    const seen = new Set<string>();
    const out: T[] = [];
    rl.forEach((r) => {
      seen.add(r.id);
      const li = lm.get(r.id);
      const bs = bm.get(r.id);
      if (li === undefined) {
        if (bs !== undefined && bs === JSON.stringify(r)) return; // helyi törlés, távol változatlan
        out.push(r);
        return;
      }
      const localChanged = bs === undefined || bs !== JSON.stringify(li);
      out.push(localChanged ? li : r);
    });
    ll.forEach((l) => { if (!seen.has(l.id) && !bm.has(l.id)) out.push(l); });
    return out;
  };
  return {
    intro: local.intro !== b.intro ? local.intro : remote.intro,
    tasks: mergeList(b.tasks, local.tasks, remote.tasks),
    events: mergeList(b.events, local.events, remote.events),
    letters: mergeList(b.letters ?? [], local.letters ?? [], remote.letters ?? []),
    topicLinks: JSON.stringify(local.topicLinks) !== JSON.stringify(b.topicLinks) ? local.topicLinks : remote.topicLinks,
    hiddenExtIds: JSON.stringify(local.hiddenExtIds ?? []) !== JSON.stringify(b.hiddenExtIds ?? []) ? (local.hiddenExtIds ?? []) : (remote.hiddenExtIds ?? []),
  };
};

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

const DEFAULT_INTRO = 'Aktuálisan a 2026/27-es tanév őszi félévében az alábbi feladatok várnak ránk - az oktatói eligazító munkavázlata alapján, szabadon bővíthető és szerkeszthető.';

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
      summary: 'A hallgatókat közösen, mindenki előtt értékeljük - ezt protokollként rögzítsük.',
      ideas: ['A nyilvános értékelés menetének rögzítése (ki, mikor, milyen sorrendben)', 'Egységes értékelési szempontrendszer', 'Pótértékelés rendje, ha valaki kimarad'] },
    { id: 't4', title: 'Vállalások mérete - szkóp definiálása', status: 'todo', owner: null, due: null,
      summary: 'Diploma- és szakdolgozati projektek elvárásainak egységesítése oktatók között.',
      ideas: ['Minimum és maximum elvárás rögzítése', 'Terhelés kiegyenlítése hallgatók és témavezetők között', 'Projekt eleji rövid szkóp-megállapodás', 'Írott támpont: mi számít teljes BA vagy MA munkának'] },
    { id: 't5', title: 'Kiállítások, marketing, kommunikáció', status: 'todo', owner: null, due: null,
      summary: 'Csatornák és rendszerek kialakítása befelé és kifelé.',
      ideas: ['Belső infómegosztás: közös naptár, csatorna', 'Külső kommunikáció: közösségi média, sajtó, egyetemi felületek - felelősökkel', 'Kiállítási sablon és visszaszámláló ütemterv (checklist)', 'Fotó–videó dokumentáció minden kiállításról', 'Nyitott kérdés: ki keresi a helyszínt'] },
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
      summary: 'Túl sok eszköz, és függőség alakult ki - átvilágítás kell.',
      ideas: ['Jelenlegi szoftverek és licencek átvilágítása', 'Átfedések kiszűrése (több eszköz ugyanarra)', 'Függőség és kiszolgáltatottság csökkentése', 'Indokolt helyen nyílt forráskódú vagy saját üzemeltetésű alternatíva'] },
    { id: 't10', title: 'Jogi aspektusok', status: 'todo', owner: null, due: null,
      summary: 'A kiállításokhoz és a hallgatói munkákhoz kapcsolódó jogi kérdések rendezése.',
      ideas: ['Szerzői jog: hallgatói munkák felhasználása, megnevezés, engedély', 'Képmáshoz fűződő jog és GDPR a kiállítási fotóknál, videóknál', 'Szerződések a helyszínekkel és a külső partnerekkel', 'Biztosítás: eszközök és kiállítások', 'AI-generált tartalom jogi státusza'] },
    { id: 't11', title: 'Őszi események előkészítése', status: 'todo', owner: null, due: 'augusztustól',
      summary: 'Dátumhoz kötött vállalások, visszafelé tervezett határidőkkel - a részletek az Események fülön.',
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
      ideas: ['Kiértékelési és kipakolási menetrend kezelő alkalmazás', 'Bálint sorsoló órája (véletlenszerű beosztó)', 'Melyik alkalmazás mit old meg - átfedések tisztázása', 'Felelős és karbantartó mindegyikhez'] },
    { id: 't17', title: 'Interaktív publikációs platform', status: 'doing', owner: 'Tamás', due: null,
      summary: 'Felület, ahol mindenki publikálhatja a munkáit - a megvalósítás elindult.',
      ideas: ['Hol tart most, mi kell a folytatáshoz', 'Cél tisztázása: hallgatói portfólió, szakos kirakat vagy belső megosztó', 'Kapcsolat a szakos weboldallal és az archívummal'] },
    { id: 't18', title: 'Szakdolgozati témavezetés', status: 'todo', owner: null, due: null,
      summary: 'Ki mennyit és hol vállal - átlátható elosztás.',
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
      summary: 'Hogy állunk most, mi a helyzet - a státusz tisztázása.',
      ideas: ['Jelenlegi státusz és következő lépés', 'Felelős a kapcsolattartásért'] },
    { id: 't24', title: 'Sztenderdek: prezentáció, showreel, 3D', status: 'todo', owner: null, due: null,
      summary: 'Egységes minőségi sztenderdek a prezentációkhoz, showreelekhez és 3D anyagokhoz.',
      ideas: ['Prezentációs sablon és minőségi elvárások', 'Showreel irányelvek: hossz, felépítés, formátum', 'A 3D turntable anyagok egységes publikálása'] },
    { id: 't25', title: 'Angol nyelvű szak indulása', status: 'doing', owner: null, due: 'szeptember',
      summary: 'Jelenleg körülbelül 90%-os eséllyel indul szeptembertől.',
      ideas: ['Mi kell még a biztos induláshoz (jelentkezők, oktatók, angol kurzusleírások)', 'Ki tanít angolul, nyelvi felkészültség', 'Anyagok és kommunikáció angol nyelvű változata'] },
    { id: 't26', title: 'Workshopok', status: 'todo', owner: null, due: null,
      summary: 'Külső vagy belső workshopok - kérdés, hogy a szak kéri-e (pl. Dremel Áron workshopja).',
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
      note: 'Bemutatók, workshopok - kapcsolódhat a demonstrátori körhöz és a workshopokhoz.' },
    { id: 'e3', title: 'Angol nyelvű szak indulása', when: '2026. szeptember', sort: '2026-09', place: null, owner: null,
      note: 'Kb. 90% eséllyel indul - angol kurzusleírások és kommunikáció kell hozzá.' },
    { id: 'e4', title: 'Ars Electronica Fesztivál', when: '2026. szeptember', sort: '2026-09', place: 'Linz', owner: null,
      note: null },
    { id: 'e5', title: 'Épületvetítés - körépület kivilágítása', when: 'szeptember vagy október eleje', sort: '2026-09', place: 'METU körépület', owner: null,
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
