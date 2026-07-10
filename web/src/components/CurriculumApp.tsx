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
import { EventModal, IntroModal, TaskModal } from './AgendaModals';
import { Agenda, AgendaEvent, AgendaTask, DEFAULT_AGENDA, Letter, agendaPeople, emptyEvent, emptyTask, nextPriority, normalizeAgenda } from '@/data/agenda';
import { DEFAULT_PEOPLE, PeopleDB, PersonKind, buildRoster, normalizePeople } from '@/data/people';
import PeopleModal from './PeopleModal';
import NotifyModal, { NotifyTarget } from './NotifyModal';
import type { Handlers, Filter, View, Prog } from '@/lib/buildGraph';
import { instrList } from '@/lib/buildGraph';
import type { Persist } from './MapView';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div style={{ height: 'calc(100vh - 132px)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontWeight: 700 }}>Térkép betöltése…</div>,
});

const LS_KEY = 'mediadesign-2026-27-v9';
const AGENDA_LS_KEY = 'md-agenda-v1';
const PEOPLE_LS_KEY = 'md-people-v1';
const THEME_KEY = 'md-theme';
const PRESET_KEY = 'md-preset';
type Preset = 'neue' | 'tordeles' | 'muszerfal' | 'muterem';
const PRESETS: { id: Preset; label: string }[] = [
  { id: 'muszerfal', label: 'Műszerfal — modern app' },
  { id: 'neue', label: 'Neue Papír — svájci' },
  { id: 'tordeles', label: 'Tördelés — editorial' },
  { id: 'muterem', label: 'Műterem — meleg' },
];

interface Ref2 { ci: number; xi: number; }

export default function CurriculumApp() {
  const [data, setData] = useState<Curriculum>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [edited, setEdited] = useState(false);

  const [view, setView] = useState<'map' | 'catalog' | 'tasks' | 'events'>('map');
  const [agenda, setAgenda] = useState<Agenda>(DEFAULT_AGENDA);
  const [peopleDB, setPeopleDB] = useState<PeopleDB>(DEFAULT_PEOPLE);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // ideiglenesen: mindig sötét téma az alap
  const [preset, setPreset] = useState<Preset>('muszerfal');
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
  const [introEdit, setIntroEdit] = useState(false);
  const [peopleEdit, setPeopleEdit] = useState(false);
  const [notify, setNotify] = useState<NotifyTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      let loaded = false;
      // 1) a mintatanterv-fájl a forrás — ezt töltjük be elsőként (helyi API-n át)
      try {
        const r = await fetch('/api/curriculum', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok && j.data?.cohorts) { setData(j.data as Curriculum); setEdited(true); loaded = true; }
      } catch { /* ignore */ }
      // 2) fallback: helyi vázlat (localStorage), majd a beépített DEFAULT_DATA
      if (!loaded) {
        try { const s = localStorage.getItem(LS_KEY); if (s) { setData(JSON.parse(s) as Curriculum); setEdited(true); } } catch { /* ignore */ }
      }
      // feladatok + események ugyanígy: fájl → localStorage → beépített DEFAULT_AGENDA
      let agendaLoaded = false;
      try {
        const r = await fetch('/api/agenda', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok && j.data?.tasks) { setAgenda(normalizeAgenda(j.data as Partial<Agenda>)); agendaLoaded = true; }
      } catch { /* ignore */ }
      if (!agendaLoaded) {
        try { const s = localStorage.getItem(AGENDA_LS_KEY); if (s) setAgenda(normalizeAgenda(JSON.parse(s) as Partial<Agenda>)); } catch { /* ignore */ }
      }
      // személyi törzs (hallgatólista + elérhetőségek) — a tanárnevek forrása maga a tanterv
      let peopleLoaded = false;
      try {
        const r = await fetch('/api/people', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok && j.data) { setPeopleDB(normalizePeople(j.data as Partial<PeopleDB>)); peopleLoaded = true; }
      } catch { /* ignore */ }
      if (!peopleLoaded) {
        try { const s = localStorage.getItem(PEOPLE_LS_KEY); if (s) setPeopleDB(normalizePeople(JSON.parse(s) as Partial<PeopleDB>)); } catch { /* ignore */ }
      }
      try {
        // ideiglenes: mindig sötét témával indulunk (a mentett 'light' beállítást nem töltjük vissza;
        // a témaváltó gomb továbbra is működik a munkameneten belül)
        const t = localStorage.getItem(THEME_KEY); if (t === 'dark') setTheme(t);
        const p = localStorage.getItem(PRESET_KEY) as Preset | null;
        if (p && PRESETS.some((x) => x.id === p)) setPreset(p);
        // elrendezés-zárolás: mindig zárva indul (betöltéskor/frissítéskor) a véletlen
        // mozgatás ellen — a mentett értéket szándékosan NEM olvassuk vissza.
      } catch { /* ignore */ }
      setHydrated(true);
    })();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.preset = preset;
    try { localStorage.setItem(PRESET_KEY, preset); } catch { /* ignore */ }
  }, [preset]);
  // ha nem a mátrixon vagyunk, az elrendezés-zárolás azonnal bekapcsol (véletlen mozgatás ellen)
  useEffect(() => {
    if (view !== 'map') setLocked(true);
  }, [view]);
  // program-váltáskor (BA / MA / BA+MA) is zárolunk — ilyenkor a mátrix újraigazít, ne lehessen véletlenül mozgatni
  useEffect(() => {
    setLocked(true);
  }, [prog]);

  const dataRef = useRef(data);
  dataRef.current = data;
  // automentés a mintatanterv-fájlba (helyi API, debounce) — a betöltött állapotot nem írjuk vissza
  const saveTimer = useRef<number | null>(null);
  const skipFileSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipFileSave.current) { skipFileSave.current = false; return; }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataRef.current) }).catch(() => { /* ignore */ });
    }, 1000);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [data, hydrated]);
  // feladatok + események: automentés a saját fájlba (ugyanaz a minta, mint a tantervnél)
  const agendaRef = useRef(agenda);
  agendaRef.current = agenda;
  const agendaTimer = useRef<number | null>(null);
  const skipAgendaSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipAgendaSave.current) { skipAgendaSave.current = false; return; }
    if (agendaTimer.current) window.clearTimeout(agendaTimer.current);
    agendaTimer.current = window.setTimeout(() => {
      fetch('/api/agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agendaRef.current) }).catch(() => { /* ignore */ });
    }, 1000);
    return () => { if (agendaTimer.current) window.clearTimeout(agendaTimer.current); };
  }, [agenda, hydrated]);
  const commitAgenda = useCallback((next: Agenda) => {
    setAgenda(next);
    try { localStorage.setItem(AGENDA_LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);
  const saveTask = useCallback((t: AgendaTask) => {
    const cur = agendaRef.current;
    const exists = cur.tasks.some((x) => x.id === t.id);
    commitAgenda({ ...cur, tasks: exists ? cur.tasks.map((x) => (x.id === t.id ? t : x)) : [t, ...cur.tasks] });
    setTaskEdit(null);
  }, [commitAgenda]);
  const deleteTask = useCallback((id: string) => {
    commitAgenda({ ...agendaRef.current, tasks: agendaRef.current.tasks.filter((x) => x.id !== id) });
    setTaskEdit(null);
  }, [commitAgenda]);
  const toggleDone = useCallback((id: string) => {
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, status: x.status === 'done' ? 'todo' : 'done' } : x)) });
  }, [commitAgenda]);
  const toggleDoing = useCallback((id: string) => {
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, status: x.status === 'doing' ? 'todo' : 'doing' } : x)) });
  }, [commitAgenda]);
  const cyclePriority = useCallback((id: string) => {
    const cur = agendaRef.current;
    commitAgenda({ ...cur, tasks: cur.tasks.map((x) => (x.id === id ? { ...x, priority: nextPriority(x.priority) } : x)) });
  }, [commitAgenda]);
  const saveEvent = useCallback((e: AgendaEvent) => {
    const cur = agendaRef.current;
    const exists = cur.events.some((x) => x.id === e.id);
    commitAgenda({ ...cur, events: exists ? cur.events.map((x) => (x.id === e.id ? e : x)) : [...cur.events, e] });
    setEventEdit(null);
  }, [commitAgenda]);
  const deleteEvent = useCallback((id: string) => {
    const cur = agendaRef.current;
    // a törölt eseményre mutató feladat-hivatkozásokat is leválasztjuk
    commitAgenda({
      ...cur,
      events: cur.events.filter((x) => x.id !== id),
      tasks: cur.tasks.map((t) => (t.eventId === id ? { ...t, eventId: null } : t)),
    });
    setEventEdit(null);
  }, [commitAgenda]);
  const saveIntro = useCallback((s: string) => {
    commitAgenda({ ...agendaRef.current, intro: s });
    setIntroEdit(false);
  }, [commitAgenda]);
  // személyi törzs mentése — ugyanaz a minta (fájl + localStorage), 1s debounce
  const peopleRef = useRef(peopleDB);
  peopleRef.current = peopleDB;
  const peopleTimer = useRef<number | null>(null);
  const skipPeopleSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipPeopleSave.current) { skipPeopleSave.current = false; return; }
    if (peopleTimer.current) window.clearTimeout(peopleTimer.current);
    peopleTimer.current = window.setTimeout(() => {
      fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(peopleRef.current) }).catch(() => { /* ignore */ });
    }, 1000);
    return () => { if (peopleTimer.current) window.clearTimeout(peopleTimer.current); };
  }, [peopleDB, hydrated]);
  const savePeople = useCallback((db: PeopleDB) => {
    setPeopleDB(db);
    try { localStorage.setItem(PEOPLE_LS_KEY, JSON.stringify(db)); } catch { /* ignore */ }
    setPeopleEdit(false);
  }, []);
  // Levél-készítő megnyitása egy feladatból / eseményből — a sablon-szöveget a modál generálja
  const notifyTask = useCallback((id: string) => {
    const t = agendaRef.current.tasks.find((x) => x.id === id);
    if (!t) return;
    setNotify({ targetType: 'task', targetId: t.id, task: t, event: null, names: [t.owner, ...t.people].filter((n): n is string => !!n), steps: t.ideas.filter(Boolean), source: t.source ?? null });
  }, []);
  const notifyEvent = useCallback((id: string) => {
    const e = agendaRef.current.events.find((x) => x.id === id);
    if (!e) return;
    // az eseményhez kötött feladatok lépései is választhatók a levélbe
    const steps = agendaRef.current.tasks.filter((t) => t.eventId === e.id).flatMap((t) => t.ideas).filter(Boolean);
    setNotify({ targetType: 'event', targetId: e.id, event: e, task: null, names: [e.owner, ...e.people].filter((n): n is string => !!n), steps, source: e.source ?? null });
  }, []);
  // mentett levelek kezelése (a levelek az agenda részei, az automentés viszi fájlba)
  const saveLetter = useCallback((l: Letter) => {
    const cur = agendaRef.current;
    commitAgenda({ ...cur, letters: [l, ...(cur.letters || [])] });
  }, [commitAgenda]);
  const deleteLetter = useCallback((id: string) => {
    const cur = agendaRef.current;
    commitAgenda({ ...cur, letters: (cur.letters || []).filter((x) => x.id !== id) });
  }, [commitAgenda]);

  const histRef = useRef<Curriculum[]>([]);
  const futRef = useRef<Curriculum[]>([]);
  const persistLS = (d: Curriculum) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch { /* ignore */ } };
  const commit = useCallback((next: Curriculum) => {
    histRef.current = [...histRef.current, dataRef.current].slice(-100);
    futRef.current = [];
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
  const exportJSON = () => {
    const post = (url: string, body: unknown) =>
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => { /* ignore */ });
    post('/api/curriculum', dataRef.current);
    post('/api/agenda', agendaRef.current);
    post('/api/people', peopleRef.current);
    const payload = {
      kind: 'metumatrix-backup',
      savedAt: new Date().toISOString(),
      curriculum: dataRef.current,
      agenda: agendaRef.current,
      people: peopleRef.current,
    };
    const b = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `metumatrix-mentes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  interface BackupFile { kind?: string; savedAt?: string; curriculum?: Curriculum; agenda?: Partial<Agenda>; people?: Partial<PeopleDB>; cohorts?: unknown; tasks?: unknown; }
  const importJSON = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result)) as BackupFile;
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
            try { localStorage.setItem(PEOPLE_LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
          }
        } else if (Array.isArray(d.cohorts)) {
          // régi formátum: csak tanterv
          commit(d as unknown as Curriculum);
        } else if (Array.isArray(d.tasks)) {
          // csak feladatok+események mentés
          const a = normalizeAgenda(d as Partial<Agenda>);
          setAgenda(a);
          try { localStorage.setItem(AGENDA_LS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
        } else {
          throw new Error('bad');
        }
      } catch { alert('Hibás vagy ismeretlen JSON fájl.'); }
    };
    r.readAsText(file);
  };

  const onEdit = useCallback((ci: number, xi: number) => setEditor({ ci, xi }), []);
  const onDetails = useCallback((ci: number, xi: number) => setDetails({ ci, xi }), []);
  const onAdd = useCallback((ci: number) => setEditor({ ci, xi: -1 }), []);
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
  // a zárolás munkamenetre szól — nem mentjük, hogy frissítéskor mindig zárva induljon
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
  // állandó választólista: tantervi tanárok + hallgatók (personDB) — T/H badge-dzsel
  const roster = useMemo(() => buildRoster(teacherNames, peopleDB), [teacherNames, peopleDB]);
  const kindOf = useMemo(() => {
    const m: Record<string, PersonKind> = {};
    roster.forEach((r) => { if (!m[r.name]) m[r.name] = r.kind; });
    return m;
  }, [roster]);
  // a feladat/esemény nézet név-szűrőjéhez: az állandó lista + a feladatokban maradt régi nevek
  const allPeople = useMemo(() => {
    const s = new Set<string>(roster.map((r) => r.name));
    agendaPeople(agenda).forEach((n) => s.add(n));
    return [...s].sort((a, b) => a.localeCompare(b, 'hu'));
  }, [roster, agenda]);
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
  // tanterv-nézetben (mátrix/katalógus) látszanak a tantervi szűrők és a mentés/betöltés — a feladat/esemény nézetben nem
  const isCurr = view === 'map' || view === 'catalog';

  return (
    <>
      <div className="app-shell">
      <header className="masthead">
        <div className="wrap">
          <div className="brandmark">
            <div className="logo">M</div>
            <div>
              <div className="kicker">METU · Animáció és Média Design Tanszék <span className="kicker-name">Dr. Balogh Áron</span></div>
              <h1 className="title">Média Design {prog === 'ALL' ? 'BA + MA' : prog} · {ver === 'régi (korábbi)' ? 'régi mintatanterv' : ver}</h1>
              <div className="subtitle">Tanulmányi mátrix — ahogy a félévek és a tárgyak egymásra épülnek · kösd össze, szerkeszd, mentsd</div>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="wrap toolbar__inner">
          <div className="viewtoggle">
            <button className={view === 'map' ? 'is-on' : ''} onClick={() => setView('map')}>◆ Mátrix</button>
            <button className={view === 'catalog' ? 'is-on' : ''} onClick={() => setView('catalog')}>▦ Katalógus</button>
            <button className={view === 'tasks' ? 'is-on' : ''} onClick={() => setView('tasks')}>☑ Feladatok</button>
            <button className={view === 'events' ? 'is-on' : ''} onClick={() => setView('events')}>▤ Események</button>
          </div>
          {isCurr && (
          <div className="viewtoggle">
            <button className={prog === 'BA' ? 'is-on' : ''} onClick={() => setProg('BA')}>BA</button>
            <button className={prog === 'MA' ? 'is-on' : ''} onClick={() => setProg('MA')}>MA</button>
            <button className={prog === 'ALL' ? 'is-on' : ''} onClick={() => setProg('ALL')} title="BA és MA egyszerre, egymás alatt">BA+MA</button>
          </div>
          )}
          <button
            className={`btn tools-toggle${q || spec || ctype || instr || cat ? ' has-f' : ''}`}
            onClick={() => setToolsOpen((o) => !o)}
            title="Szűrők és eszközök"
          >{toolsOpen ? '✕' : '☰'}{(q || spec || ctype || instr || cat) && !toolsOpen ? ' •' : ''}</button>
          <div className={`toolbar-more${toolsOpen ? ' open' : ''}`}>
          {isCurr && (
          <select className="presetsel" value={ver} onChange={(e) => setVer(e.target.value)} title="Tanterv-verzió">
            {versions.map((v) => <option key={v} value={v}>{v === 'régi (korábbi)' ? 'Régi (korábbi)' : v}</option>)}
          </select>
          )}
          <input className="search" placeholder={isCurr ? 'Keresés tárgyra, oktatóra…' : 'Keresés…'} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`presetsel instrsel${instr ? ' is-on' : ''}`} value={instr} onChange={(e) => setInstr(e.target.value)} title="Szűrés névre — tanterv, feladatok és események is erre szűrődnek">
            <option value="">{isCurr ? 'Minden oktató' : 'Mindenki'}</option>
            {(isCurr ? allInstructors : allPeople).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {!isCurr && <button className="btn" onClick={() => setPeopleEdit(true)} title="Tanár-elérhetőségek és hallgatólista — email, telefon">☎ Névjegyzék</button>}
          {isCurr && (
          <>
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
          <select className="presetsel" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} title="Betűtípus / stílus">
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button className="themebtn" title="Világos / sötét mód" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>{theme === 'dark' ? '☀' : '☾'}</button>
          <button className="btn" onClick={exportJSON} title="Minden adat mentése: tanterv + feladatok + események + névjegyzék — fájlba írás és közös biztonsági másolat letöltése">⤓ Mentés</button>
          <button className="btn" onClick={() => fileRef.current?.click()} title="Mentés visszatöltése (közös mentés vagy régi tanterv-fájl)">⤒ Betöltés</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
          {isCurr && (
          <button className="btn btn--danger" onClick={resetData} title="CSAK a tantervet állítja alaphelyzetbe — előtte készíts mentést!">↺ Alaphelyzet</button>
          )}
          </div>
        </div>
      </div>

        <div className="viewport">
          {/* A Mátrix mindig mountolva marad (csak elrejtjük), hogy nézetváltáskor a zoom/pásztázás
              megőrződjön és ne igazítson újra — csak betöltéskor / ver-prog váltáskor illesztünk. */}
          <div className="view-pane" style={{ display: view === 'map' ? 'block' : 'none' }}>
            <MapView data={data} filter={filter} handlers={mapHandlers} persist={persist} theme={theme} view={vp} locked={locked} onToggleLock={toggleLock} active={view === 'map'} focusId={details ? `c-${details.ci}-${details.xi}` : null} />
          </div>
          {view === 'catalog' ? (
            <CatalogView data={data} filter={filter} view={vp} onDetails={onDetails} onEdit={onEdit} onAdd={onAdd} onInstructor={onInstructor} onCategory={onCategory} onCatEdit={onCatEdit} />
          ) : view === 'tasks' ? (
            <AgendaView
              agenda={agenda} q={q} instr={instr} taught={taught} kindOf={kindOf}
              onAdd={() => setTaskEdit({ t: emptyTask(), isNew: true })}
              onEdit={(id) => { const t = agendaRef.current.tasks.find((x) => x.id === id); if (t) setTaskEdit({ t, isNew: false }); }}
              onEditIntro={() => setIntroEdit(true)}
              onPerson={onInstructor}
              onNotify={notifyTask}
              onToggleDone={toggleDone}
              onToggleDoing={toggleDoing}
              onCyclePriority={cyclePriority}
            />
          ) : view === 'events' ? (
            <EventsView
              agenda={agenda} q={q} instr={instr} kindOf={kindOf}
              onAdd={() => setEventEdit({ e: emptyEvent(), isNew: true })}
              onEdit={(id) => { const e = agendaRef.current.events.find((x) => x.id === id); if (e) setEventEdit({ e, isNew: false }); }}
              onEditTask={(id) => { const t = agendaRef.current.tasks.find((x) => x.id === id); if (t) setTaskEdit({ t, isNew: false }); }}
              onAddTaskFor={(eid) => {
                // az eseményből nyitott feladat MINDENT örököl — ne kelljen kétszer beírni ugyanazt
                const e = agendaRef.current.events.find((x) => x.id === eid);
                setTaskEdit({
                  t: {
                    ...emptyTask(),
                    eventId: eid,
                    owner: e?.owner ?? emptyTask().owner,
                    people: e ? [...e.people] : [],
                    dueDate: e?.day ?? null,
                    due: e?.when ?? null,
                    title: e ? `${e.title} — előkészítés` : '',
                  },
                  isNew: true,
                });
              }}
              onPerson={onInstructor}
              onNotify={notifyEvent}
            />
          ) : null}
        </div>
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
              <div className="cat-menu-h">{course.name} — kategóriák</div>
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
                <button className="drawer-x" onClick={() => setDetails(null)}>✕</button>
                <div className="dr-eyebrow">{c.program} · {semLabel(c.semester)} · {x.type}</div>
                <h2 className="dr-name">{x.name}</h2>
                {x.specialization && <div className="dr-spec">{x.specialization}</div>}
                <button className="btn btn--ink dr-edit-top" onClick={() => { setEditor({ ci: details.ci, xi: details.xi }); setDetails(null); }}>✎ Szerkesztés</button>
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
              {x.felelos && <div className="dr-field"><h4>Felelős</h4><p>{x.felelos}</p></div>}
              <div className="dr-field"><h4>Oktató</h4><p className={x.instructors ? '' : 'none'}>{x.instructors || 'még nincs megadva'}</p></div>
              {(x.demonstrators ?? []).length > 0 && <div className="dr-field"><h4>Hallgatói demonstrátor</h4><p>{(x.demonstrators ?? []).join(', ')}</p></div>}
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
                <button className="btn btn--ink dr-edit" onClick={() => { setEditor({ ci: details.ci, xi: details.xi }); setDetails(null); }}>✎ Szerkesztés</button>
              </div>
            </aside>
          </>
        );
      })()}

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
          onSave={saveTask}
          onDelete={() => { if (confirm('Törlöd ezt a feladatot?')) deleteTask(taskEdit.t.id); }}
          onClose={() => setTaskEdit(null)}
        />
      )}

      {eventEdit && (
        <EventModal
          event={eventEdit.e}
          isNew={eventEdit.isNew}
          roster={roster}
          onSave={saveEvent}
          onDelete={() => { if (confirm('Törlöd ezt az eseményt?')) deleteEvent(eventEdit.e.id); }}
          onClose={() => setEventEdit(null)}
        />
      )}

      {introEdit && <IntroModal intro={agenda.intro} onSave={saveIntro} onClose={() => setIntroEdit(false)} />}

      {peopleEdit && <PeopleModal teacherNames={teacherNames} db={peopleDB} onSave={savePeople} onClose={() => setPeopleEdit(false)} />}

      {notify && (
        <NotifyModal
          target={notify}
          teacherNames={teacherNames}
          db={peopleDB}
          letters={(agenda.letters || []).filter((l) => l.targetId === notify.targetId)}
          onSaveLetter={saveLetter}
          onDeleteLetter={deleteLetter}
          onPlaceChange={notify.targetType === 'event' && notify.targetId ? (p: string) => {
            const cur = agendaRef.current;
            commitAgenda({ ...cur, events: cur.events.map((ev) => (ev.id === notify.targetId ? { ...ev, place: p.trim() || null } : ev)) });
          } : undefined}
          onSourceChange={notify.targetId ? (s) => {
            const cur = agendaRef.current;
            if (notify.targetType === 'task') commitAgenda({ ...cur, tasks: cur.tasks.map((t) => (t.id === notify.targetId ? { ...t, source: s } : t)) });
            else if (notify.targetType === 'event') commitAgenda({ ...cur, events: cur.events.map((ev) => (ev.id === notify.targetId ? { ...ev, source: s } : ev)) });
          } : undefined}
          onClose={() => setNotify(null)}
        />
      )}

      {hydrated && edited && <div style={{ position: 'fixed', bottom: 8, left: 12, fontSize: '.7rem', color: 'var(--muted)', pointerEvents: 'none', zIndex: 5 }}>helyi módosítások mentve</div>}
    </>
  );
}
