'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  CATEGORIES, Cohort, Course, Curriculum, DEFAULT_DATA, EdgeLook, UserEdge, VERSION_ORDER, catList, emptyCourse, semLabel, specShort,
} from '@/data/curriculum';
import CatalogView from './CatalogView';
import EditModal from './EditModal';
import AgendaView from './AgendaView';
import EventsView from './EventsView';
import AgendaDrawer, { AgendaDetailsRef } from './AgendaDrawer';
import ITView from './ITView';
import DocsView from './DocsView';
import { EventModal, IntroModal, TaskModal } from './AgendaModals';
import { Agenda, AgendaEvent, AgendaMeetSlot, AgendaSource, AgendaTask, DEFAULT_AGENDA, DEFAULT_OWNER, Letter, LetterRecipient, ReplyDraft, TaskStar, TaskStatus, addDaysYmd, emptyEvent, emptyTask, fmtDayHu, fmtEventWhen, isAwaiting, mergeAgendaDocs, nextPriority, normalizeAgenda, taskSteps, withOutEntry } from '@/data/agenda';
import { composeMeetingLetter } from '@/lib/meetingLetter';
import type { MeetSlot, MeetingMode } from '@/lib/letters';
import { DEFAULT_PEOPLE, PeopleDB, PersonKind, RosterGroups, SenderRule, activeStudentNames, buildCanonicalNames, buildFooter, buildRoster, normalizePeople, emailOf, studentStatusNames, teacherStatusNames } from '@/data/people';
import PostaView from './PostaView';
import { normName, normTitle } from '@/lib/normalize';
import PeopleModal from './PeopleModal';
import NotifyModal, { NotifyTarget } from './NotifyModal';
import TopicsView from './TopicsView';
import LevelWizard from './LevelWizard';
import OrarendView from './OrarendView';
import MonthReport from './MonthReport';
import IdopontModal, { IdopontSeed } from './IdopontModal';
import { TopicTemplate } from '@/lib/topics';
import type { Handlers, Filter, View, Prog } from '@/lib/buildGraph';
import { editHeaders } from '@/lib/editkey';
import { instrList } from '@/lib/buildGraph';
import type { Persist } from './MapView';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 'calc(100vh - 132px)', display: 'grid', placeItems: 'center' }}>
      <div className="load-box"><span className="load-spin" aria-hidden />Térkép betöltése…</div>
    </div>
  ),
});

// nézet-sorrend a főmenü szerint - a mobil swipe-váltás és a vissza-gomb (history) is ezt
// használja. 2026-07-23 user-döntés: NAPI MUNKA ELÖL (az app a Feladatokon indul), a nehéz
// Mátrix hátrébb került; a 'topics' (Levelek) nézet megszűnt (a Postázó hub része lett).
const VIEW_ORDER = ['tasks', 'posta', 'events', 'orarend', 'map', 'catalog', 'people', 'it', 'docs'] as const;
type ViewId = (typeof VIEW_ORDER)[number];
const EDITONLY_VIEWS: readonly ViewId[] = ['posta', 'people', 'docs'];

const LS_KEY = 'mediadesign-2026-27-v9';
const AGENDA_LS_KEY = 'md-agenda-v1';
const PEOPLE_LS_KEY = 'md-people-v1';
const THEME_KEY = 'md-theme2'; // új kulcs: az ideiglenes sötét-alap időszak mentett 'dark' értékei ne ragadjanak be

// TÉMA: az ALAP a SÖTÉT; napközben (07:00-20:00) vált világosra, este 8-tól újra sötét.
// A villanásmentes kezdőállítás a layout.tsx fejléc-szkriptjében van (festés előtt).
// A kézi ☾/☀ kapcsoló felülbírálja, de csak az AKTUÁLIS nap-/éj-időszakra - a
// következő váltásnál (este 8 / reggel 7) az automatika visszaveszi az irányítást.
// A tárolt érték {t, p}: a választott téma + az időszak azonosítója; a régi, sima
// 'light'/'dark' értékeket szándékosan figyelmen kívül hagyjuk (ne ragadjon be).
const isNightHour = (d: Date): boolean => d.getHours() >= 20 || d.getHours() < 7;
const themePeriodId = (d: Date): string => {
  const base = new Date(d);
  if (d.getHours() < 7) base.setDate(base.getDate() - 1); // hajnal = az előző esti éjszaka
  const ymd = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  return isNightHour(d) ? `${ymd}-n` : `${ymd}-d`;
};
const autoTheme = (d: Date): 'light' | 'dark' => (isNightHour(d) ? 'dark' : 'light');
const storedThemeFor = (d: Date): 'light' | 'dark' | null => {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw || raw[0] !== '{') return null; // régi formátum vagy üres: nincs érvényes felülbírálás
    const o = JSON.parse(raw) as { t?: string; p?: string };
    if ((o.t === 'light' || o.t === 'dark') && o.p === themePeriodId(d)) return o.t;
  } catch { /* ignore */ }
  return null;
};
const NOTIF_LS = 'md-notif-v1'; // értesítés sürgős kártyánál: be/ki
const NOTIF_SEEN_LS = 'md-notif-seen-v1'; // már jelzett sürgős kártya-id-k (ne szóljunk kétszer)
// (a stílus-preset választó megszűnt - az app fixen a „műszerfal" kinézetet használja,
// a data-preset alapértéke a layout.tsx-ben áll)
// betöltési állapotgép: amíg nem 'ok', a fájl-automentés tilos (nehogy régi/beépített
// adat írja felül a szerveren lévő legutolsó mentést), és a DEFAULT sosem renderelődik
type LoadState = 'loading' | 'ok' | 'ls-fallback' | 'error' | 'locked';
type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'denied' }
  | { kind: 'error'; msg: string };

interface Ref2 { ci: number; xi: number; }

// Teljes képernyő webkit-tartalékokkal (Safari/iPad); iPhone Safarin az API nem létezik
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FsDocument = Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element | null };
const fsElement = (): Element | null =>
  document.fullscreenElement ?? (document as FsDocument).webkitFullscreenElement ?? null;
const fsSupportedNow = (): boolean => {
  const el = document.documentElement as FsElement;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
};
const enterFs = () => {
  const el = document.documentElement as FsElement;
  if (typeof el.requestFullscreen === 'function') el.requestFullscreen().catch(() => { /* ignore */ });
  else el.webkitRequestFullscreen?.();
};
const exitFs = () => {
  const d = document as FsDocument;
  if (typeof document.exitFullscreen === 'function') document.exitFullscreen().catch(() => { /* ignore */ });
  else d.webkitExitFullscreen?.();
};

// Értesítés kirakása: Androidon csak a SW-s showNotification él, asztali gépen a
// Notification konstruktor is - előbb a SW-t próbáljuk, aztán a sima utat.
const showNotif = async (title: string, body: string) => {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) { await reg.showNotification(title, { body, tag: title }); return; }
  } catch { /* SW nélkül is megpróbáljuk */ }
  try { new Notification(title, { body }); } catch { /* nincs támogatás */ }
};

export default function CurriculumApp() {
  const [data, setData] = useState<Curriculum>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [edited, setEdited] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loadN, setLoadN] = useState(0); // ↻ Újrapróbálás számláló - a betöltő effect újrafuttatásához
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const saveStateRef = useRef<SaveState>({ kind: 'idle' });
  saveStateRef.current = saveState;
  // az agenda/people fájl-mentése csak akkor engedélyezett, ha a saját GET-jük sikerült
  const agendaFileOk = useRef(false);
  const peopleFileOk = useRef(false);

  const [view, setView] = useState<ViewId>('tasks'); // az app a FELADATOKON indul (2026-07-23)
  // a nehéz Mátrix-térkép lusta mountolása: az első map-nézetig be sem töltődik
  const [mapMounted, setMapMounted] = useState(false);
  useEffect(() => { if (view === 'map') setMapMounted(true); }, [view]);
  // app-szintű „Titkárnő fogalmaz" jelző: a nézetváltás/wizard-zárás NE tüntesse el
  const [titkarBusy, setTitkarBusy] = useState<string | null>(null);
  // név -> Névjegyzék-kategória (T/H/...) ref-tükre: a korai callbackek (eventLetterRecipients)
  // futásidőben olvassák, a kindOf memo lentebb tölti fel minden rendernél
  const kindOfRef = useRef<Record<string, PersonKind>>({});
  // POSTÁZÓ HUB (2026-07-22): az EGYETLEN levél-felület - 📨 Posta lista + ➕ Új levél · Sablontár
  // fülekkel; a Posta menüpontból normál nézet, más nézet felett balról beúszó fly-in panel.
  const [postaTab, setPostaTab] = useState<'lista' | 'ir'>('lista');
  const [postaPanel, setPostaPanel] = useState(false);
  // nyitott fly-in alatt a háttér-oldal NEM görgethet (mobilon a görgetés "átvérzett"
  // a panel mögé, és beragadásnak tűnt) - záráskor visszaáll
  useEffect(() => {
    if (!postaPanel) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [postaPanel]);
  const [postaFocus, setPostaFocus] = useState<string | null>(null); // a Feladat/Esemény kártyáról a Postába vitt levél (fókusz)
  const [agenda, setAgenda] = useState<Agenda>(DEFAULT_AGENDA);
  const [peopleDB, setPeopleDB] = useState<PeopleDB>(DEFAULT_PEOPLE);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // alapértelmezés: SÖTÉT (nappal vált világosra)
  const [notifOn, setNotifOn] = useState(false); // értesítés sürgős kártyánál (engedély + kapcsoló együtt)
  const [canEdit, setCanEdit] = useState(true); // bemutató mód: érvényes kulcs nélkül csak olvasás
  const canEditRef = useRef(true);
  const [loadOpen, setLoadOpen] = useState(false); // pillanatkép-betöltő ablak
  const [snaps, setSnaps] = useState<{ name: string; mtime: number; size: number }[] | null>(null);
  const [dockOpen, setDockOpen] = useState(false); // mentés-dokk (mobilon hamburgerből nyílik)
  const [ver, setVer] = useState<string>('2026/2027');
  const [prog, setProg] = useState<Prog>('BA'); // nyitáskor a sima BA nézet aktív
  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('');
  const [ctype, setCtype] = useState('');
  const [instr, setInstr] = useState('');
  const [cat, setCat] = useState('');
  const [editor, setEditor] = useState<Ref2 | null>(null);
  const [details, setDetails] = useState<Ref2 | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [locked, setLocked] = useState(true);
  const [catMenu, setCatMenu] = useState<{ ci: number; xi: number; x: number; y: number } | null>(null);
  const [taskEdit, setTaskEdit] = useState<{ t: AgendaTask; isNew: boolean } | null>(null);
  const [eventEdit, setEventEdit] = useState<{ e: AgendaEvent; isNew: boolean } | null>(null);
  const [agendaDetails, setAgendaDetails] = useState<AgendaDetailsRef | null>(null); // feladat/esemény részletező
  const [introEdit, setIntroEdit] = useState(false);
  const [peopleEdit, setPeopleEdit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // mobilon a főmenü vízszintesen görgethető - nézetváltáskor az aktív fül beúszik a képbe
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    navRef.current?.querySelector('.is-on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [view]);

  useEffect(() => {
    // AbortController: dev StrictMode-ban a dupla mount első kérés-sorozatát a cleanup
    // abortálja - nincs dupla setData, nincs verseny az automentéssel
    const ac = new AbortController();
    setLoadState('loading');
    (async () => {
      // 1) a mintatanterv-fájl a forrás - ezt töltjük be elsőként (helyi API-n át)
      try {
        const r = await fetch('/api/curriculum', { cache: 'no-store', signal: ac.signal, headers: editHeaders() });
        // kulcs nélküli publikus kérés: a szerver zárolt választ ad - üres zár-oldal,
        // localStorage-fallback NÉLKÜL (idegen gépen amúgy sincs, de adatot itt sem mutatunk)
        if (r.status === 403) { setLoadState('locked'); document.title = 'Zárt oldal'; return; }
        const j = await r.json();
        if (j?.ok && j.data?.cohorts) {
          skipFileSave.current = true; // a most betöltött állapotot nem írjuk vissza (retrynél is!)
          setData(j.data as Curriculum); setEdited(true);
          setLoadState('ok'); setLoadErr(null);
        } else throw new Error('server-file');
      } catch (e) {
        if (ac.signal.aborted) return;
        // 2) fallback: helyi vázlat (localStorage) - ilyenkor a fájlba mentés TILOS,
        // nehogy egy régi vázlat felülírja a szerveren lévő legutolsó mentést
        let fromLS = false;
        try {
          const s = localStorage.getItem(LS_KEY);
          if (s) { skipFileSave.current = true; setData(JSON.parse(s) as Curriculum); setEdited(true); fromLS = true; }
        } catch { /* ignore */ }
        setLoadState(fromLS ? 'ls-fallback' : 'error');
        setLoadErr(e instanceof Error && e.message === 'server-file' ? 'A tanterv-fájl nem olvasható a szerveren.' : 'A szerver nem érhető el.');
      }
      if (ac.signal.aborted) return;
      // feladatok + események ugyanígy: fájl → localStorage → beépített DEFAULT_AGENDA
      try {
        const r = await fetch('/api/agenda', { cache: 'no-store', signal: ac.signal, headers: editHeaders() });
        const j = await r.json();
        if (j?.ok && j.data?.tasks) {
          const next = normalizeAgenda(j.data as Partial<Agenda>);
          agendaRev.current = typeof (j.data as { rev?: number }).rev === 'number' ? (j.data as { rev: number }).rev : 0;
          agendaBase.current = next;
          skipAgendaSave.current = true;
          setAgenda(next);
          agendaFileOk.current = true;
        } else throw new Error('server-file');
      } catch {
        if (ac.signal.aborted) return;
        try { const s = localStorage.getItem(AGENDA_LS_KEY); if (s) { skipAgendaSave.current = true; setAgenda(normalizeAgenda(JSON.parse(s) as Partial<Agenda>)); } } catch { /* ignore */ }
      }
      // személyi törzs (hallgatólista + elérhetőségek) - a tanárnevek forrása maga a tanterv
      try {
        const r = await fetch('/api/people', { cache: 'no-store', signal: ac.signal, headers: editHeaders() });
        const j = await r.json();
        if (j?.ok && j.data) { skipPeopleSave.current = true; setPeopleDB(normalizePeople(j.data as Partial<PeopleDB>)); peopleFileOk.current = true; }
        else throw new Error('server-file');
      } catch {
        if (ac.signal.aborted) return;
        try { const s = localStorage.getItem(PEOPLE_LS_KEY); if (s) { skipPeopleSave.current = true; setPeopleDB(normalizePeople(JSON.parse(s) as Partial<PeopleDB>)); } } catch { /* ignore */ }
      }
      try {
        const now = new Date(); setTheme(storedThemeFor(now) ?? autoTheme(now));
        // elrendezés-zárolás: mindig zárva indul (betöltéskor/frissítéskor) a véletlen
        // mozgatás ellen - a mentett értéket szándékosan NEM olvassuk vissza.
        // értesítés: csak akkor él, ha a kapcsoló be van és a böngésző-engedély is megvan
        setNotifOn(localStorage.getItem(NOTIF_LS) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted');
      } catch { /* ignore */ }
      setHydrated(true);
    })();
    return () => ac.abort();
  }, [loadN]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // tárolni CSAK a kézi váltáskor tárolunk (toggleTheme) - az automatikus váltás nem ír
  }, [theme]);
  // az éjszakai automatika: percenként + fókuszra ellenőrizzük, átléptünk-e időszak-határt
  // (este 8 / reggel 7); ha az aktuális időszakra nincs kézi felülbírálás, az óra dönt
  useEffect(() => {
    const tick = () => { const now = new Date(); setTheme(storedThemeFor(now) ?? autoTheme(now)); };
    const iv = setInterval(tick, 60000);
    window.addEventListener('focus', tick);
    return () => { clearInterval(iv); window.removeEventListener('focus', tick); };
  }, []);
  const toggleTheme = () => setTheme((t) => {
    const next = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, JSON.stringify({ t: next, p: themePeriodId(new Date()) })); } catch { /* ignore */ }
    return next;
  });
  // TELJES KÉPERNYŐ: kizárólag a fejléc-gombbal (kézzel) - automatikus belépés nincs.
  // iPhone Safari nem támogatja a Fullscreen API-t → a gomb rejtve.
  const [isFs, setIsFs] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  useEffect(() => {
    setFsSupported(fsSupportedNow());
    const onFs = () => setIsFs(!!fsElement());
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);
  const toggleFs = useCallback(() => {
    if (fsElement()) exitFs();
    else enterFs();
  }, []);
  // gépelhető elem? - a fullscreen+billentyűzet ütközés miatt kell tudnunk (lásd lent)
  const isTypable = (t: EventTarget | null): boolean => {
    if (!(t instanceof HTMLElement)) return false;
    if (t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
    return t.tagName === 'INPUT' && !/^(button|checkbox|radio|range|submit|reset|file|color)$/i.test((t as HTMLInputElement).type);
  };
  // Az AUTOMATIKUS mobil-fullscreen (első érintésre) MEGSZŰNT (2026-07-22 user-kérés:
  // egy feladat-kártyára koppintva váratlanul teljes képernyőre váltott). Teljes képernyő
  // CSAK kézzel, a fejléc-gombbal.
  // ANDROID FULLSCREEN + BILLENTYŰZET ÜTKÖZÉS: teljes képernyőben a billentyűzet a
  // saját, rendszer-témájú (akár fekete) „extract" szerkesztőjét rajzolja a lap fölé
  // (autofill/bankkártya-csíkkal), a bevitt szöveg nem látszik. Érintőképernyőn ezért
  // bármely szövegmező fókuszakor kilépünk a teljes képernyőből - gépelés után a
  // következő koppintás nem kényszerít vissza (a fenti onFirst laponként egyszeri),
  // a ⛶ gombbal bármikor vissza lehet lépni.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (!fsElement()) return;
      if (!window.matchMedia('(pointer: coarse)').matches) return; // asztali gépen nem zavar
      if (isTypable(e.target)) exitFs();
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
  // Hozzáférés: EGYETLEN publikus link (Funnel), query-paraméter nélkül. A szerver
  // a Tailscale-identitás fejlécből dönt: a saját tailnet-eszközökről érkező kérés
  // szerkesztő mód, a kívülről (Funnelen át) érkező megtekintő mód.
  // Mélylink: ?view=<nézet>&q=<keresés> - pl. a Segédletek ☎ név-gombjai ezzel
  // nyitják ÚJ LAPON a Névjegyzéket; a szerkesztő-only nézetek csak sikeres auth után.
  useEffect(() => {
    try { localStorage.removeItem('mm-edit-key'); } catch { /* ignore */ }
    let deepView: ViewId | null = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get('view');
      if (v && (VIEW_ORDER as readonly string[]).includes(v)) deepView = v as ViewId;
      const dq = sp.get('q');
      if (dq) setQ(dq);
    } catch { /* ignore */ }
    // mélylink nélkül az alapértelmezett kezdőnézet a Feladatok (useState) - minden eszközön
    if (deepView && !EDITONLY_VIEWS.includes(deepView)) { histReplaceNext.current = true; setView(deepView); }
    fetch('/api/auth', { headers: editHeaders(), cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setCanEdit(!!j.ok); canEditRef.current = !!j.ok;
        if (j.ok && deepView && EDITONLY_VIEWS.includes(deepView)) { histReplaceNext.current = true; setView(deepView); }
      })
      .catch(() => { /* offline: marad az alapérték */ });
  }, []);
  // MOBIL VISSZA-GOMB: minden nézetváltás history-bejegyzés (a vissza-gomb az appon
  // BELÜL lépked vissza, nem lép ki azonnal); nyitott réteg (modál / részletező)
  // esetén a vissza-gomb AZT zárja be, a nézet marad.
  const viewRef = useRef<ViewId>(view);
  viewRef.current = view;
  const histFromPop = useRef(false);
  const histReplaceNext = useRef(true); // az első (mount-kori) futás csak replace-el
  const urlWithView = (v: ViewId) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('view', v);
    return `${window.location.pathname}?${sp.toString()}`;
  };
  // a Next.js App Router BELSŐ history-állapotát (__PRIVATE_NEXTJS_INTERNALS_TREE) meg KELL
  // őrizni: ha a saját {v} állapotunk felülírja, a vissza-gomb az érintett bejegyzésnél
  // TELJES újratöltést vált ki (2026-07-22 hibajelzés: "mintha újraindulna az oldal")
  const histPush = (v: ViewId) => window.history.pushState({ ...(window.history.state ?? {}), v }, '', urlWithView(v));
  const histReplace = (v: ViewId) => window.history.replaceState({ ...(window.history.state ?? {}), v }, '', urlWithView(v));
  useEffect(() => {
    if (histFromPop.current) { histFromPop.current = false; return; }
    if (histReplaceNext.current) {
      histReplaceNext.current = false;
      // ALAP + ŐRSZEM bejegyzés: közvetlen nézet-mélylinknél (pl. ?view=tasks) is legyen
      // mire visszalépni az appon BELÜL - enélkül az első "vissza" kilépett az oldalról,
      // és újratöltéskor a Mátrixon találta magát a felhasználó (2026-07-22 hibajelzés).
      // Az alap a URL SZERINTI nézetet kapja (nem a mount-pillanat 'map'-jét), különben
      // a második "vissza" a Mátrixra ugrott volna.
      const urlV = new URLSearchParams(window.location.search).get('view');
      const baseV = urlV && (VIEW_ORDER as readonly string[]).includes(urlV) ? (urlV as ViewId) : view;
      histReplace(baseV);
      histPush(baseV);
      return;
    }
    histPush(view);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const overlaysRef = useRef({ catMenu: false, editor: false, taskEdit: false, eventEdit: false, introEdit: false, peopleEdit: false, loadOpen: false, agDetails: false, details: false, postaPanel: false });
  overlaysRef.current = { catMenu: !!catMenu, editor: !!editor, taskEdit: !!taskEdit, eventEdit: !!eventEdit, introEdit, peopleEdit, loadOpen, agDetails: !!agendaDetails, details: !!details, postaPanel };
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const o = overlaysRef.current;
      if (o.catMenu) setCatMenu(null);
      else if (o.editor) setEditor(null);
      else if (o.taskEdit) setTaskEdit(null);
      else if (o.eventEdit) setEventEdit(null);
      else if (o.postaPanel) setPostaPanel(false);
      else if (o.introEdit) setIntroEdit(false);
      else if (o.peopleEdit) setPeopleEdit(false);
      else if (o.loadOpen) setLoadOpen(false);
      else if (o.agDetails) setAgendaDetails(null);
      else if (o.details) setDetails(null);
      else {
        const st = e.state as { v?: string } | null;
        let v = st?.v ?? new URLSearchParams(window.location.search).get('view') ?? 'tasks';
        if (!(VIEW_ORDER as readonly string[]).includes(v)) v = 'tasks';
        if (EDITONLY_VIEWS.includes(v as ViewId) && !canEditRef.current) v = 'tasks';
        if (v !== viewRef.current) {
          histFromPop.current = true;
          setView(v as ViewId);
        } else {
          // az alap-bejegyzés alá értünk (ugyanaz a nézet): maradunk, a bejegyzést visszatoljuk -
          // az app nem lép ki és nem "indul újra" a vissza-gombtól
          histPush(viewRef.current);
        }
        return;
      }
      // réteg-zárás után a bejegyzést visszatoljuk, hogy a nézet ne változzon
      histPush(viewRef.current);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // MOBIL SWIPE: vízszintes sodrás a tartalmon = váltás a szomszédos menüpontra.
  // Kivétel: a Mátrix (ott a húzás pásztázás), a vízszintesen görgethető elemek
  // (táblázat, chipsorok) és a beviteli mezők.
  const touchRef = useRef<{ x: number; y: number; t: number; skip: boolean } | null>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const onViewportTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth > 720) { touchRef.current = null; return; }
    const t = e.touches[0];
    let skip = view === 'map';
    let el = e.target as HTMLElement | null;
    while (el && !skip) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable) skip = true;
      else if (el.scrollWidth > el.clientWidth + 8) {
        const ox = getComputedStyle(el).overflowX;
        if (ox === 'auto' || ox === 'scroll') skip = true;
      }
      if (el.classList.contains('viewport')) break;
      el = el.parentElement;
    }
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), skip };
  };
  const onViewportTouchEnd = (e: React.TouchEvent) => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s || s.skip) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Date.now() - s.t > 600) return; // lassú húzás = görgetés, nem sodrás
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const order = VIEW_ORDER.filter((v) => canEdit || !EDITONLY_VIEWS.includes(v));
    const i = order.indexOf(view);
    if (i === -1) return;
    const next = order[i + (dx < 0 ? 1 : -1)];
    if (next) {
      setView(next);
      // lapozás-szerű visszajelzés: az új nézet a képernyő-szélesség ~60%-áról csúszik be
      const w = Math.round((vpRef.current?.clientWidth ?? 390) * 0.6);
      vpRef.current?.animate(
        [{ transform: `translateX(${dx < 0 ? w : -w}px)`, opacity: 0.3 }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 320, easing: 'cubic-bezier(.22,.9,.3,1)' },
      );
    }
  };
  // ha nem a mátrixon vagyunk, az elrendezés-zárolás azonnal bekapcsol (véletlen mozgatás ellen)
  useEffect(() => {
    if (view !== 'map') setLocked(true);
  }, [view]);
  // program-váltáskor (BA / MA / BA+MA) is zárolunk - ilyenkor a mátrix újraigazít, ne lehessen véletlenül mozgatni
  useEffect(() => {
    setLocked(true);
  }, [prog]);

  const dataRef = useRef(data);
  dataRef.current = data;
  // automentés a mintatanterv-fájlba (helyi API, debounce) - a betöltött állapotot nem írjuk vissza
  const saveTimer = useRef<number | null>(null);
  const skipFileSave = useRef(true);
  // a POST kiemelve: az automentés ÉS a chip „újra" gombja is ezt hívja; saveSeq az
  // átlapolódó válaszok ellen (mindig a legutolsó mentés eredménye számít)
  const saveSeq = useRef(0);
  const postCurriculum = useCallback(async () => {
    const seq = ++saveSeq.current;
    setSaveState({ kind: 'saving' });
    try {
      const r = await fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify(dataRef.current) });
      const j: { ok?: boolean; error?: string } | null = await r.json().catch(() => null);
      if (seq !== saveSeq.current) return;
      if (r.status === 403) setSaveState({ kind: 'denied' });
      else if (!r.ok || !j?.ok) setSaveState({ kind: 'error', msg: j?.error || `HTTP ${r.status}` });
      else setSaveState({ kind: 'saved', at: Date.now() });
    } catch {
      if (seq === saveSeq.current) setSaveState({ kind: 'error', msg: 'hálózati hiba' });
    }
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (loadState !== 'ok') return; // sikertelen betöltés után SEMMIT nem írunk a fájlba
    if (skipFileSave.current) { skipFileSave.current = false; return; }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { saveTimer.current = null; void postCurriculum(); }, 1000);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [data, hydrated, loadState, postCurriculum]);
  // bezárás előtti védőháló: ha épp mentés fut vagy debounce-időzítő él, a böngésző rákérdez
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const pending = saveTimer.current !== null || agendaTimer.current !== null || peopleTimer.current !== null || saveStateRef.current.kind === 'saving';
      if (pending) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
  // feladatok + események: automentés a saját fájlba (ugyanaz a minta, mint a tantervnél)
  const agendaRef = useRef(agenda);
  agendaRef.current = agenda;
  const agendaTimer = useRef<number | null>(null);
  const skipAgendaSave = useRef(true);
  // rev-alapú ütközésvédelem: a szerver-fájl verziószáma + az utolsó szinkronizált
  // állapot (a három-utas fésülés bázisa) + 409-újrapróba számláló
  const agendaRev = useRef(0);
  const agendaBase = useRef<Agenda | null>(null);
  const agendaConflictRetry = useRef(0);
  const agendaTouchedAt = useRef(0); // az utolsó HELYI szerkesztés ideje - a szerver-frissítés tiszteletben tartja
  const commitAgenda = useCallback((next: Agenda) => {
    // a ref-et AZONNAL frissítjük, hogy a mentés utáni közvetlen olvasás (pl. a
    // szerkesztő ✉ „Mentés és levélírás" gombja) már a friss állapotot lássa
    agendaRef.current = next;
    agendaTouchedAt.current = Date.now();
    setAgenda(next);
    try { localStorage.setItem(AGENDA_LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);
  // mentés a szerverre: a látott rev-vel - 409-nél friss olvasás + három-utas
  // fésülés (a helyben módosított tételek nyernek), majd új mentés-kör
  const postAgenda = useCallback(async () => {
    const doc = agendaRef.current;
    try {
      const r = await fetch('/api/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify({ ...doc, rev: agendaRev.current }) });
      if (r.status === 409) {
        if (agendaConflictRetry.current >= 2) { agendaConflictRetry.current = 0; return; }
        agendaConflictRetry.current += 1;
        const fr = await fetch('/api/agenda', { cache: 'no-store', headers: editHeaders() });
        const fj = await fr.json();
        if (!fj?.ok || !fj.data?.tasks) return;
        const remote = normalizeAgenda(fj.data as Partial<Agenda>);
        const merged = mergeAgendaDocs(agendaBase.current, agendaRef.current, remote);
        agendaRev.current = typeof (fj.data as { rev?: number }).rev === 'number' ? (fj.data as { rev: number }).rev : 0;
        agendaBase.current = remote;
        commitAgenda(merged);
        return;
      }
      const j = await r.json().catch(() => null);
      if (j?.ok) {
        agendaConflictRetry.current = 0;
        if (typeof j.rev === 'number') agendaRev.current = j.rev;
        agendaBase.current = doc;
      }
    } catch { /* offline - a következő szerkesztés újrapróbálja */ }
  }, [commitAgenda]);
  useEffect(() => {
    if (!hydrated) return;
    if (!agendaFileOk.current) return; // a fájl nem töltődött be - nem írjuk felül régi/beépített adattal
    if (skipAgendaSave.current) { skipAgendaSave.current = false; return; }
    if (agendaTimer.current) window.clearTimeout(agendaTimer.current);
    agendaTimer.current = window.setTimeout(() => {
      agendaTimer.current = null;
      void postAgenda();
    }, 1000);
    return () => { if (agendaTimer.current) window.clearTimeout(agendaTimer.current); };
  }, [agenda, hydrated, postAgenda]);
  // KÜLSŐ ÍRÁSOK BEHÚZÁSA: az ütemezett Outlook-szinkron (és bármely másik eszköz)
  // közvetlenül frissíti az agenda-fájlt. A nyitva hagyott kliens régi memória-állapota
  // az első kattintáskor FELÜLÍRNÁ ezt (2026-07-16-án meg is történt) - ezért percenként
  // és fókuszba kerüléskor behúzzuk a szerver-állapotot, de CSAK ha nincs függő mentés
  // és az utolsó helyi szerkesztés óta eltelt legalább 15 mp.
  useEffect(() => {
    if (!hydrated) return;
    let stop = false;
    const refresh = async () => {
      if (!agendaFileOk.current || agendaTimer.current) return;
      if (Date.now() - agendaTouchedAt.current < 15000) return;
      try {
        const r = await fetch('/api/agenda', { cache: 'no-store', headers: editHeaders() });
        const j = await r.json();
        if (stop || !j?.ok || !j.data?.tasks) return;
        if (agendaTimer.current || Date.now() - agendaTouchedAt.current < 15000) return; // közben szerkesztett
        const rev = typeof (j.data as { rev?: number }).rev === 'number' ? (j.data as { rev: number }).rev : 0;
        if (rev < agendaRev.current) return; // elkésett válasz - frissebb verziót ismerünk
        const next = normalizeAgenda(j.data as Partial<Agenda>);
        agendaRev.current = rev;
        agendaBase.current = next;
        if (JSON.stringify(next) === JSON.stringify(agendaRef.current)) return;
        skipAgendaSave.current = true;
        agendaRef.current = next;
        setAgenda(next);
        try { localStorage.setItem(AGENDA_LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      } catch { /* offline vagy nem fut a szerver - marad a helyi állapot */ }
    };
    const iv = window.setInterval(refresh, 60000);
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { stop = true; window.clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
  }, [hydrated]);
  // ÉRTESÍTÉS SÜRGŐS KÁRTYÁNÁL: a bot magas prioritásra állítja az aznapi/másnapi
  // cselekvést kérő feladatokat - az app minden agenda-frissülésnél az ÚJ (még nem
  // jelzett) high+nem-done kártyákról böngésző-értesítést mutat, ha a 🔔 be van kapcsolva.
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* http vagy nem támogatott - az asztali Notification így is működik */ });
  }, []);
  const urgentIds = (a: Agenda) => a.tasks.filter((t) => t.priority === 'high' && t.status !== 'done').map((t) => t.id);
  const toggleNotif = useCallback(async () => {
    if (notifOn) { try { localStorage.setItem(NOTIF_LS, '0'); } catch { /* ignore */ } setNotifOn(false); return; }
    if (typeof Notification === 'undefined') return;
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch { return; } }
    if (perm !== 'granted') return;
    // alapvonal: a bekapcsoláskor már látható sürgős kártyákról nem szólunk, csak az ezután érkezőkről
    try { localStorage.setItem(NOTIF_SEEN_LS, JSON.stringify(urgentIds(agendaRef.current))); localStorage.setItem(NOTIF_LS, '1'); } catch { /* ignore */ }
    setNotifOn(true);
  }, [notifOn]);
  useEffect(() => {
    if (!hydrated || !notifOn) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const urgent = agenda.tasks.filter((t) => t.priority === 'high' && t.status !== 'done');
    let seen: string[] | null = null;
    try { const s = localStorage.getItem(NOTIF_SEEN_LS); seen = s ? (JSON.parse(s) as string[]) : null; } catch { seen = null; }
    if (!Array.isArray(seen)) { // nincs alapvonal (pl. másik gépen kapcsolták be) - csendben felvesszük
      try { localStorage.setItem(NOTIF_SEEN_LS, JSON.stringify(urgent.map((t) => t.id))); } catch { /* ignore */ }
      return;
    }
    const fresh = urgent.filter((t) => !seen.includes(t.id));
    if (!fresh.length) return;
    try { localStorage.setItem(NOTIF_SEEN_LS, JSON.stringify([...seen, ...fresh.map((t) => t.id)].slice(-300))); } catch { /* ignore */ }
    fresh.forEach((t) => {
      const body = [t.dueDate ? `Határidő: ${t.dueDate}` : null, t.summary || null].filter(Boolean).join(' · ').slice(0, 160);
      void showNotif(`Sürgős: ${t.title}`, body);
    });
  }, [agenda, hydrated, notifOn]);
  const saveTask = useCallback((t: AgendaTask) => {
    const cur = agendaRef.current;
    // tengely-szinkron: eseményhez kapcsolt, határidő nélküli feladat átveszi az esemény napját
    const ev = t.eventId ? cur.events.find((e) => e.id === t.eventId) : null;
    const t2 = ev && !t.dueDate ? { ...t, dueDate: ev.day ?? ev.sort ?? null } : t;
    const exists = cur.tasks.some((x) => x.id === t2.id);
    commitAgenda({ ...cur, tasks: exists ? cur.tasks.map((x) => (x.id === t2.id ? t2 : x)) : [t2, ...cur.tasks] });
    setTaskEdit(null);
  }, [commitAgenda]);
  const deleteTask = useCallback((id: string) => {
    commitAgenda({ ...agendaRef.current, tasks: agendaRef.current.tasks.filter((x) => x.id !== id) });
    setTaskEdit(null);
  }, [commitAgenda]);
  const toggleDone = useCallback((id: string) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, status: x.status === 'done' ? 'todo' : 'done' } : x)) });
  }, [commitAgenda]);
  // státusz beállítása a részletezőből (✓ Kész / ▶ Folyamatban / ↩ Újranyitás)
  const setTaskStatus = useCallback((id: string, s: TaskStatus) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, status: s } : x)) });
  }, [commitAgenda]);
  const cyclePriority = useCallback((id: string) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, priority: nextPriority(x.priority) } : x)) });
  }, [commitAgenda]);
  // kézi ⭐: 'on' = mindig a Legfontosabbak sávban, 'off' = soha, null = automatikus
  const setTaskStar = useCallback((id: string, star: TaskStar | null) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, star, starAt: star ? new Date().toISOString() : null } : x)) });
  }, [commitAgenda]);
  // alfeladat-pipa a kártyáról: done váltás + az ideas tükör frissítése
  const toggleStep = useCallback((taskId: string, ix: number) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({
      ...cur,
      tasks: cur.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const steps = taskSteps(t).map((s, i) => (i === ix ? { ...s, done: !s.done } : s));
        return { ...t, steps, ideas: steps.map((s) => s.text) };
      }),
    });
  }, [commitAgenda]);
  // A source állapot-mezőinek átírása ('t:id' / 'e:id' kiválasztóval)
  const stampSource = useCallback((sel: string, patch: Partial<AgendaSource>) => {
    const cur = agendaRef.current;
    if (sel.startsWith('t:')) commitAgenda({ ...cur, tasks: cur.tasks.map((t) => (t.id === sel.slice(2) && t.source ? { ...t, source: { ...t.source, ...patch } } : t)) });
    else if (sel.startsWith('e:')) commitAgenda({ ...cur, events: cur.events.map((e) => (e.id === sel.slice(2) && e.source ? { ...e, source: { ...e.source, ...patch } } : e)) });
  }, [commitAgenda]);
  // Megválaszoltnak jelölés (a levélíró sikeres küldése is ezt hívja) - a szál
  // idővonalára kimenő bejegyzés kerül, így a kártyán látszik, hogy mi is léptünk
  const markReplied = useCallback((sel: string) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    const src = sel.startsWith('t:')
      ? cur.tasks.find((t) => t.id === sel.slice(2))?.source
      : cur.events.find((e) => e.id === sel.slice(2))?.source;
    stampSource(sel, {
      status: 'replied', repliedAt: new Date().toISOString(), returned: null,
      ...(src ? { thread: withOutEntry(src, 'válasz elküldve a levélíróból') } : {}),
    });
  }, [stampSource]);
  // Posta-verdikt visszavonási lehetőséggel: a kattintás ELŐTTI teljes felhasználói
  // mező-készletet őrizzük meg - csak a statust visszabillentő undo elveszítené a
  // halasztás/követés/visszatért jelzőket
  const [postaUndo, setPostaUndo] = useState<{ sel: string; label: string; prev: Partial<AgendaSource> } | null>(null);
  const postaUndoTimer = useRef<number | null>(null);
  const setSourceState = useCallback((sel: string, patch: Partial<AgendaSource>, label: string) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    const src = sel.startsWith('t:')
      ? cur.tasks.find((t) => t.id === sel.slice(2))?.source
      : cur.events.find((e) => e.id === sel.slice(2))?.source;
    if (!src) return;
    const prev: Partial<AgendaSource> = {
      status: src.status, repliedAt: src.repliedAt ?? null, snoozeUntil: src.snoozeUntil ?? null,
      followUpAt: src.followUpAt ?? null, returned: src.returned ?? null,
    };
    stampSource(sel, patch);
    setPostaUndo({ sel, label, prev });
    if (postaUndoTimer.current) window.clearTimeout(postaUndoTimer.current);
    postaUndoTimer.current = window.setTimeout(() => setPostaUndo(null), 6000);
  }, [stampSource]);
  const undoSourceState = useCallback(() => {
    setPostaUndo((u) => {
      if (u) stampSource(u.sel, u.prev);
      return null;
    });
  }, [stampSource]);
  // a Posta menü számlálója: hány bejövő levél vár még válaszra
  const postaCount = useMemo(() =>
    agenda.tasks.filter((t) => isAwaiting(t.source)).length
    + agenda.events.filter((e) => isAwaiting(e.source)).length,
  [agenda]);
  // feladat ↔ esemény kapcsolás a részletezőből (javaslat-gomb / választó)
  const linkTaskEvent = useCallback((taskId: string, eventId: string | null) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    // tengely-szinkron: kapcsoláskor a határidő nélküli feladat átveszi az esemény napját/hónapját
    const ev = eventId ? cur.events.find((e) => e.id === eventId) : null;
    commitAgenda({ ...cur, tasks: cur.tasks.map((t) => (t.id === taskId ? { ...t, eventId, dueDate: t.dueDate ?? (ev ? ev.day ?? ev.sort ?? null : null) } : t)) });
  }, [commitAgenda]);
  // tengely-szinkron: a részletezőből egy kattintással átvehető az esemény napja határidőnek
  const setTaskDue = useCallback((taskId: string, d: string) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((t) => (t.id === taskId ? { ...t, dueDate: d, due: null } : t)) });
  }, [commitAgenda]);
  // feladatból indított új esemény: az esemény mentésekor a kezdeményező feladat rákapcsolódik
  const pendingTaskLink = useRef<{ taskId: string; eventId: string } | null>(null);
  const saveEvent = useCallback((e: AgendaEvent) => {
    const cur = agendaRef.current;
    const prev = cur.events.find((x) => x.id === e.id);
    const exists = !!prev;
    // tengely-szinkron: ha az esemény NAPJA változik, a hozzá igazított feladat-határidők
    // (amik eddig pont az esemény napján álltak) automatikusan követik az új napot
    const oldKey = prev?.day ?? prev?.sort ?? null;
    const newKey = e.day ?? e.sort ?? null;
    let tasks = oldKey && newKey && oldKey !== newKey
      ? cur.tasks.map((t) => (t.eventId === e.id && t.dueDate === oldKey ? { ...t, dueDate: newKey } : t))
      : cur.tasks;
    const pend = pendingTaskLink.current;
    if (pend && pend.eventId === e.id) {
      tasks = tasks.map((t) => (t.id === pend.taskId ? { ...t, eventId: e.id, dueDate: t.dueDate ?? e.day ?? e.sort ?? null } : t));
      pendingTaskLink.current = null;
    }
    commitAgenda({ ...cur, tasks, events: exists ? cur.events.map((x) => (x.id === e.id ? e : x)) : [...cur.events, e] });
    setEventEdit(null);
    // GOOGLE PUSH - a szabály: amit az app jegyez, azt KI is toljuk a draronbalogh@gmail.com
    // naptárba. Kivétel az Outlook-tükör (extSource): az Outlook CSAK forrás, sosem push-oljuk.
    // Token nélkül a /api/meet unconfigured-et ad, így minden ág ártalmatlanul elhal.
    if (!e.extSource && e.day) {
      const m = e.when.match(/(\d{1,2})[:.](\d{2})/);
      const hh = m ? String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0') : '09';
      const mi = m ? m[2] : '00';
      const he = String(Math.min(23, Number(hh) + 1)).padStart(2, '0');
      // hosszú időszaknál (>21 nap) a Google-ban csak a KEZDŐ jelölő él ezen az id-n
      const isLongSpan = !!(e.dayEnd && (Date.parse(e.dayEnd) - Date.parse(e.day)) > 21 * 86400000);
      const startIso = `${e.day}T${hh}:${mi}:00`;
      const endIso = isLongSpan ? `${e.day}T${he}:${mi}:00` : `${e.dayEnd || e.day}T${he}:${mi}:00`; // többnapos eseménynél a záró napig
      const gSummary = isLongSpan ? `${e.title} - kezdete` : e.title;
      if (e.googleEventId) {
        // meglévő Google-pár: cím/nap/idő/helyszín/leírás/státusz változásra patch (a Meet-link marad)
        if (prev?.day !== e.day || prev?.dayEnd !== e.dayEnd || prev?.when !== e.when || prev?.title !== e.title || prev?.place !== e.place || prev?.note !== e.note || prev?.mstatus !== e.mstatus) {
          void fetch('/api/meet', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
            body: JSON.stringify({ action: 'update', googleEventId: e.googleEventId, startIso, endIso, summary: gSummary, location: e.place ?? '', description: '', tentative: e.mstatus === 'tentative' }),
          }).catch(() => { /* a Google-szinkron nem kritikus */ });
          if (isLongSpan && e.googleEndEventId) {
            void fetch('/api/meet', {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
              body: JSON.stringify({ action: 'update', googleEventId: e.googleEndEventId, startIso: `${e.dayEnd}T${hh}:${mi}:00`, endIso: `${e.dayEnd}T${he}:${mi}:00`, summary: `${e.title} - vége`, location: e.place ?? '', description: '', tentative: e.mstatus === 'tentative' }),
            }).catch(() => { /* nem kritikus */ });
          }
        }
      } else {
        // még nincs Google-párja: létrehozzuk (Meet-linkkel), és az id/link visszakerül az eseményre
        void (async () => {
          try {
            const res = await fetch('/api/meet', {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
              body: JSON.stringify({ action: 'create', summary: gSummary, startIso, endIso, location: e.place || undefined, description: undefined, attendees: [], sendInvite: false, tentative: e.mstatus === 'tentative' }),
            });
            const j = await res.json() as { ok: boolean; unconfigured?: boolean; meetLink?: string; googleEventId?: string };
            if (j.ok && j.googleEventId) {
              const cur2 = agendaRef.current;
              commitAgenda({ ...cur2, events: cur2.events.map((x) => (x.id === e.id && !x.googleEventId ? { ...x, googleEventId: j.googleEventId ?? null, meetLink: x.meetLink ?? (j.meetLink || null) } : x)) });
            }
          } catch { /* a Google-szinkron nem kritikus */ }
        })();
      }
    }
  }, [commitAgenda]);
  const deleteEvent = useCallback((id: string) => {
    const cur = agendaRef.current;
    const victim = cur.events.find((x) => x.id === id);
    // a törölt eseményre mutató feladat-hivatkozásokat is leválasztjuk;
    // Outlook-tükörnél tombstone, hogy a következő szinkron ne hozza vissza
    commitAgenda({
      ...cur,
      events: cur.events.filter((x) => x.id !== id),
      tasks: cur.tasks.map((t) => (t.eventId === id ? { ...t, eventId: null } : t)),
      hiddenExtIds: victim?.extSource === 'outlook' && victim.extId
        ? [...(cur.hiddenExtIds ?? []), victim.extId]
        : cur.hiddenExtIds,
    });
    setEventEdit(null);
    // a törlés a Google-párra is propagálódik (a tömeges Gmail-publikálás miatt már
    // az Outlook-tükörnek is lehet Google-párja - azt is töröljük)
    [victim?.googleEventId, victim?.googleEndEventId].filter(Boolean).forEach((gid) => {
      void fetch('/api/meet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ action: 'delete', googleEventId: gid }),
      }).catch(() => { /* a Google-szinkron nem kritikus */ });
    });
  }, [commitAgenda]);
  // ON-DEMAND Google Meet egy meglévő eseményhez: /api/meet létrehoz + a linket az eseményre írja.
  // A kezdő óra a when szövegből (ó:pp), különben 9:00; hossz 1 óra. Token nélkül unconfigured.
  const [meetMsg, setMeetMsg] = useState<string | null>(null);
  const createMeetForEvent = useCallback(async (eventId: string) => {
    const e = agendaRef.current.events.find((x) => x.id === eventId);
    if (!e) return;
    if (e.extSource === 'outlook') { setMeetMsg('Ez az Outlook-naptár tükre - Meet-et saját (nem tükör) eseményhez készíts.'); return; }
    if (!e.day) { setMeetMsg('Előbb adj meg egy napot az eseménynek.'); return; }
    // ha már van Google-párja, az újat nem duplikáljuk mellé: a régit előbb töröljük
    if (e.googleEventId) {
      void fetch('/api/meet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ action: 'delete', googleEventId: e.googleEventId }),
      }).catch(() => { /* nem kritikus */ });
    }
    const emails = [e.owner, ...e.people].filter((n): n is string => !!n).map((n) => emailOf(peopleRef.current, n)).filter((x): x is string => !!x);
    const m = e.when.match(/(\d{1,2})[:.](\d{2})/);
    const hh = m ? String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0') : '09';
    const mi = m ? m[2] : '00';
    const he = String(Math.min(23, Number(hh) + 1)).padStart(2, '0');
    setMeetMsg('Meet-link készítése…');
    try {
      const res = await fetch('/api/meet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        // résztvevőt NEM adunk a Google-eseményhez (kéretlen értesítést kaphatnának) -
        // a meghívást a levél viszi, a link ott van; a Google csak a saját naptárad
        body: JSON.stringify({ action: 'create', summary: e.title, startIso: `${e.day}T${hh}:${mi}:00`, endIso: `${e.day}T${he}:${mi}:00`, location: e.place || undefined, attendees: [], tentative: e.mstatus === 'tentative' }),
      });
      const j = await res.json() as { ok: boolean; unconfigured?: boolean; meetLink?: string; googleEventId?: string; error?: string };
      if (j.unconfigured) { setMeetMsg('A Google Meet még nincs beállítva (OAuth). A kézi „Meet szervezése" addig is működik.'); return; }
      if (!j.ok) { setMeetMsg(`Meet hiba: ${j.error ?? 'ismeretlen'}`); return; }
      saveEvent({ ...e, googleEventId: j.googleEventId ?? e.googleEventId ?? null, meetLink: j.meetLink ?? e.meetLink ?? null });
      setMeetMsg(j.meetLink ? '✓ Meet-link kész.' : 'Kész (link nélkül).');
    } catch { setMeetMsg('A Meet-szolgáltatás nem elérhető.'); }
  }, [saveEvent]);
  // Időpont-egyeztetés lezárása: a tentative esemény véglegessé válik (a dátum-módosítást
  // az esemény-szerkesztőben teszed; ez csak az 'egyeztetés alatt' jelzőt zárja le).
  const confirmMeet = useCallback((eventId: string) => {
    const e = agendaRef.current.events.find((x) => x.id === eventId);
    if (e) saveEvent({ ...e, mstatus: 'confirmed' });
  }, [saveEvent]);
  // Egy esemény levél-címzettjei: elsődlegesen az eseményhez már kiment levél címzett-köre
  // (garantáltan ugyanaz a kör, akit meghívtál), tartalékként a résztvevő-nevek a
  // Névjegyzékből feloldva (Áron kiszűrve) + a kiváltó levél feladója és cc-je.
  const eventLetterRecipients = useCallback((e: AgendaEvent): LetterRecipient[] => {
    const prevLetter = [...(agendaRef.current.letters || [])].reverse()
      .find((l) => l.targetId === e.id && l.dir === 'out' && (l.recipients?.length ?? 0) > 0);
    if (prevLetter?.recipients?.length) return prevLetter.recipients;
    const out: LetterRecipient[] = [];
    [e.owner, ...e.people].filter((n): n is string => !!n && n !== DEFAULT_OWNER).forEach((n) => {
      const em = emailOf(peopleRef.current, n);
      if (em && !out.some((r) => r.email === em)) out.push({ name: n, email: em, kind: kindOfRef.current[n] ?? 'nev' });
    });
    if (e.source?.email && !out.some((r) => r.email === e.source?.email)) {
      out.push({ name: e.source.name, email: e.source.email, kind: 'egyedi' });
    }
    (e.source?.cc ?? []).forEach((cc) => { if (!out.some((r) => r.email === cc)) out.push({ name: cc, email: cc, kind: 'egyedi' }); });
    return out;
  }, []);
  // az esemény időpontja levél-slotként: a when szövegből olvassuk az óra:perc(-óra:perc) részt
  const slotOfEvent = (e: AgendaEvent): MeetSlot => {
    const m = e.when.match(/(\d{1,2})[:.](\d{2})(?:\s*-\s*(\d{1,2})[:.](\d{2}))?/);
    return {
      day: e.day ?? '',
      start: m ? `${m[1].padStart(2, '0')}:${m[2]}` : '',
      end: m?.[3] ? `${m[3].padStart(2, '0')}:${m[4]}` : '',
    };
  };
  const modeOfEvent = (e: AgendaEvent): MeetingMode => {
    const p = (e.place ?? '').trim().toLowerCase();
    if (p.includes('online') && !p.startsWith('online')) return 'hibrid';
    if (p.startsWith('online') || (!p && e.meetLink)) return 'online';
    return e.meetLink ? 'hibrid' : 'szemelyes';
  };
  // több javaslatból egy KIVÁLASZTOTT slot véglegesítése: az esemény arra áll át, a többi
  // javaslat eltűnik; a Google-pár a saveEvent patch-útján frissül, MAJD a résztvevők is
  // felkerülnek a Google-eseményre .ics meghívóval (user-döntés 2026-07-22: fixnél mindig
  // Google-meghívó is) - végül nem-blokkoló felajánlás: visszaigazoló levél a Postába.
  const confirmMeetSlot = useCallback((eventId: string, slot: AgendaMeetSlot) => {
    if (!canEditRef.current) return;
    const e = agendaRef.current.events.find((x) => x.id === eventId);
    if (!e) return;
    saveEvent({
      ...e, day: slot.day, dayEnd: null, sort: slot.day.slice(0, 7),
      when: fmtEventWhen(slot.day, null, slot.day.slice(0, 7), slot.start || null),
      mstatus: 'confirmed', meetSlots: null,
    });
    const recips = eventLetterRecipients(e);
    if (e.googleEventId && recips.length) {
      // a meghívó-patch a VÉGLEGES időkkel megy (ne fusson versenyt a saveEvent patch-ével)
      const sh = (slot.start || '09:00').padStart(5, '0');
      const eh = slot.end && slot.end !== slot.start ? slot.end.padStart(5, '0') : `${String(Math.min(23, parseInt(sh, 10) + 1)).padStart(2, '0')}${sh.slice(2)}`;
      void fetch('/api/meet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          action: 'update', googleEventId: e.googleEventId,
          startIso: `${slot.day}T${sh}:00`, endIso: `${slot.day}T${eh}:00`, tentative: false,
          attendees: recips.map((r) => r.email), sendInvite: true,
        }),
      }).catch(() => { /* a Google-szinkron nem kritikus */ });
    }
    setConfirmOffer({ eventId, title: e.title, state: 'offer' });
  }, [saveEvent, eventLetterRecipients]);
  // a véglegesítés utáni felajánlás-sáv állapota (visszaigazoló levél a Postába)
  const [confirmOffer, setConfirmOffer] = useState<{ eventId: string; title: string; state: 'offer' | 'busy' | 'done' | 'err'; msg?: string } | null>(null);
  // 📝 Kimenet + lezárás: a diktált meeting-eredmény 1-2 mondatos összefoglalóként a kártya
  // összefoglalójára kerül (hibánál a NYERS szöveg - a diktátum sosem vész el), opcionális lezárással.
  const recordOutcome = useCallback(async (taskId: string, text: string, close: boolean) => {
    if (!canEditRef.current || !text.trim()) return;
    setTitkarBusy('📝 Kimenet rögzítése a kártyára…');
    let summary = text.trim();
    try {
      const t = agendaRef.current.tasks.find((x) => x.id === taskId);
      const res = await fetch('/api/summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ text: summary, title: t?.title ?? null }),
      });
      const j = await res.json() as { ok: boolean; summary?: string };
      if (j.ok && j.summary) summary = j.summary;
    } catch { /* a nyers szöveg marad */ }
    const now = new Date();
    const stamp = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}.`;
    const cur = agendaRef.current;
    commitAgenda({
      ...cur,
      tasks: cur.tasks.map((x) => (x.id === taskId
        ? { ...x, summary: `${x.summary ? `${x.summary.trimEnd()}\n` : ''}Kimenet (${stamp}): ${summary}`, status: close ? 'done' : x.status }
        : x)),
    });
    setTitkarBusy(null);
  }, [commitAgenda]);
  const saveIntro = useCallback((s: string) => {
    commitAgenda({ ...agendaRef.current, intro: s });
    setIntroEdit(false);
  }, [commitAgenda]);
  // személyi törzs mentése - ugyanaz a minta (fájl + localStorage), 1s debounce
  const peopleRef = useRef(peopleDB);
  peopleRef.current = peopleDB;
  const peopleTimer = useRef<number | null>(null);
  const skipPeopleSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (!peopleFileOk.current) return; // a fájl nem töltődött be - nem írjuk felül régi/beépített adattal
    if (skipPeopleSave.current) { skipPeopleSave.current = false; return; }
    if (peopleTimer.current) window.clearTimeout(peopleTimer.current);
    peopleTimer.current = window.setTimeout(() => {
      peopleTimer.current = null;
      fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify(peopleRef.current) }).catch(() => { /* ignore */ });
    }, 1000);
    return () => { if (peopleTimer.current) window.clearTimeout(peopleTimer.current); };
  }, [peopleDB, hydrated]);
  const savePeople = useCallback((db: PeopleDB) => {
    peopleRef.current = db; // azonnali ref-frissítés a mentés utáni közvetlen olvasásokhoz
    setPeopleDB(db);
    try { localStorage.setItem(PEOPLE_LS_KEY, JSON.stringify(db)); } catch { /* ignore */ }
    setPeopleEdit(false);
  }, []);
  // feladó-szabály a Postából (Screener-minta): egy feladóról EGYSZER döntünk,
  // a szabályt a bot is olvassa (fyi/ignore feladó nem terheli többé a Postát)
  const setSenderRule = useCallback((email: string, rule: SenderRule) => {
    if (!canEditRef.current) return;
    const key = email.trim().toLowerCase();
    if (!key) return;
    const db = { ...peopleRef.current, senderRules: { ...peopleRef.current.senderRules, [key]: rule } };
    peopleRef.current = db;
    setPeopleDB(db);
    try { localStorage.setItem(PEOPLE_LS_KEY, JSON.stringify(db)); } catch { /* ignore */ }
  }, []);
  // Új feladat egy eseményből: MINDENT örököl - ne kelljen kétszer beírni ugyanazt
  const addTaskForEvent = useCallback((eid: string) => {
    if (!canEditRef.current) return;
    const e = agendaRef.current.events.find((x) => x.id === eid);
    setTaskEdit({
      t: {
        ...emptyTask(),
        eventId: eid,
        owner: e?.owner ?? emptyTask().owner,
        people: e ? [...e.people] : [],
        dueDate: e?.day ?? e?.sort ?? null, // az esemény napja, vagy legalább a hónapja
        title: e ? `${e.title} - előkészítés` : '',
      },
      isNew: true,
    });
  }, []);
  // Új esemény egy feladatból (az addTaskForEvent tükörképe): örökli a feladat adatait,
  // és az esemény MENTÉSEKOR a feladat eventId-je automatikusan rááll (pendingTaskLink).
  const addEventForTask = useCallback((taskId: string) => {
    if (!canEditRef.current) return;
    const t = agendaRef.current.tasks.find((x) => x.id === taskId);
    if (!t) return;
    const day = t.dueDate && t.dueDate.length >= 10 ? t.dueDate.slice(0, 10) : null;
    const e: AgendaEvent = {
      ...emptyEvent(),
      title: t.title,
      owner: t.owner ?? DEFAULT_OWNER,
      people: [...t.people],
      day,
      sort: t.dueDate ? t.dueDate.slice(0, 7) : null,
      when: fmtEventWhen(day, null, t.dueDate ? t.dueDate.slice(0, 7) : null, null),
    };
    pendingTaskLink.current = { taskId, eventId: e.id };
    setEventEdit({ e, isNew: true });
  }, []);
  // MINDEN levélírás a Postázóban (2026-07-22, telefonon IS): a hub beágyazott szerkesztője
  // nyílik (➕ Új levél fül, más nézetből fly-in panellel); a régi külön modál megszűnt,
  // mobilon a szerkesztő a fül tetején van, alatta a sablontár.
  const [inlineTarget, setInlineTarget] = useState<NotifyTarget>({ targetType: null, targetId: null, task: null, event: null, names: [], steps: [], source: null });
  const [inlineKey, setInlineKey] = useState(0); // új cél = friss beágyazott szerkesztő (remount)
  const openComposerFor = useCallback((target: NotifyTarget) => {
    setInlineTarget(target);
    setInlineKey((n) => n + 1);
    setPostaTab('ir');
    if (viewRef.current !== 'posta') setPostaPanel(true);
  }, []);
  // Levél-készítő megnyitása egy feladatból / eseményből - a sablon-szöveget a szerkesztő
  // generálja; topicId-vel egy ajánlott témasablon rögtön be is töltődik
  const notifyTask = useCallback((id: string, topicId?: string) => {
    if (!canEditRef.current) return;
    const t = agendaRef.current.tasks.find((x) => x.id === id);
    if (!t) return;
    // Áron (DEFAULT_OWNER) SOSEM címzett a saját levelében - ha a kártya felelőse ő,
    // az előtöltésből kimarad (különben "Kedves Áron!" levelet írt magának, 2026-07-23)
    openComposerFor({ targetType: 'task', targetId: t.id, task: t, event: null, names: [t.owner, ...t.people].filter((n): n is string => !!n && n !== DEFAULT_OWNER), steps: taskSteps(t).map((s) => s.text).filter(Boolean), source: t.source ?? null, topicId: topicId ?? null });
  }, [openComposerFor]);
  const notifyEvent = useCallback((id: string, topicId?: string) => {
    if (!canEditRef.current) return;
    const e = agendaRef.current.events.find((x) => x.id === id);
    if (!e) return;
    // az eseményhez kötött feladatok lépései is választhatók a levélbe
    const steps = agendaRef.current.tasks.filter((t) => t.eventId === e.id).flatMap((t) => taskSteps(t).map((s) => s.text)).filter(Boolean);
    openComposerFor({ targetType: 'event', targetId: e.id, event: e, task: null, names: [e.owner, ...e.people].filter((n): n is string => !!n && n !== DEFAULT_OWNER), steps, source: e.source ?? null, topicId: topicId ?? null });
  }, [openComposerFor]);
  // ugrás a Posta listájára EGY kártya levelére fókuszálva (jelvény-katt, okos routing) -
  // a fület IS állítja (különben a fókusz a rejtett lista-fülben veszett el, 2026-07-22 bug)
  const jumpToPosta = useCallback((sel: string) => {
    if (!canEditRef.current) return;
    setPostaTab('lista');
    setPostaFocus(sel);
    if (viewRef.current !== 'posta') setPostaPanel(true);
  }, []);
  // 📮 POSTA egy kártyáról (2026-07-22): EGY gomb, okos útvonal - ha a kártyának válaszra
  // váró bejövője / kész válasza van, a Posta listája nyílik RÁ fókuszálva; különben az
  // Új levél szerkesztő, a kártya címzettjeivel előtöltve. Más nézetből fly-in panelként.
  const openPostaForCard = useCallback((kind: 'task' | 'event', id: string) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    const item = kind === 'task' ? cur.tasks.find((x) => x.id === id) : cur.events.find((x) => x.id === id);
    const src = item?.source;
    if (src && (isAwaiting(src) || src.status === 'drafted' || src.shadow)) {
      // iker-kártyánál (feladat+esemény ugyanabból a levélből) a Posta-sor a FELADATON él -
      // az esemény árnyék-forrása esetén a feladat sorára fókuszálunk
      let sel = `${kind === 'task' ? 't' : 'e'}:${id}`;
      if (kind === 'event' && src.shadow) {
        const twin = cur.tasks.find((t) => t.eventId === id && t.source?.email === src.email);
        if (twin) sel = `t:${twin.id}`;
      }
      setPostaTab('lista');
      setPostaFocus(sel);
      if (viewRef.current !== 'posta') setPostaPanel(true);
    } else if (kind === 'task') notifyTask(id);
    else notifyEvent(id);
  }, [notifyTask, notifyEvent]);
  // a Levelek nézet BEÁGYAZOTT szerkesztője: széles kijelzőn ide töltődnek a
  // sablonok / mentett levelek; mobilon (nincs hely a 3. oszlopnak) modál nyílik
  const [topicReq, setTopicReq] = useState<{ t: TopicTemplate; n: number } | null>(null);
  const [letterReq, setLetterReq] = useState<{ l: Letter; n: number } | null>(null);
  // a beágyazott szerkesztő csak kliens-oldalon jelenik meg: a localStorage-ból
  // töltött beállításai (sablonfajta, aláírás) SSR-ben nem elérhetők (hydration)
  const [booted, setBooted] = useState(false);
  useEffect(() => { setBooted(true); }, []);
  const [titkarOpen, setTitkarOpen] = useState(false); // 🗣 Titkárnő wizard (diktálás) a hubból
  // sablon-kattintás: a hub ÉLŐ szerkesztőjébe töltődik (a megkezdett cél/címzettek maradnak)
  const useTopicInComposer = useCallback((t: TopicTemplate) => {
    setTopicReq({ t, n: Date.now() });
    setPostaTab('ir');
  }, []);
  // mentett levél megnyitása: ha megvan a kártyája, annak kontextusában
  // (lépések, feladó, mentett levelek listája), különben önállóan
  const openSavedLetter = useCallback((l: Letter) => {
    const cur = agendaRef.current;
    const preload = { subject: l.subject, body: l.body, names: l.names, letterId: l.id };
    const t = l.targetType === 'task' ? cur.tasks.find((x) => x.id === l.targetId) : null;
    const e = l.targetType === 'event' ? cur.events.find((x) => x.id === l.targetId) : null;
    if (t) openComposerFor({ targetType: 'task', targetId: t.id, task: t, event: null, names: [], steps: taskSteps(t).map((s) => s.text).filter(Boolean), source: t.source ?? null, preload });
    else if (e) {
      const steps = cur.tasks.filter((x) => x.eventId === e.id).flatMap((x) => taskSteps(x).map((s) => s.text)).filter(Boolean);
      openComposerFor({ targetType: 'event', targetId: e.id, event: e, task: null, names: [], steps, source: e.source ?? null, preload });
    } else openComposerFor({ targetType: null, targetId: null, task: null, event: null, names: [], steps: [], source: null, preload });
  }, [openComposerFor]);
  // sablon→naptár kapcsolat rögzítése UID szerint (a fájlba is lementve)
  const linkTopic = useCallback((topicId: string, sel: string | null) => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    const links = { ...(cur.topicLinks || {}) };
    if (sel) links[topicId] = sel; else delete links[topicId];
    commitAgenda({ ...cur, topicLinks: links });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // a mentett levél kártyájának címe a Levelek nézet listájához
  const letterTargetTitle = useCallback((l: Letter): string | null => {
    const cur = agendaRef.current;
    if (l.targetType === 'task') return cur.tasks.find((x) => x.id === l.targetId)?.title ?? null;
    if (l.targetType === 'event') return cur.events.find((x) => x.id === l.targetId)?.title ?? null;
    return null;
  }, []);
  const openLetterInComposer = useCallback((l: Letter) => {
    setLetterReq({ l, n: Date.now() });
    setPostaTab('ir');
    if (viewRef.current !== 'posta') setPostaPanel(true);
  }, []);
  // mentett levelek kezelése (a levelek az agenda részei, az automentés viszi fájlba)
  const saveLetter = useCallback((l: Letter) => {
    const cur = agendaRef.current;
    // id-alapú upsert: ha már van ilyen id (pl. a Postában szerkesztett kész válasz),
    // helyben cseréljük - így nem keletkezik duplikátum; egyébként az elejére szúrjuk
    const list = cur.letters || [];
    const letters = list.some((x) => x.id === l.id)
      ? list.map((x) => (x.id === l.id ? l : x))
      : [l, ...list];
    commitAgenda({ ...cur, letters });
  }, [commitAgenda]);
  const deleteLetter = useCallback((id: string) => {
    const cur = agendaRef.current;
    commitAgenda({ ...cur, letters: (cur.letters || []).filter((x) => x.id !== id) });
  }, [commitAgenda]);
  const setLetterStatus = useCallback((id: string, status: 'draft' | 'sent') => {
    if (!canEditRef.current) return;
    const cur = agendaRef.current;
    commitAgenda({ ...cur, letters: (cur.letters || []).map((l) => (l.id === id ? { ...l, status } : l)) });
  }, [commitAgenda]);
  // ✔ véglegesítés utáni felajánlás: visszaigazoló levél a Postába ("rögzítettem, itt a link")
  const sendConfirmLetter = useCallback(async () => {
    const off = confirmOffer;
    if (!off) return;
    const e = agendaRef.current.events.find((x) => x.id === off.eventId);
    if (!e || !e.day) { setConfirmOffer(null); return; }
    const recips = eventLetterRecipients(e);
    if (!recips.length) { setConfirmOffer({ ...off, state: 'err', msg: 'Nincs email-címmel feloldható címzett ehhez az eseményhez.' }); return; }
    setConfirmOffer({ ...off, state: 'busy' });
    try {
      const letter = await composeMeetingLetter({
        kind: 'confirm', topic: e.title, description: null,
        mode: modeOfEvent(e), slots: [slotOfEvent(e)], fixed: true,
        place: e.place, meetLink: e.meetLink, recipients: recips, targetId: e.id,
      });
      saveLetter(letter);
      setConfirmOffer({ ...off, state: 'done' });
      window.setTimeout(() => setConfirmOffer((o) => (o && o.eventId === off.eventId && o.state === 'done' ? null : o)), 7000);
    } catch (err) {
      setConfirmOffer({ ...off, state: 'err', msg: `A levél nem készült el: ${err instanceof Error ? err.message : String(err)}` });
    }
  }, [confirmOffer, eventLetterRecipients, saveLetter]);
  // ✉ Meghívó-levél egy MEGLÉVŐ eseményről (drawer-gomb): cím + idő + hely + Meet-link a
  // résztvevőknek, a Titkárnő fogalmazza, a Posta Kimenőbe kerül. Tentative eseménynél a
  // javaslat-hangnem megy (a slotokkal), véglegesnél meghívó-hangnem.
  const inviteLetterForEvent = useCallback(async (eventId: string) => {
    if (!canEditRef.current) return;
    const e = agendaRef.current.events.find((x) => x.id === eventId);
    if (!e) return;
    if (!e.day) { setMeetMsg('Előbb adj napot az eseménynek (✎ Szerkesztés) - a meghívóhoz időpont kell.'); return; }
    const recips = eventLetterRecipients(e);
    const missing = [e.owner, ...e.people].filter((n): n is string => !!n && n !== DEFAULT_OWNER && !emailOf(peopleRef.current, n));
    if (!recips.length) { setMeetMsg(`Nincs email-címmel feloldható résztvevő${missing.length ? ` (${missing.join(', ')})` : ''} - a ✉ Új levél gombbal kézzel adhatsz címzettet.`); return; }
    setMeetMsg('✉ Meghívó-levél készül…');
    setTitkarBusy('🗣 Titkárnő fogalmazza a meghívó-levelet…');
    try {
      const tentative = e.mstatus === 'tentative';
      const slots: MeetSlot[] = tentative && e.meetSlots?.length
        ? e.meetSlots.map((s) => ({ day: s.day, start: s.start ?? '', end: s.end ?? '' }))
        : [slotOfEvent(e)];
      const letter = await composeMeetingLetter({
        kind: 'invite', topic: e.title, description: null,
        mode: modeOfEvent(e), slots, fixed: !tentative,
        place: e.place, meetLink: e.meetLink, recipients: recips, targetId: e.id,
      });
      saveLetter(letter);
      setMeetMsg(`✉ Meghívó-levél a Posta Kimenőben (${recips.length} címzett${missing.length ? `; email nélkül kimaradt: ${missing.join(', ')}` : ''}).`);
    } finally { setTitkarBusy(null); }
  }, [eventLetterRecipients, saveLetter]);
  // ✉ jelzés a kártyákon: tételenkénti levélszám + hány vázlat vár még kiküldésre
  const letterStats = useMemo(() => {
    const m: Record<string, { n: number; drafts: number }> = {};
    (agenda.letters || []).forEach((l) => {
      if (!l.targetId) return;
      const e = (m[l.targetId] ??= { n: 0, drafts: 0 });
      e.n += 1;
      if ((l.status ?? 'draft') === 'draft') e.drafts += 1;
    });
    return m;
  }, [agenda.letters]);

  const histRef = useRef<Curriculum[]>([]);
  const futRef = useRef<Curriculum[]>([]);
  const persistLS = (d: Curriculum) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch { /* ignore */ } };
  const commit = useCallback((next: Curriculum) => {
    histRef.current = [...histRef.current, dataRef.current].slice(-100);
    futRef.current = [];
    dataRef.current = next; // azonnali ref-frissítés a mentés utáni közvetlen olvasásokhoz
    setData(next); setEdited(true); persistLS(next);
  }, []);
  const undo = useCallback(() => {
    if (!histRef.current.length) return;
    const prev = histRef.current[histRef.current.length - 1];
    histRef.current = histRef.current.slice(0, -1);
    futRef.current = [dataRef.current, ...futRef.current].slice(0, 100);
    setData(prev); setEdited(true); persistLS(prev);
  }, []);
  const redo = useCallback(() => {
    if (!futRef.current.length) return;
    const nxt = futRef.current[0];
    futRef.current = futRef.current.slice(1);
    histRef.current = [...histRef.current, dataRef.current].slice(-100);
    setData(nxt); setEdited(true); persistLS(nxt);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const updateCohort = (ci: number, fn: (c: Cohort) => Cohort) =>
    commit({ ...dataRef.current, cohorts: dataRef.current.cohorts.map((c, i) => (i === ci ? fn(c) : c)) });
  const saveCourse = (ref: Ref2, course: Course) =>
    updateCohort(ref.ci, (c) => ({ ...c, courses: ref.xi < 0 ? [...c.courses, course] : c.courses.map((x, i) => (i === ref.xi ? course : x)) }));
  const deleteCourse = (ci: number, xi: number) =>
    updateCohort(ci, (c) => ({ ...c, courses: c.courses.filter((_, i) => i !== xi) }));
  const resetData = () => {
    if (!confirm('Visszaállítod az eredeti adatot? A helyi módosításaid (kapcsolatok, mozgatás) elvesznek. (Ctrl+Z visszavonja.)')) return;
    histRef.current = [...histRef.current, dataRef.current].slice(-100);
    futRef.current = [];
    setData(DEFAULT_DATA); setEdited(false);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  };
  // KÖZÖS MENTÉS: minden adat (tanterv + feladatok/események + névjegyzék) azonnali fájlba
  // írása a helyi API-kon át, plusz EGY közös biztonsági másolat letöltése. A mentés sosem
  // veszélyes (a jelenlegi állapotot írja); a visszatöltés kér megerősítést.
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const backupPayload = () => ({
    kind: 'metumatrix-backup',
    savedAt: new Date().toISOString(),
    curriculum: dataRef.current,
    agenda: agendaRef.current,   // feladatok + események + levelek + sablon-kapcsolatok
    people: peopleRef.current,   // mind a hat névlista + címkék + aláírás
  });
  // ⤓ Mentés: MINDEN adat a szerverre + időbélyeges teljes pillanatkép egyetlen fix
  // mappába (grid/backups) - letöltési párbeszéd nélkül, a pontos hely kiírásával
  const exportJSON = async () => {
    setSaveMsg('Mentés folyamatban…');
    const post = (url: string, body: unknown) =>
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify(body) }).then((r) => r.json());
    try {
      const [c, a, pe, snap] = await Promise.all([
        post('/api/curriculum', dataRef.current),
        post('/api/agenda', agendaRef.current),
        post('/api/people', peopleRef.current),
        post('/api/snapshots', backupPayload()),
      ]);
      // sikeres explicit mentés után a fájl a mostani állapotot tükrözi - az automentés
      // (ha betöltési hiba miatt tiltva volt) újra engedélyezhető
      if (c?.ok) { setLoadState('ok'); setLoadErr(null); setSaveState({ kind: 'saved', at: Date.now() }); }
      if (a?.ok) agendaFileOk.current = true;
      if (pe?.ok) peopleFileOk.current = true;
      if (c?.ok && a?.ok && pe?.ok && snap?.ok) {
        setSaveMsg(`✓ Minden elmentve (tanterv + feladatok + események + levelek + névjegyzék). Pillanatkép: grid/backups/${snap.name}`);
      } else setSaveMsg('⚠ A mentés részben sikertelen - nézd meg a Betöltés listát, és próbáld újra.');
    } catch { setSaveMsg('⚠ A mentés nem sikerült (hálózati hiba). Próbáld újra.'); }
    window.setTimeout(() => setSaveMsg(null), 8000);
  };
  // #5: az abalogh@metropolitan.hu Outlook-naptár BEHÚZÁSA (COM) - tükör-események az
  // agendába, hogy a saját időpontjaidat itt is lásd a kártyákon/naptárban. Az outlook-tükör
  // eseményeket (extSource:'outlook') minden szinkron lecseréli a friss olvasásra (a törölteket eltünteti).
  const syncOutlookCalendar = useCallback(async () => {
    setTitkarBusy('Outlook-naptár szinkron…');
    try {
      const res = await fetch('/api/outlook-calendar?days=60', { headers: editHeaders() });
      const j = await res.json() as { ok: boolean; error?: string; events?: { id: string; subject: string; start: string; end: string; allDay: boolean; location: string; organizer: string; gist: string }[] };
      if (!j.ok || !j.events) { setSaveMsg(`⚠ Outlook-naptár: ${j.error ?? 'nem sikerült'}`); window.setTimeout(() => setSaveMsg(null), 9000); return; }
      const cur = agendaRef.current;
      const prevByExt = new Map(cur.events.filter((e) => e.extId).map((e) => [e.extId as string, e]));
      // rövid, stabil azonosító a tükör-eseménynek; a kulcs az Outlook-id + kezdés EGYÜTT,
      // mert ismétlődő eseménynél a GlobalAppointmentID minden előfordulásra AZONOS
      const hash36 = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
      // az appban korábban törölt tükröket (tombstone) NEM hozzuk vissza
      const hidden = new Set(cur.hiddenExtIds ?? []);
      let added = 0; let updated = 0;
      const imported: AgendaEvent[] = j.events
        .filter((o) => o.subject && o.start && !hidden.has(`${o.id}|${o.start}`))
        .map((o) => {
          const day = o.start.slice(0, 10);
          const hhmm = o.start.slice(11, 16);
          const extKey = `${o.id}|${o.start}`;
          const prev = prevByExt.get(extKey);
          if (prev) updated++; else added++;
          // többnapos esemény záró napja: egész napos eseménynél az Outlook End kizáró (másnap 0:00)
          const endDay = o.end ? o.end.slice(0, 10) : null;
          let dayEnd: string | null = null;
          if (endDay && endDay > day) {
            const d2 = o.allDay ? addDaysYmd(endDay, -1) : endDay;
            if (d2 > day) dayEnd = d2;
          }
          return {
            ...(prev ?? emptyEvent()),
            id: prev?.id ?? `ox-${hash36(extKey)}`,
            title: o.subject,
            when: o.allDay ? fmtDayHu(day) : `${fmtDayHu(day)} ${hhmm}`,
            sort: day.slice(0, 7), day, dayEnd,
            place: o.location || null,
            owner: o.organizer || null,
            note: o.gist || null,
            mstatus: 'confirmed' as const,
            extSource: 'outlook' as const, extId: extKey,
          };
        });
      // tengely-szinkron a tükrökre is: az Outlookban odébb tett nap követése a kapcsolt
      // feladat-határidőkben; az Outlookból eltűnt tükörre mutató task.eventId leválasztása
      const importedIds = new Set(imported.map((e) => e.id));
      const oldMirrors = cur.events.filter((e) => e.extSource === 'outlook');
      const removedIds = new Set(oldMirrors.filter((e) => !importedIds.has(e.id)).map((e) => e.id));
      const newDayById = new Map(imported.map((e) => [e.id, e.day]));
      const oldDayById = new Map(oldMirrors.map((e) => [e.id, e.day]));
      const tasksSynced = cur.tasks.map((t) => {
        if (!t.eventId) return t;
        if (removedIds.has(t.eventId)) return { ...t, eventId: null };
        const nd = newDayById.get(t.eventId); const od = oldDayById.get(t.eventId);
        if (nd && od && nd !== od && t.dueDate === od) return { ...t, dueDate: nd };
        return t;
      });
      // az Outlookból eltűnt tükör Gmail-példányát is töröljük (ha volt publikálva)
      oldMirrors.filter((e) => !importedIds.has(e.id) && e.googleEventId).forEach((e) => {
        void fetch('/api/meet', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
          body: JSON.stringify({ action: 'delete', googleEventId: e.googleEventId }),
        }).catch(() => { /* nem kritikus */ });
      });
      const nextEvents = [...cur.events.filter((e) => e.extSource !== 'outlook'), ...imported];
      commitAgenda({ ...cur, tasks: tasksSynced, events: nextEvents });
      setSaveMsg(`✓ Outlook-naptár behúzva: ${added} új, ${updated} frissítve.`);
    } catch { setSaveMsg('⚠ Az Outlook-naptár olvasása nem sikerült (fut a klasszikus Outlook a gépen?).'); }
    finally { setTitkarBusy(null); window.setTimeout(() => setSaveMsg(null), 9000); }
  }, [commitAgenda]);
  // 🖨 HAVI RIPORT modál (dékáni kör) + havi emlékeztető-kártya minden hó 28-tól:
  // ha az adott hónapra még nincs riport-feladat, magas prioritással létrejön
  const [reportMonth, setReportMonth] = useState<string | null>(null);
  // 📅 KÖZPONTI Időpont küldése - minden nézetből elérhető, egy űrlap intéz mindent
  const [idopont, setIdopont] = useState<IdopontSeed | null>(null);
  const reportReminderDone = useRef(false);
  useEffect(() => {
    if (!hydrated || !canEdit || reportReminderDone.current) return;
    const now = new Date();
    if (now.getDate() < 28) return;
    reportReminderDone.current = true;
    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const marker = `(riport ${mk})`;
    const cur = agendaRef.current;
    if (cur.tasks.some((t) => t.title.includes(marker))) return;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    commitAgenda({
      ...cur,
      tasks: [{
        ...emptyTask(),
        title: `Havi riport küldése a dékáni körnek ${marker}`,
        summary: 'Események naptár → a hónap fejlécén 🖨 → Titkárnő megfogalmazása → Küldésre a Postába (Kiss Melinda, Pálfi Szabolcs).',
        priority: 'high', category: 'Kommunikáció & PR',
        dueDate: `${mk}-${lastDay}`,
      }, ...cur.tasks],
    });
  }, [hydrated, canEdit, commitAgenda]);
  // ⇪ GMAIL-NAPTÁRBA: minden napra tett esemény (az Outlook-tükrök is) egyirányú
  // publikálása a draronbalogh@gmail.com naptárba - create (Meet nélkül) vagy update.
  // Visszafelé SOHA nem olvasunk: a Gmailben kézzel felvett bejegyzések nem kerülnek ide.
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const publishAllToGoogle = useCallback(async () => {
    if (!canEditRef.current) return;
    const evs = agendaRef.current.events;
    const dated = evs.filter((e) => e.day);
    const skipped = evs.length - dated.length;
    let created = 0; let updatedN = 0; let failed = 0;
    const idPatch = new Map<string, { googleEventId: string; meetLink: string | null }>();
    setPublishMsg(`⇪ Gmail-naptár: 0/${dated.length}…`);
    for (let i = 0; i < dated.length; i++) {
      const e = dated[i];
      const m = e.when.match(/(\d{1,2})[:.](\d{2})/);
      const hh = m ? String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0') : '09';
      const mi = m ? m[2] : '00';
      const he = String(Math.min(23, Number(hh) + 1)).padStart(2, '0');
      // hosszú időszak (>21 nap, pl. szorgalmi időszak): NEM több hetes sáv megy a
      // Gmailbe, hanem két jelölő - "kezdete" a day-en, "vége" a dayEnd-en
      const isLong = !!(e.dayEnd && (Date.parse(e.dayEnd) - Date.parse(e.day as string)) > 21 * 86400000);
      const startIso = `${e.day}T${hh}:${mi}:00`;
      const endIso = isLong ? `${e.day}T${he}:${mi}:00` : `${e.dayEnd || e.day}T${he}:${mi}:00`;
      const summary = isLong ? `${e.title} - kezdete` : e.title;
      try {
        if (isLong) {
          // a záró jelölő külön Google-esemény a dayEnd napján
          const endBody = { summary: `${e.title} - vége`, startIso: `${e.dayEnd}T${hh}:${mi}:00`, endIso: `${e.dayEnd}T${he}:${mi}:00`, location: e.place ?? '', description: '', tentative: e.mstatus === 'tentative' };
          if (e.googleEndEventId) {
            await fetch('/api/meet', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify({ action: 'update', googleEventId: e.googleEndEventId, ...endBody }) }).catch(() => { /* nem kritikus */ });
          } else {
            const rr = await fetch('/api/meet', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify({ action: 'create', attendees: [], sendInvite: false, noMeet: true, ...endBody }) });
            const jj = await rr.json() as { ok: boolean; googleEventId?: string };
            if (jj.ok && jj.googleEventId) {
              const cur = agendaRef.current;
              commitAgenda({ ...cur, events: cur.events.map((x) => (x.id === e.id && !x.googleEndEventId ? { ...x, googleEndEventId: jj.googleEventId ?? null } : x)) });
            }
          }
        }
        if (e.googleEventId) {
          const res = await fetch('/api/meet', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
            body: JSON.stringify({ action: 'update', googleEventId: e.googleEventId, startIso, endIso, summary, location: e.place ?? '', description: '', tentative: e.mstatus === 'tentative' }),
          });
          const j = await res.json() as { ok: boolean; unconfigured?: boolean };
          if (j.unconfigured) { setPublishMsg('⚠ A Google-naptár nincs beállítva (OAuth).'); return; }
          if (j.ok) updatedN++; else failed++;
        } else {
          const res = await fetch('/api/meet', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
            body: JSON.stringify({ action: 'create', summary, startIso, endIso, location: e.place || undefined, description: undefined, attendees: [], sendInvite: false, tentative: e.mstatus === 'tentative', noMeet: true }),
          });
          const j = await res.json() as { ok: boolean; unconfigured?: boolean; googleEventId?: string; meetLink?: string };
          if (j.unconfigured) { setPublishMsg('⚠ A Google-naptár nincs beállítva (OAuth).'); return; }
          if (j.ok && j.googleEventId) { created++; idPatch.set(e.id, { googleEventId: j.googleEventId, meetLink: j.meetLink || null }); } else failed++;
        }
      } catch { failed++; }
      setPublishMsg(`⇪ Gmail-naptár: ${i + 1}/${dated.length}…`);
    }
    // az új Google-párok azonosítói visszaíródnak az eseményekre (a következő gomb már frissít)
    if (idPatch.size) {
      const cur = agendaRef.current;
      commitAgenda({
        ...cur,
        events: cur.events.map((x) => {
          const p = idPatch.get(x.id);
          return p && !x.googleEventId ? { ...x, googleEventId: p.googleEventId, meetLink: x.meetLink ?? p.meetLink } : x;
        }),
      });
    }
    setPublishMsg(`✓ Gmail-naptár: ${created} új, ${updatedN} frissítve${failed ? `, ${failed} hiba` : ''}${skipped ? ` · ${skipped} dátum nélküli kihagyva` : ''}.`);
    window.setTimeout(() => setPublishMsg(null), 12000);
  }, [commitAgenda]);
  // opcionális: hordozható másolat letöltése fájlba (pl. másik gépre költöztetéshez)
  const downloadBackup = () => {
    const b = new Blob([JSON.stringify(backupPayload(), null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `metumatrix-mentes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  interface BackupFile { kind?: string; savedAt?: string; curriculum?: Curriculum; agenda?: Partial<Agenda>; people?: Partial<PeopleDB>; cohorts?: unknown; tasks?: unknown; }
  // egy mentés (fájlból vagy szerveri pillanatképből) visszatöltése - megerősítéssel
  const applyBackup = (d: BackupFile) => {
    {
      {
        if (d.kind === 'metumatrix-backup') {
          const when = d.savedAt ? ` (mentve: ${String(d.savedAt).slice(0, 16).replace('T', ' ')})` : '';
          if (!confirm(`Teljes mentés visszatöltése${when}: tanterv + feladatok + események + névjegyzék. Ez felülírja a mostani állapotot.`)) return;
          if (d.curriculum && Array.isArray(d.curriculum.cohorts)) commit(d.curriculum);
          if (d.agenda && Array.isArray(d.agenda.tasks)) {
            const a = normalizeAgenda(d.agenda);
            setAgenda(a);
            try { localStorage.setItem(AGENDA_LS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
          }
          if (d.people && Array.isArray(d.people.students)) {
            const p = normalizePeople(d.people);
            setPeopleDB(p);
            peopleRef.current = p;
            try { localStorage.setItem(PEOPLE_LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
          }
          // a visszatöltött állapot azonnal a szerver-fájlokba is íródik (nem csak a képernyőre)
          fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify(d.curriculum ?? dataRef.current) }).catch(() => { /* ignore */ });
          fetch('/api/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify(d.agenda ? normalizeAgenda(d.agenda) : agendaRef.current) }).catch(() => { /* ignore */ });
          fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify(d.people ? normalizePeople(d.people) : peopleRef.current) }).catch(() => { /* ignore */ });
          // a felhasználó explicit érvényes adatot töltött vissza - az automentés újra élhet
          setLoadState('ok'); setLoadErr(null);
          agendaFileOk.current = true; peopleFileOk.current = true;
        } else if (Array.isArray(d.cohorts)) {
          // régi formátum: csak tanterv
          commit(d as unknown as Curriculum);
          setLoadState('ok'); setLoadErr(null);
        } else if (Array.isArray(d.tasks)) {
          // csak feladatok+események mentés
          const a = normalizeAgenda(d as Partial<Agenda>);
          setAgenda(a);
          try { localStorage.setItem(AGENDA_LS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
        } else {
          throw new Error('bad');
        }
      }
    }
  };
  const importJSON = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try { applyBackup(JSON.parse(String(r.result)) as BackupFile); setLoadOpen(false); }
      catch { alert('Hibás vagy ismeretlen JSON fájl.'); }
    };
    r.readAsText(file);
  };
  // pillanatkép-lista + visszaállítás a szerveri backups mappából
  const openLoad = () => {
    setLoadOpen(true); setSnaps(null);
    fetch('/api/snapshots', { cache: 'no-store', headers: editHeaders() }).then((r) => r.json())
      .then((j) => setSnaps(j?.ok ? j.list : [])).catch(() => setSnaps([]));
  };
  const restoreSnap = (name: string) => {
    fetch(`/api/snapshots?name=${encodeURIComponent(name)}`, { cache: 'no-store', headers: editHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok || !j.data) { alert('A pillanatkép nem olvasható.'); return; }
        try { applyBackup(j.data as BackupFile); setLoadOpen(false); }
        catch { alert('Hibás pillanatkép-fájl.'); }
      })
      .catch(() => alert('A pillanatkép nem érhető el.'));
  };

  const onEdit = useCallback((ci: number, xi: number) => { if (!canEditRef.current) return; setEditor({ ci, xi }); }, []);
  const onDetails = useCallback((ci: number, xi: number) => setDetails({ ci, xi }), []);
  const onAdd = useCallback((ci: number) => { if (!canEditRef.current) return; setEditor({ ci, xi: -1 }); }, []);
  const onInstructor = useCallback((name: string) => setInstr((v) => (v === name ? '' : name)), []);
  const onCategory = useCallback((c: string) => setCat((v) => (v === c ? '' : c)), []);
  const onCatEdit = useCallback((ci: number, xi: number, x: number, y: number) => setCatMenu({ ci, xi, x, y }), []);
  const toggleCourseCat = useCallback((ci: number, xi: number, k: string) => {
    const cur = dataRef.current;
    commit({
      ...cur,
      cohorts: cur.cohorts.map((c, i) => (i !== ci ? c : {
        ...c,
        courses: c.courses.map((x, j) => {
          if (j !== xi) return x;
          const sel = catList(x);
          return { ...x, category: sel.includes(k) ? sel.filter((s) => s !== k) : [...sel, k] };
        }),
      })),
    });
  }, [commit]);
  // a zárolás munkamenetre szól - nem mentjük, hogy frissítéskor mindig zárva induljon
  const toggleLock = useCallback(() => setLocked((v) => !v), []);
  const handlers = useMemo<Handlers>(() => ({ onEdit, onDetails, onAdd, onInstructor, onCategory, onCatEdit }), [onEdit, onDetails, onAdd, onInstructor, onCategory, onCatEdit]);
  // a mátrixon feloldott (szerkesztés) módban a kártya-kattintás egyből a szerkesztő
  // ablakot nyitja (mint a Katalógusban); zárolt módban marad a jobb oldali részletek-sáv
  const mapHandlers = useMemo<Handlers>(() => ({
    ...handlers,
    onDetails: (ci: number, xi: number) => (locked ? setDetails({ ci, xi }) : setEditor({ ci, xi })),
  }), [handlers, locked]);

  const addEdge = useCallback((e: UserEdge) => {
    const cur = dataRef.current;
    commit({ ...cur, userEdges: [...(cur.userEdges || []).filter((x) => x.id !== e.id), e] });
  }, [commit]);
  const deleteEdge = useCallback((id: string) => {
    const cur = dataRef.current;
    commit({ ...cur, userEdges: (cur.userEdges || []).filter((x) => x.id !== id) });
  }, [commit]);
  const setEdgeLook = useCallback((id: string, look: EdgeLook) => {
    const cur = dataRef.current;
    commit({ ...cur, userEdges: (cur.userEdges || []).map((x) => (x.id === id ? { ...x, look } : x)) });
  }, [commit]);
  const moveNode = useCallback((id: string, pos: { x: number; y: number }) => {
    const cur = dataRef.current;
    commit({ ...cur, positions: { ...(cur.positions || {}), [id]: pos } });
  }, [commit]);
  const savePositions = useCallback((map: Record<string, { x: number; y: number }>) => {
    const cur = dataRef.current;
    commit({ ...cur, positions: { ...(cur.positions || {}), ...map } });
  }, [commit]);
  const applyConnection = useCallback((e: UserEdge, positions: Record<string, { x: number; y: number }>) => {
    const cur = dataRef.current;
    commit({
      ...cur,
      userEdges: [...(cur.userEdges || []).filter((x) => x.id !== e.id), e],
      positions: { ...(cur.positions || {}), ...positions },
    });
  }, [commit]);
  const resetPositions = useCallback(() => {
    const cur = dataRef.current;
    commit({ ...cur, positions: {} });
  }, [commit]);
  const persist = useMemo<Persist>(() => ({ addEdge, deleteEdge, setEdgeLook, moveNode, savePositions, applyConnection, resetPositions }), [addEdge, deleteEdge, setEdgeLook, moveNode, savePositions, applyConnection, resetPositions]);

  const filter = useMemo<Filter>(() => ({ q, spec, ctype, instr, cat }), [q, spec, ctype, instr, cat]);
  const vp = useMemo<View>(() => ({ ver, prog }), [ver, prog]);
  const versions = useMemo(() => VERSION_ORDER.filter((v) => data.cohorts.some((c) => c.version === v)), [data]);
  const visibleCohorts = useMemo(() => data.cohorts.filter((c) => c.version === ver && (prog === 'ALL' || c.program === prog)), [data, ver, prog]);

  const specs = useMemo(() => {
    const s = new Set<string>();
    visibleCohorts.forEach((c) => c.courses.forEach((x) => { if (x.specialization) s.add(specShort(x.specialization)); }));
    return [...s];
  }, [visibleCohorts]);
  const allInstructors = useMemo(() => {
    const s = new Set<string>();
    visibleCohorts.forEach((c) => c.courses.forEach((x) => (x.instructors || '').split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => s.add(n))));
    return [...s].sort((a, b) => a.localeCompare(b, 'hu'));
  }, [visibleCohorts]);
  const allCats = useMemo(() => {
    const s = new Set<string>();
    visibleCohorts.forEach((c) => c.courses.forEach((x) => catList(x).forEach((k) => s.add(k))));
    return CATEGORIES.filter((k) => s.has(k));
  }, [visibleCohorts]);
  // EGY FORRÁS: a tanárnevek a tantervből jönnek (aktuális verzió kurzusainak oktatói)
  const teacherNames = useMemo(() => {
    const s = new Set<string>();
    data.cohorts.filter((c) => c.version === ver).forEach((c) => c.courses.forEach((x) => instrList(x).forEach((n) => s.add(n))));
    return [...s].sort((a, b) => a.localeCompare(b, 'hu'));
  }, [data, ver]);
  // állandó választólista: tantervi tanárok + hallgatók (personDB) - T/H badge-dzsel
  const roster = useMemo(() => buildRoster(teacherNames, peopleDB), [teacherNames, peopleDB]);
  // kategórián belüli gyorsszűrők a résztvevő-választóhoz (Tanár: aktív/főállású/óraadó,
  // Hallgató: aktív/képviselő/demonstrátor/...) - a Névjegyzék státusz-címkéiből
  const rosterGroups = useMemo<RosterGroups>(() => ({
    T: [
      // Aktív = a Névjegyzék főállású + óraadó (az OSZTÓ TT-hez igazított roster), így a
      // szám kiadja magát (aktív = főállású + óraadó), nem a tantervi nyers névlista.
      { label: 'Aktív (most tanít)', names: [...teacherStatusNames(peopleDB, 'főállású'), ...teacherStatusNames(peopleDB, 'óraadó')] },
      { label: 'Főállású', names: teacherStatusNames(peopleDB, 'főállású') },
      { label: 'Óraadó', names: teacherStatusNames(peopleDB, 'óraadó') },
      { label: 'Korábbi / külsős', names: teacherStatusNames(peopleDB, 'volt/külsős') },
    ],
    H: [
      { label: 'Aktív', names: activeStudentNames(peopleDB) },
      { label: 'Képviselő', names: studentStatusNames(peopleDB, 'képviselő') },
      { label: 'Demonstrátor', names: studentStatusNames(peopleDB, 'demonstrátor') },
      { label: 'Szervező', names: studentStatusNames(peopleDB, 'szervező') },
      { label: 'Nagykövet', names: studentStatusNames(peopleDB, 'nagykövet') },
    ],
  }), [teacherNames, peopleDB]);
  // a név kanonikus (Névjegyzék-beli) írásmódja titulussal - csak megjelenítéshez
  const canonName = useMemo(() => {
    const m = buildCanonicalNames(peopleDB);
    return (n: string) => m.get(normName(n)) ?? n;
  }, [peopleDB]);
  // Órarend → tanterv: "PROGRAM|normalizált tárgynév" → {ci,xi}. Az aktuális tanév
  // (VERSION_ORDER eleje) nyer; azonos verzión belül az őszi (páratlan) félév, majd a kisebb.
  const courseLookup = useMemo(() => {
    const vi = (v: string) => { const i = VERSION_ORDER.indexOf(v); return i === -1 ? VERSION_ORDER.length : i; };
    const order = data.cohorts.map((_, i) => i).sort((a, b) => {
      const A = data.cohorts[a], B = data.cohorts[b];
      const v = vi(A.version) - vi(B.version);
      if (v) return v;
      const odd = ((B.semester ?? 0) % 2) - ((A.semester ?? 0) % 2);
      return odd || (A.semester ?? 0) - (B.semester ?? 0);
    });
    const m = new Map<string, Ref2>();
    order.forEach((ci) => data.cohorts[ci].courses.forEach((x, xi) => {
      const k = `${data.cohorts[ci].program}|${normTitle(x.name)}`;
      if (!m.has(k)) m.set(k, { ci, xi });
    }));
    return m;
  }, [data]);
  const resolveOrarendCourse = useCallback((targy: string, szint: string | null): Ref2 | null => {
    const n = normTitle(targy);
    const progs = szint === 'BA' || szint === 'MA' ? [szint] : ['BA', 'MA'];
    for (const p of progs) { const hit = courseLookup.get(`${p}|${n}`); if (hit) return hit; }
    return null;
  }, [courseLookup]);
  const kindOf = useMemo(() => {
    const m: Record<string, PersonKind> = {};
    roster.forEach((r) => { if (!m[r.name]) m[r.name] = r.kind; });
    return m;
  }, [roster]);
  // ref-tükör a korábban definiált callbackeknek (eventLetterRecipients) - futásidőben olvassák
  kindOfRef.current = kindOf;
  // a név-szűrőre illesztett személy tanított tárgyai (a Feladatok nézet összegzőjéhez)
  const taught = useMemo(() => {
    if (!instr) return [];
    const out: string[] = [];
    data.cohorts.filter((c) => c.version === ver).forEach((c) => c.courses.forEach((x) => {
      if (instrList(x).includes(instr)) out.push(`${c.program} · ${semLabel(c.semester)} · ${x.name}`);
    }));
    return out;
  }, [data, ver, instr]);

  const detailCourse = details ? data.cohorts[details.ci]?.courses[details.xi] : null;
  // tanterv-nézetben (mátrix/katalógus) látszanak a tantervi szűrők és a mentés/betöltés - a feladat/esemény nézetben nem
  const isCurr = view === 'map' || view === 'catalog';

  // Kulcs nélküli publikus látogató: a szerver adatot sem ad ki (403 locked),
  // itt pedig SEMMI nem renderelődik - se menü, se név, se adat.
  if (loadState === 'locked') return <div className="lockpane">🔒</div>;

  return (
    <>
      <div className={`app-shell${canEdit ? '' : ' viewer'}`}>
      <header className="masthead">
        <div className="wrap">
          <div className="brandmark">
            <div className="logo">M</div>
            <div>
              <div className="kicker">METU · Animáció és Média Design Tanszék <span className="kicker-name">Dr. Balogh Áron</span></div>
              <h1 className="title">Média Design {prog === 'ALL' ? 'BA + MA' : prog} · {ver === 'régi (korábbi)' ? 'régi mintatanterv' : ver}</h1>
            </div>
          </div>
        </div>
      </header>
      {/* a fejlécen KÍVÜL él: sötét módban a masthead/toolbar blur-je saját stacking
          contextet nyit, és azon belülről a fix gomb a menüsáv mögé kerülne */}
      <button className="themebtn themebtn--head" title="Világos / sötét mód - este 8-tól reggel 7-ig magától sötét; a kézi váltás a következő váltásig érvényes" onClick={toggleTheme}>{theme === 'dark' ? '☀' : '☾'}</button>
      {canEdit && (
        <button className={`themebtn themebtn--head notifbtn--head${fsSupported ? ' notifbtn--shift' : ''}`}
          title={notifOn ? 'Értesítés sürgős kártyánál: bekapcsolva' : 'Értesítés sürgős kártyánál: kikapcsolva'}
          onClick={() => void toggleNotif()}>
          {/* inline SVG csengő - az emoji-ikon itt kilógna a glyph-gombok sorából */}
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2a4 4 0 0 0-4 4c0 2.8-.9 3.9-1.4 4.5h10.8C13 9.9 12 8.8 12 6a4 4 0 0 0-4-4z" />
            <path d="M6.6 13a1.5 1.5 0 0 0 2.8 0" />
            {!notifOn && <path d="M2.5 1.8l11 12.4" />}
          </svg>
        </button>
      )}
      {fsSupported && (
        <button className="themebtn themebtn--head fsbtn--head" title={isFs ? 'Kilépés a teljes képernyőből' : 'Teljes képernyő'} onClick={toggleFs}>
          {/* inline SVG: minden platformon renderel (a ⛶ glyph sok eszközön tofu) */}
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {isFs
              ? <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" />
              : <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />}
          </svg>
        </button>
      )}

      <div className="toolbar">
        <div className="wrap toolbar__inner">
          <div className="viewtoggle viewtoggle--nav" ref={navRef}>
            {/* tiszta, ikon nélküli menü - az emoji-ikonok a felhasználó szerint gyerekesek voltak.
                Sorrend (2026-07-23 user-döntés): napi munka elöl, a nehéz Mátrix hátrébb. */}
            <button className={view === 'tasks' ? 'is-on' : ''} onClick={() => setView('tasks')}>Feladatok</button>
            <button className={`editonly${view === 'posta' ? ' is-on' : ''}`} title="A Postázó: bejövő levelek választervekkel + új levél írása sablontárral - minden levél-ügy egy helyen"
              onClick={() => { if (!canEdit) return; setPostaPanel(false); setView('posta'); }}>Posta{postaCount > 0 ? ` · ${postaCount}` : ''}</button>
            <button className={view === 'events' ? 'is-on' : ''} onClick={() => setView('events')}>Események</button>
            <button className={view === 'orarend' ? 'is-on' : ''} onClick={() => setView('orarend')}>Órarend</button>
            <button className={view === 'map' ? 'is-on' : ''} onClick={() => setView('map')}>Mátrix</button>
            <button className={view === 'catalog' ? 'is-on' : ''} onClick={() => setView('catalog')}>Katalógus</button>
            <button className={`editonly${view === 'people' ? ' is-on' : ''}`} title="Elérhetőségek: oktatók, hallgatók, intézményi / alumni / opponens / piaci kapcsolatok"
              onClick={() => { if (!canEdit) return; setView('people'); }}>Névjegyzék</button>
            <button className={view === 'it' ? 'is-on' : ''} title="IT és szoftverek: az Infopark termeiben telepített szoftverek" onClick={() => setView('it')}>IT</button>
            <button className={`editonly${view === 'docs' ? ' is-on' : ''}`} title="Belső útmutatók: Zoom, oktatói segédletek, tréning - csak szerkesztő módban"
              onClick={() => { if (!canEdit) return; setView('docs'); }}>Segédletek</button>
            <button className="editonly" title="Időpont küldése EGY űrlapon: kinek + miről + mikor + hol - a rendszer intézi a levelet (Posta), a naptárat, a feladatkártyát és a Meet-linket"
              onClick={() => { if (canEdit) setIdopont({}); }}>📅 Időpont</button>
          </div>
          <span className="search-wrap">
            <input className="search search--corner" type="search" name="app-kereses" autoComplete="off" enterKeyHint="search"
              placeholder={isCurr ? 'Keresés tárgyra, oktatóra…' : view === 'people' ? 'Keresés a névjegyzékben…' : view === 'orarend' ? 'Keresés az órarendben…' : view === 'it' ? 'Keresés szoftverre, teremre…' : view === 'docs' ? 'Keresés a segédletekben…' : view === 'posta' ? 'Keresés a sablonokban és levelekben…' : 'Keresés…'} value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button type="button" className="search-clear" title="Keresés törlése" onClick={() => setQ('')}>✕</button>}
          </span>
          <div className="toolbar-break" />
          {isCurr && (
          <div className="viewtoggle">
            <button className={prog === 'BA' ? 'is-on' : ''} onClick={() => setProg('BA')}>BA</button>
            <button className={prog === 'MA' ? 'is-on' : ''} onClick={() => setProg('MA')}>MA</button>
            <button className={prog === 'ALL' ? 'is-on' : ''} onClick={() => setProg('ALL')} title="BA és MA egyszerre, egymás alatt">BA+MA</button>
          </div>
          )}
          {isCurr && (
          <select className="presetsel" value={ver} onChange={(e) => setVer(e.target.value)} title="Tanterv-verzió">
            {versions.map((v) => <option key={v} value={v}>{v === 'régi (korábbi)' ? 'Régi (korábbi)' : v}</option>)}
          </select>
          )}
          {/* automentés-állapot: eddig a hibák némán elvesztek - most mindig látszik, mi történt */}
          {canEdit && loadState === 'ok' && (
            saveState.kind === 'saving' ? <span className="autosave-chip">● mentés…</span>
            : saveState.kind === 'saved' ? <span className="autosave-chip ok">✓ mentve {new Date(saveState.at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
            : saveState.kind === 'denied' ? <span className="autosave-chip err" title="A szerver megtekintő módban lát - a módosítások nem íródnak a fájlba. Nyisd meg a ?ts= kulcsos linkkel.">⚠ nincs mentve - megtekintő mód</span>
            : saveState.kind === 'error' ? (
              <span className="autosave-chip err" title={saveState.msg}>
                ⚠ mentési hiba
                <button type="button" className="chip-retry" onClick={() => void postCurriculum()}>újra</button>
              </span>
            ) : null
          )}
          <button
            className={`btn tools-toggle${q || spec || ctype || instr || cat ? ' has-f' : ''}`}
            onClick={() => setToolsOpen((o) => !o)}
            title="Szűrők és eszközök"
          >{toolsOpen ? '✕' : '☰'}{(q || spec || ctype || instr || cat) && !toolsOpen ? ' •' : ''}</button>
          <div className={`toolbar-more${toolsOpen ? ' open' : ''}`}>
          {/* név-lenyíló CSAK a tantervi nézeteken - máshol a kereső és a személy-chipek szűrnek */}
          {isCurr && (
          <>
          <select className={`presetsel instrsel${instr ? ' is-on' : ''}`} value={instr} onChange={(e) => setInstr(e.target.value)} title="Szűrés névre - tanterv, feladatok és események is erre szűrődnek">
            <option value="">Minden oktató</option>
            {allInstructors.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {allCats.length > 0 && (
            <select className={`presetsel instrsel${cat ? ' is-on' : ''}`} value={cat} onChange={(e) => setCat(e.target.value)} title="Szűrés kategóriára (mindkét nézetben)">
              <option value="">Minden kategória</option>
              {allCats.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
          <div className="filters">
            {specs.map((s) => (
              <button key={s} className={`chip${spec === s ? ' is-on' : ''}`} onClick={() => setSpec((v) => (v === s ? '' : s))}>{s}</button>
            ))}
            <button className={`chip${ctype === 'gyakorlat' ? ' is-on' : ''}`} onClick={() => setCtype((v) => (v === 'gyakorlat' ? '' : 'gyakorlat'))}>gyakorlat</button>
            <button className={`chip${ctype === 'előadás' ? ' is-on' : ''}`} onClick={() => setCtype((v) => (v === 'előadás' ? '' : 'előadás'))}>előadás</button>
          </div>
          </>
          )}
          <span className="spacer" />
          {/* a mentés/betöltés/fájlba a jobb alsó sarok dokkjába költözött */}
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
          {isCurr && (
          <button className="btn btn--danger" onClick={resetData} title="CSAK a tantervet állítja alaphelyzetbe - előtte készíts mentést!">↺ Alaphelyzet</button>
          )}
          </div>
        </div>
      </div>

        {loadState === 'loading' ? (
          // amíg a szerverfájl nem jött meg, SEMMIT nem renderelünk a beépített DEFAULT-ból -
          // így nem villan fel a régi/pozíció nélküli térkép
          <div className="viewport"><div className="load-pane"><div className="load-box"><span className="load-spin" aria-hidden />Betöltés…</div></div></div>
        ) : loadState === 'error' ? (
          <div className="viewport">
            <div className="load-pane load-pane--err">
              <p>⚠ {loadErr} A szerkesztés és a mentés le van tiltva, hogy semmi ne írja felül a legutolsó mentésedet.</p>
              <button type="button" className="btn" onClick={() => setLoadN((n) => n + 1)}>↻ Újrapróbálás</button>
            </div>
          </div>
        ) : (
        <div className="viewport" ref={vpRef} onTouchStart={onViewportTouchStart} onTouchEnd={onViewportTouchEnd}>
          {loadState === 'ls-fallback' && (
            <div className="load-banner">
              ⚠ {loadErr} A böngészőben mentett helyi vázlatot látod - a fájlba mentés ki van kapcsolva.
              <button type="button" className="btn" onClick={() => setLoadN((n) => n + 1)}>↻ Újrapróbálás</button>
            </div>
          )}
          {/* A Mátrix LUSTÁN töltődik (2026-07-23): az app a Feladatokon indul, a nehéz térkép
              CSAK az első Mátrix-megnyitáskor mountol - utána bent marad (csak elrejtjük),
              hogy a zoom/pásztázás megőrződjön és ne igazítson újra. */}
          {mapMounted && (
          <div className="view-pane" style={{ display: view === 'map' ? 'block' : 'none' }}>
            <MapView data={data} filter={filter} handlers={mapHandlers} persist={persist} theme={theme} view={vp} locked={locked || !canEdit} onToggleLock={canEdit ? toggleLock : () => { /* bemutató mód */ }} active={view === 'map'} focusId={details ? `c-${details.ci}-${details.xi}` : null} />
          </div>
          )}
          {view === 'catalog' ? (
            <CatalogView data={data} filter={filter} view={vp} onDetails={onDetails} onEdit={onEdit} onAdd={onAdd} onInstructor={onInstructor} onCategory={onCategory} onCatEdit={onCatEdit} displayName={canonName} />
          ) : view === 'tasks' ? (
            <AgendaView
              agenda={agenda} q={q} instr={instr} taught={taught} letterStats={letterStats}
              onAdd={() => { if (!canEdit) return; setTaskEdit({ t: emptyTask(), isNew: true }); }}
              onOpen={(id) => setAgendaDetails({ kind: 'task', id })}
              onOpenPost={jumpToPosta}
              onEditIntro={() => { if (!canEdit) return; setIntroEdit(true); }}
              onPerson={onInstructor}
              onToggleDone={toggleDone}
              onCyclePriority={cyclePriority}
              onSetStar={setTaskStar}
              onOpenEvent={(id) => setAgendaDetails({ kind: 'event', id })}
            />
          ) : view === 'events' ? (
            <EventsView
              agenda={agenda} q={q} instr={instr} letterStats={letterStats}
              onAdd={() => { if (!canEdit) return; setEventEdit({ e: emptyEvent(), isNew: true }); }}
              onOpen={(id) => setAgendaDetails({ kind: 'event', id })}
              onOpenTask={(id) => setAgendaDetails({ kind: 'task', id })}
              onOpenPost={jumpToPosta}
              onPerson={onInstructor}
              onSyncOutlook={canEdit ? syncOutlookCalendar : undefined}
              onPublishGoogle={canEdit ? publishAllToGoogle : undefined}
              publishMsg={publishMsg}
              onReport={canEdit ? (mk) => setReportMonth(mk) : undefined}
            />
          ) : view === 'people' ? (
            // csak betöltött adattal mountolunk: a PeopleModal szerkesztőként mount-kor
            // másolja be a db-t, egy mélylinkes korai mount üres listát mutatna
            hydrated
              ? <PeopleModal inline externalQuery={q} teacherNames={teacherNames} db={peopleDB} onSave={savePeople} onClose={() => { /* nézetként nincs bezárás */ }} />
              : <section className="wrap orv"><p className="tp-empty">Névjegyzék betöltése…</p></section>
          ) : view === 'orarend' ? (
            <OrarendView q={q} knownNames={[...teacherNames, ...peopleDB.teachers.map((p) => p.name), ...peopleDB.institution.map((p) => p.name), ...peopleDB.alumni.map((p) => p.name)]}
              displayName={canonName} resolveCourse={resolveOrarendCourse} onOpenCourse={onDetails} />
          ) : view === 'it' ? (
            <ITView q={q} />
          ) : view === 'docs' ? (
            <DocsView q={q} />
          ) : null}
          {/* POSTÁZÓ HUB - az EGYETLEN levél-felület (2026-07-22): 📨 Posta lista + ➕ Új levél ·
              Sablontár fülek. MINDIG mountolva marad (a megkezdett piszkozat nézetváltáskor nem
              vész el); a Posta menüből normál nézet, MÁS nézet felett balról beúszó fly-in panel
              (a kártyák ✉ gombjai ide nyitnak, a hátteret scrim takarja, ✕ / háttér-katt zár). */}
          {postaPanel && view !== 'posta' && <div className="drawer-scrim posta-scrim" onClick={() => setPostaPanel(false)} />}
          <div className={`view-pane posta-hub${postaPanel && view !== 'posta' ? ' posta-hub--fly' : ''}`}
            style={{ display: view === 'posta' || postaPanel ? 'block' : 'none' }}>
            {canEdit && (
              <div className="wrap posta-tabs">
                <div className="viewtoggle ag-mode">
                  <button type="button" className={postaTab === 'lista' ? 'is-on' : ''} onClick={() => setPostaTab('lista')}>📨 Posta{postaCount > 0 ? ` · ${postaCount}` : ''}</button>
                  <button type="button" className={postaTab === 'ir' ? 'is-on' : ''} title="Új levél írása: sablontár, villámgyors kitöltés, Titkárnő-fogalmazás" onClick={() => setPostaTab('ir')}>➕ Új levél · Sablontár</button>
                </div>
                {postaPanel && view !== 'posta' && <button type="button" className="btn posta-fly-close" onClick={() => setPostaPanel(false)}>✕ Bezárás</button>}
              </div>
            )}
            <div style={{ display: postaTab === 'lista' ? 'block' : 'none' }}>
              <PostaView
                agenda={agenda}
                footer={buildFooter(peopleDB, false)}
                senderRules={peopleDB.senderRules}
                onSenderRule={setSenderRule}
                onBusy={setTitkarBusy}
                onState={setSourceState}
                onSaveEvent={saveEvent}
                onLinkTaskEvent={linkTaskEvent}
                onConfirmMeetSlot={confirmMeetSlot}
                onEditInComposer={openLetterInComposer}
                undo={postaUndo ? { label: postaUndo.label } : null}
                onUndo={undoSourceState}
                onOpenCard={(sel) => { setPostaPanel(false); setAgendaDetails({ kind: sel.startsWith('t:') ? 'task' : 'event', id: sel.slice(2) }); }}
                onSaveLetter={saveLetter}
                onDeleteLetter={deleteLetter}
                onRefresh={() => setLoadN((n) => n + 1)}
                focusSel={postaFocus}
                onFocusConsumed={() => setPostaFocus(null)}
              />
            </div>
            <div style={{ display: postaTab === 'ir' ? 'block' : 'none' }}>
              <TopicsView
                q={q}
                letters={agenda.letters || []}
                onUseTopic={useTopicInComposer}
                onOpenLetter={openLetterInComposer}
                targetTitle={letterTargetTitle}
                onTitkarno={() => { if (canEdit) setTitkarOpen(true); }}
                composer={booted && (
                  <NotifyModal
                    key={inlineKey}
                    inline
                    target={inlineTarget}
                    topicReq={topicReq}
                    letterReq={letterReq}
                    ctxEvents={agenda.events}
                    ctxTasks={agenda.tasks}
                    topicLinks={agenda.topicLinks}
                    onLinkTopic={linkTopic}
                    onMarkReplied={markReplied}
                    onBusy={setTitkarBusy}
                    teacherNames={teacherNames}
                    db={peopleDB}
                    letters={(agenda.letters || []).filter((l) => l.targetId === (inlineTarget.targetId ?? null))}
                    onSaveLetter={saveLetter}
                    onDeleteLetter={deleteLetter}
                    onLetterStatus={setLetterStatus}
                    onSaveEvent={saveEvent}
                    onClose={() => { /* beágyazva nincs bezárás */ }}
                  />
                )}
              />
            </div>
          </div>
          <LevelWizard
            open={titkarOpen}
            onClose={() => setTitkarOpen(false)}
            db={peopleDB}
            teacherNames={teacherNames}
            agenda={agenda}
            onSaveLetter={saveLetter}
            onSaveEvent={saveEvent}
            onBusy={setTitkarBusy}
          />
        </div>
        )}

        {/* App-szintű „Titkárnő fogalmaz" jelző: nézetváltáskor/wizard-záráskor is látszik */}
        {titkarBusy && (
          <div role="status" aria-live="polite" style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'var(--ink)', color: 'var(--paper, #fff)', padding: '7px 16px', borderRadius: 12, fontSize: '.9rem', fontWeight: 600, boxShadow: '0 3px 12px rgba(0,0,0,.28)', maxWidth: '92vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ⏳ {titkarBusy}
          </div>
        )}
        {/* ✔ időpont-véglegesítés utáni felajánlás: visszaigazoló levél a Postába (nem blokkol) */}
        {confirmOffer && (
          <div role="status" aria-live="polite" style={{ position: 'fixed', top: titkarBusy ? 52 : 10, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: 'var(--ink)', color: 'var(--paper, #fff)', padding: '8px 14px', borderRadius: 12, fontSize: '.88rem', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', maxWidth: '94vw', boxShadow: '0 3px 12px rgba(0,0,0,.28)' }}>
            {confirmOffer.state === 'offer' && (<>
              <span>✔ Időpont rögzítve: {confirmOffer.title}</span>
              <button className="btn" onClick={() => { void sendConfirmLetter(); }}>✉ Visszaigazoló levél a Postába</button>
              <button className="btn" onClick={() => setConfirmOffer(null)}>Most nem</button>
            </>)}
            {confirmOffer.state === 'busy' && <span>🗣 Titkárnő fogalmazza a visszaigazoló levelet…</span>}
            {confirmOffer.state === 'done' && <span>✓ Visszaigazoló levél a Posta Kimenőben - a küldés onnan a te kezedben.</span>}
            {confirmOffer.state === 'err' && (<>
              <span>⚠ {confirmOffer.msg}</span>
              <button className="btn" onClick={() => setConfirmOffer(null)}>Bezárás</button>
            </>)}
          </div>
        )}
        {/* MENTÉS-DOKK a jobb alsó sarokban: desktopon a három gomb, mobilon hamburger-FAB */}
        {canEdit && loadState !== 'loading' && (
          <div className={`savedock${dockOpen ? ' is-open' : ''}`}>
            {saveMsg && <div className={`savedock-msg${saveMsg.startsWith('✓') ? ' ok' : ''}`}>{saveMsg}</div>}
            <div className="savedock-btns">
              <button className="btn" onClick={() => { setDockOpen(false); void exportJSON(); }} title="MINDEN adat mentése egy helyre: tanterv + feladatok + események + levelek + névjegyzék - időbélyeges pillanatkép a szerver grid/backups mappájában">⤓ Mentés</button>
              <button className="btn" onClick={() => { setDockOpen(false); openLoad(); }} title="Mentett pillanatkép visszatöltése (alapból a legutolsó), vagy fájl a gépről">⤒ Betöltés</button>
              <button className="btn" onClick={() => { setDockOpen(false); downloadBackup(); }} title="Hordozható másolat letöltése fájlba (pl. másik gépre)">⇩ Fájlba</button>
            </div>
            <button className="savedock-fab" title="Mentés és betöltés" onClick={() => setDockOpen((o) => !o)}>{dockOpen ? '✕' : '⤓'}</button>
          </div>
        )}
      </div>

      {catMenu && (() => {
        const course = data.cohorts[catMenu.ci]?.courses[catMenu.xi];
        if (!course) return null;
        const sel = catList(course);
        return (
          <>
            <div className="catmenu-scrim" onClick={() => setCatMenu(null)} />
            <div
              className="cat-menu"
              style={{
                left: Math.max(8, Math.min(catMenu.x - 150, window.innerWidth - 348)),
                top: Math.max(8, Math.min(catMenu.y + 10, window.innerHeight - 300)),
              }}
            >
              <div className="cat-menu-h">{course.name} - kategóriák</div>
              <div className="cat-picker">
                {CATEGORIES.map((k) => (
                  <button key={k} className={`chip${sel.includes(k) ? ' is-on' : ''}`}
                    onClick={() => toggleCourseCat(catMenu.ci, catMenu.xi, k)}>{k}</button>
                ))}
              </div>
              <button className="btn btn--ink cat-menu-done" onClick={() => setCatMenu(null)}>Kész</button>
            </div>
          </>
        );
      })()}

      {detailCourse && details && (() => {
        const c = data.cohorts[details.ci];
        const x = detailCourse;
        return (
          <>
            <div className="drawer-scrim" onClick={() => setDetails(null)} />
            <aside className="drawer">
              <div className="dr-top">
                <div className="dr-eyebrow">{c.program} · {semLabel(c.semester)} · {x.type}</div>
                <h2 className="dr-name">{x.name}</h2>
                {x.specialization && <div className="dr-spec">{x.specialization}</div>}
                <div className="dr-actrow">
                  <button className="btn btn--ink dr-edit-top" onClick={() => { setEditor({ ci: details.ci, xi: details.xi }); setDetails(null); }}>✎ Szerkesztés</button>
                  <button className="btn" onClick={() => setDetails(null)}>✕ Bezárás</button>
                </div>
              </div>
              <div className="dr-scroll">
              {catList(x).length > 0 && (
                <div className="dr-chips dr-cats">
                  {catList(x).map((k) => (
                    <button key={k} className={`dr-chip cat${cat === k ? ' is-on' : ''}`} title={`Szűrés kategóriára: ${k}`} onClick={() => onCategory(k)}>{k}</button>
                  ))}
                </div>
              )}
              <div className="dr-stats">
                <div><b>{x.courseType}</b><span>forma</span></div>
                <div><b>{x.hours ?? '–'}</b><span>óra/hét</span></div>
                <div><b>{x.credits ?? '–'}</b><span>kredit</span></div>
                <div><b>{x.active ?? '–'}</b><span>fő</span></div>
                <div><b>{x.groups || '–'}</b><span>csoport</span></div>
                <div><b>{x.institute}</b><span>intézet</span></div>
              </div>
              {x.felelos && <div className="dr-field"><h4>Felelős</h4><p>{canonName(x.felelos)}</p></div>}
              <div className="dr-field"><h4>Oktató</h4><p className={x.instructors ? '' : 'none'}>{x.instructors ? instrList(x).map(canonName).join(', ') : 'még nincs megadva'}</p></div>
              {(x.demonstrators ?? []).length > 0 && <div className="dr-field"><h4>Hallgatói demonstrátor</h4><p>{(x.demonstrators ?? []).map(canonName).join(', ')}</p></div>}
              {x.cel && <div className="dr-field"><h4>A tárgy célja</h4><p>{x.cel}</p></div>}
              <div className="dr-field"><h4>Összegzés</h4><p className={x.description ? '' : 'none'}>{x.description || 'még nincs megadva'}</p></div>
              {x.software.length > 0 && <div className="dr-field"><h4>Szoftverek</h4><div className="dr-chips">{x.software.map((s) => <span key={s} className="dr-chip sw">{s}</span>)}</div></div>}
              {x.keywords.length > 0 && <div className="dr-field"><h4>Kulcsszavak</h4><div className="dr-chips">{x.keywords.map((k) => <span key={k} className="dr-chip">{k}</span>)}</div></div>}
              {x.prerequisite && <div className="dr-field"><h4>Előfeltétel</h4><p>{x.prerequisite}</p></div>}
              {x.requirement && <div className="dr-field"><h4>Követelmény</h4><p>{x.requirement}</p></div>}
              {x.note && <div className="dr-field"><h4>Megjegyzés</h4><p>{x.note}</p></div>}
              {x.pdfUrl && <a className="btn dr-pdf" href={x.pdfUrl} target="_blank" rel="noopener noreferrer">📄 Hivatalos tantárgyi leírás (PDF) ↗</a>}
              </div>
              <div className="dr-foot">
                <button className="btn" onClick={() => setDetails(null)}>✕ Bezárás</button>
                <button className="btn btn--ink dr-edit" onClick={() => { setEditor({ ci: details.ci, xi: details.xi }); setDetails(null); }}>✎ Szerkesztés</button>
              </div>
            </aside>
          </>
        );
      })()}

      {/* feladat/esemény részletező - a tömör kártyákról ide nyílik minden részlet */}
      {agendaDetails && (
        <AgendaDrawer
          det={agendaDetails}
          agenda={agenda}
          letters={(agenda.letters || []).filter((l) => l.targetId === agendaDetails.id)}
          kindOf={kindOf}
          canEdit={canEdit}
          emailFor={(n) => emailOf(peopleDB, n)}
          onClose={() => setAgendaDetails(null)}
          onEdit={() => {
            const d = agendaDetails;
            setAgendaDetails(null);
            if (!canEditRef.current || !d) return;
            if (d.kind === 'task') { const t = agendaRef.current.tasks.find((x) => x.id === d.id); if (t) setTaskEdit({ t, isNew: false }); }
            else { const e = agendaRef.current.events.find((x) => x.id === d.id); if (e) setEventEdit({ e, isNew: false }); }
          }}
          onOpenTask={(id) => setAgendaDetails({ kind: 'task', id })}
          onOpenEvent={(id) => setAgendaDetails({ kind: 'event', id })}
          onToggleStep={toggleStep}
          onLinkEvent={linkTaskEvent}
          onSetDue={setTaskDue}
          onPerson={(n) => { setAgendaDetails(null); onInstructor(n); }}
          onNotify={() => { if (agendaDetails.kind === 'task') notifyTask(agendaDetails.id); else notifyEvent(agendaDetails.id); }}
          onPosta={() => { const d = agendaDetails; setAgendaDetails(null); if (d) openPostaForCard(d.kind, d.id); }}
          onOpenLetter={openSavedLetter}
          onAddTaskFor={(eid) => { setAgendaDetails(null); addTaskForEvent(eid); }}
          onCreateMeet={createMeetForEvent}
          onConfirmMeet={confirmMeet}
          onInviteLetter={(eid) => { void inviteLetterForEvent(eid); }}
          onOutcome={(tid, text, close) => { void recordOutcome(tid, text, close); }}
          onTaskStatus={setTaskStatus}
          onSetStar={setTaskStar}
          onAddEventFor={(tid) => { setAgendaDetails(null); addEventForTask(tid); }}
          onIdopont={(tid) => {
            const t = agendaRef.current.tasks.find((x) => x.id === tid);
            if (!t) return;
            setAgendaDetails(null);
            // KÁRTYÁRÓL nyitva CSAK a címzettek jönnek át - a téma/tartalom ÜRES, te diktálod
            // (2026-07-22 tanulság: a kártya belső jegyzetei kéretlenül a meghívóba folytak)
            setIdopont({
              taskId: tid, topic: '', linkedTitle: t.title,
              names: [t.owner, ...t.people].filter((n): n is string => !!n && n !== DEFAULT_OWNER),
              emails: t.source?.email ? [t.source.email, ...(t.source.cc ?? [])] : [],
            });
          }}
          onConfirmMeetSlot={confirmMeetSlot}
          onDelete={() => {
            const d = agendaDetails;
            if (!d || !canEditRef.current) return;
            if (!confirm(d.kind === 'task' ? 'Törlöd ezt a feladatot?' : 'Törlöd ezt az eseményt?')) return;
            if (d.kind === 'task') deleteTask(d.id); else deleteEvent(d.id);
            setAgendaDetails(null);
          }}
          meetMsg={meetMsg}
        />
      )}

      {editor && (() => {
        const isNew = editor.xi < 0;
        const c = data.cohorts[editor.ci];
        const course = isNew ? emptyCourse() : c.courses[editor.xi];
        return (
          <EditModal
            course={course}
            cohortLabel={`Média Design ${c.program} · ${semLabel(c.semester)}`}
            isNew={isNew}
            teacherNames={teacherNames}
            students={peopleDB.students.map((s) => s.name)}
            onSave={(nc) => { saveCourse(editor, nc); setEditor(null); }}
            onDelete={() => { if (confirm('Törlöd ezt a tárgyat?')) { deleteCourse(editor.ci, editor.xi); setEditor(null); } }}
            onClose={() => setEditor(null)}
          />
        );
      })()}

      {taskEdit && (
        <TaskModal
          task={taskEdit.t}
          isNew={taskEdit.isNew}
          events={agenda.events.map((e) => ({ id: e.id, title: e.title }))}
          roster={roster}
          rosterGroups={rosterGroups}
          letters={(agenda.letters || []).filter((l) => l.targetType === 'task' && l.targetId === taskEdit.t.id)}
          onSave={saveTask}
          onDelete={() => { if (confirm('Törlöd ezt a feladatot?')) deleteTask(taskEdit.t.id); }}
          onNotify={() => notifyTask(taskEdit.t.id)}
          onAddEvent={() => addEventForTask(taskEdit.t.id)}
          onOpenLetter={openSavedLetter}
          onLetterStatus={setLetterStatus}
          onNotifyTopic={(tid) => notifyTask(taskEdit.t.id, tid)}
          onClose={() => setTaskEdit(null)}
        />
      )}

      {eventEdit && (
        <EventModal
          event={eventEdit.e}
          isNew={eventEdit.isNew}
          roster={roster}
          rosterGroups={rosterGroups}
          tasks={agenda.tasks.filter((t) => t.eventId === eventEdit.e.id)}
          letters={(agenda.letters || []).filter((l) => l.targetType === 'event' && l.targetId === eventEdit.e.id)}
          onSave={saveEvent}
          onDelete={() => { if (confirm('Törlöd ezt az eseményt?')) deleteEvent(eventEdit.e.id); }}
          onNotify={() => notifyEvent(eventEdit.e.id)}
          onOpenTask={(id) => { const t = agendaRef.current.tasks.find((x) => x.id === id); if (t) setTaskEdit({ t, isNew: false }); }}
          onAddTask={() => addTaskForEvent(eventEdit.e.id)}
          onOpenLetter={openSavedLetter}
          onLetterStatus={setLetterStatus}
          onNotifyTopic={(tid) => notifyEvent(eventEdit.e.id, tid)}
          onClose={() => { setEventEdit(null); pendingTaskLink.current = null; }}
        />
      )}

      {introEdit && <IntroModal intro={agenda.intro} onSave={saveIntro} onClose={() => setIntroEdit(false)} />}

      {reportMonth && <MonthReport monthKey={reportMonth} agenda={agenda} onClose={() => setReportMonth(null)} onSaveLetter={saveLetter} />}

      {idopont && (
        <IdopontModal seed={idopont} db={peopleDB} teacherNames={teacherNames}
          tasks={agenda.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))}
          onLinkTaskEvent={linkTaskEvent}
          onSaveEvent={saveEvent} onSaveTask={saveTask} onSaveLetter={saveLetter} onBusy={setTitkarBusy}
          onClose={() => setIdopont(null)}
          onDone={(jump) => { setIdopont(null); if (jump) { setPostaFocus(null); setPostaTab('lista'); setView('posta'); } }} />
      )}


      {/* A régi teljes képernyős levelező-modál MEGSZŰNT (2026-07-22): minden levél-út a
          Postázó hubba fut (fly-in panel), telefonon is - ott a szerkesztő van felül. */}

      {loadOpen && (
        <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) setLoadOpen(false); }}>
          <div className="modal">
            <h3>⤒ Betöltés - mentett pillanatképek</h3>
            <div className="pm-body">
              {snaps === null && <div className="pm-note">Pillanatképek betöltése…</div>}
              {snaps && snaps.length === 0 && <div className="pm-note">Még nincs szerveren tárolt pillanatkép. A ⤓ Mentés mostantól minden alkalommal eltesz ide egy időbélyeges teljes mentést.</div>}
              {snaps && snaps.length > 0 && (
                <>
                  <button className="btn btn--ink snap-latest" onClick={() => restoreSnap(snaps[0].name)}
                    title="A perc szerint legutolsó mentés visszaállítása">
                    ⤒ Legutóbbi visszaállítása · {new Date(snaps[0].mtime).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })}
                  </button>
                  <div className="snap-list">
                    {snaps.map((s) => (
                      <button key={s.name} className="snap-row" onClick={() => restoreSnap(s.name)} title="Visszaállítás erre az állapotra">
                        <span className="s">{new Date(s.mtime).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span className="d">{s.name} · {(s.size / 1024).toFixed(0)} kB</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="pm-note">Vagy tölts be korábban letöltött mentés-fájlt a gépről:</div>
              <button className="btn" onClick={() => fileRef.current?.click()}>📁 Fájl kiválasztása…</button>
            </div>
            <div className="mfoot"><span className="sp" /><button className="btn" onClick={() => setLoadOpen(false)}>Bezárás</button></div>
          </div>
        </div>
      )}

      {hydrated && edited && <div style={{ position: 'fixed', bottom: 8, left: 12, fontSize: '.7rem', color: 'var(--muted)', pointerEvents: 'none', zIndex: 5 }}>helyi módosítások mentve</div>}
      {!canEdit && <div className="viewer-badge" title="Bemutató mód: az adatok védettek, szerkesztéshez a ?admin=<kulcs> címmel lépj be">👁 Bemutató mód</div>}
    </>
  );
}
