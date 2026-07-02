'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  CATEGORIES, Cohort, Course, Curriculum, DEFAULT_DATA, UserEdge, VERSION_ORDER, catList, emptyCourse, semLabel, specShort,
} from '@/data/curriculum';
import CatalogView from './CatalogView';
import EditModal from './EditModal';
import type { Handlers, Filter, View } from '@/lib/buildGraph';
import type { Persist } from './MapView';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div style={{ height: 'calc(100vh - 132px)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontWeight: 700 }}>Térkép betöltése…</div>,
});

const LS_KEY = 'mediadesign-2026-27-v9';
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

  const [view, setView] = useState<'map' | 'catalog'>('map');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [preset, setPreset] = useState<Preset>('muszerfal');
  const [ver, setVer] = useState<string>('2026/2027');
  const [prog, setProg] = useState<'BA' | 'MA'>('BA');
  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('');
  const [ctype, setCtype] = useState('');
  const [instr, setInstr] = useState('');
  const [cat, setCat] = useState('');
  const [editor, setEditor] = useState<Ref2 | null>(null);
  const [details, setDetails] = useState<Ref2 | null>(null);
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
      try {
        const t = localStorage.getItem(THEME_KEY); if (t === 'dark' || t === 'light') setTheme(t);
        const p = localStorage.getItem(PRESET_KEY) as Preset | null;
        if (p && PRESETS.some((x) => x.id === p)) setPreset(p);
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

  // Elrendezés (node-pozíciók + kézi összekötések) átvétele egy másik verzióból az aktuálisba,
  // tárgynév + félév + program alapján párosítva.
  const copyLayout = (sourceVer: string) => {
    if (!sourceVer || sourceVer === ver) return;
    const cur = dataRef.current;
    const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const idToKey: Record<string, string> = {};
    const keyToTarget: Record<string, string> = {};
    cur.cohorts.forEach((c, ci) => {
      const semKey = `sem|${c.program}|${c.semester}`;
      if (c.version === sourceVer) idToKey[`sem-${ci}`] = semKey;
      if (c.version === ver) keyToTarget[semKey] = `sem-${ci}`;
      c.courses.forEach((x, xi) => {
        const key = `crs|${c.program}|${c.semester}|${norm(x.name)}`;
        if (c.version === sourceVer) idToKey[`c-${ci}-${xi}`] = key;
        if (c.version === ver) keyToTarget[key] = `c-${ci}-${xi}`;
      });
    });
    const srcPos = cur.positions || {};
    const positions = { ...srcPos };
    let moved = 0;
    Object.entries(idToKey).forEach(([srcId, key]) => {
      const tgtId = keyToTarget[key];
      if (tgtId && srcPos[srcId]) { positions[tgtId] = { ...srcPos[srcId] }; moved++; }
    });
    const edges = [...(cur.userEdges || [])];
    let linked = 0;
    (cur.userEdges || []).forEach((e) => {
      const sk = idToKey[e.source], tk = idToKey[e.target];
      if (!sk || !tk) return;
      const ns = keyToTarget[sk], nt = keyToTarget[tk];
      if (!ns || !nt) return;
      const id = `u-${ns}.${e.sourceHandle || ''}-${nt}.${e.targetHandle || ''}`;
      if (!edges.some((x) => x.id === id)) { edges.push({ ...e, id, source: ns, target: nt }); linked++; }
    });
    if (!moved && !linked) { alert('Ebből a verzióból nincs átvehető egyedi elrendezés/összekötés (a párosítható tárgyakhoz nincs mentett pozíció vagy kézi él).'); return; }
    commit({ ...cur, positions, userEdges: edges });
  };

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
  const exportJSON = () => {
    // azonnali fájlba mentés (helyi API) + letöltés biztonsági másolatként
    fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => { /* ignore */ });
    const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'media-design-mintatanterv.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  const importJSON = (file: File) => {
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(String(r.result)) as Curriculum; if (!d.cohorts) throw new Error('bad'); commit(d); } catch { alert('Hibás JSON fájl.'); } };
    r.readAsText(file);
  };

  const onEdit = useCallback((ci: number, xi: number) => setEditor({ ci, xi }), []);
  const onDetails = useCallback((ci: number, xi: number) => setDetails({ ci, xi }), []);
  const onAdd = useCallback((ci: number) => setEditor({ ci, xi: -1 }), []);
  const onInstructor = useCallback((name: string) => setInstr((v) => (v === name ? '' : name)), []);
  const onCategory = useCallback((c: string) => setCat((v) => (v === c ? '' : c)), []);
  const handlers = useMemo<Handlers>(() => ({ onEdit, onDetails, onAdd, onInstructor, onCategory }), [onEdit, onDetails, onAdd, onInstructor, onCategory]);

  const addEdge = useCallback((e: UserEdge) => {
    const cur = dataRef.current;
    commit({ ...cur, userEdges: [...(cur.userEdges || []).filter((x) => x.id !== e.id), e] });
  }, [commit]);
  const deleteEdge = useCallback((id: string) => {
    const cur = dataRef.current;
    commit({ ...cur, userEdges: (cur.userEdges || []).filter((x) => x.id !== id) });
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
  const persist = useMemo<Persist>(() => ({ addEdge, deleteEdge, moveNode, savePositions, applyConnection, resetPositions }), [addEdge, deleteEdge, moveNode, savePositions, applyConnection, resetPositions]);

  const filter = useMemo<Filter>(() => ({ q, spec, ctype, instr, cat }), [q, spec, ctype, instr, cat]);
  const vp = useMemo<View>(() => ({ ver, prog }), [ver, prog]);
  const versions = useMemo(() => VERSION_ORDER.filter((v) => data.cohorts.some((c) => c.version === v)), [data]);
  const visibleCohorts = useMemo(() => data.cohorts.filter((c) => c.version === ver && c.program === prog), [data, ver, prog]);

  const totalCourses = useMemo(() => visibleCohorts.reduce((a, c) => a + c.courses.length, 0), [visibleCohorts]);
  const totalCredits = useMemo(() => visibleCohorts.reduce((a, c) => a + c.courses.reduce((s, x) => s + (x.credits || 0), 0), 0), [visibleCohorts]);
  const filledSems = useMemo(() => visibleCohorts.filter((c) => c.courses.length).length, [visibleCohorts]);
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

  const detailCourse = details ? data.cohorts[details.ci]?.courses[details.xi] : null;

  return (
    <>
      <div className="app-shell">
      <header className="masthead">
        <div className="wrap">
          <div className="brandmark">
            <div className="logo">M</div>
            <div>
              <div className="kicker">METU · Animáció és Média Design Tanszék — Dr. Balogh Áron</div>
              <h1 className="title">Média Design {prog} · {ver === 'régi (korábbi)' ? 'régi mintatanterv' : ver}</h1>
              <div className="subtitle">Tanulmányi mátrix — ahogy a félévek és a tárgyak egymásra épülnek · kösd össze, szerkeszd, mentsd</div>
            </div>
          </div>
          <div className="totstrip">
            <div><b className="num">{totalCourses}</b><span>kurzus</span></div>
            <div><b className="num">{filledSems}</b><span>félév</span></div>
            <div><b className="num">{totalCredits}</b><span>kredit</span></div>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="wrap toolbar__inner">
          <div className="viewtoggle">
            <button className={view === 'map' ? 'is-on' : ''} onClick={() => setView('map')}>◆ Mátrix</button>
            <button className={view === 'catalog' ? 'is-on' : ''} onClick={() => setView('catalog')}>▦ Katalógus</button>
          </div>
          <div className="viewtoggle">
            <button className={prog === 'BA' ? 'is-on' : ''} onClick={() => setProg('BA')}>BA</button>
            <button className={prog === 'MA' ? 'is-on' : ''} onClick={() => setProg('MA')}>MA</button>
          </div>
          <select className="presetsel" value={ver} onChange={(e) => setVer(e.target.value)} title="Tanterv-verzió">
            {versions.map((v) => <option key={v} value={v}>{v === 'régi (korábbi)' ? 'Régi (korábbi)' : v}</option>)}
          </select>
          {view === 'map' && versions.length > 1 && (
            <select className="presetsel" value="" onChange={(e) => { const v = e.target.value; e.target.value = ''; if (v) copyLayout(v); }} title="Elrendezés (node-pozíciók + kézi összekötések) átvétele egy másik verzióból az aktuálisba · Ctrl+Z visszavonja">
              <option value="">⧉ Elrendezés innen…</option>
              {versions.filter((v) => v !== ver).map((v) => <option key={v} value={v}>{v === 'régi (korábbi)' ? 'Régi' : v}</option>)}
            </select>
          )}
          <input className="search" placeholder="Keresés tárgyra, oktatóra…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`presetsel instrsel${instr ? ' is-on' : ''}`} value={instr} onChange={(e) => setInstr(e.target.value)} title="Szűrés oktatóra (mindkét nézetben)">
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
          <span className="spacer" />
          <select className="presetsel" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} title="Betűtípus / stílus">
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button className="themebtn" title="Világos / sötét mód" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>{theme === 'dark' ? '☀' : '☾'}</button>
          <button className="btn" onClick={exportJSON}>⤓ Mentés</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⤒ Betöltés</button>
          <button className="btn btn--danger" onClick={resetData}>↺ Alaphelyzet</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
        </div>
      </div>

        <div className="viewport">
          {view === 'map' ? (
            <MapView data={data} filter={filter} handlers={handlers} persist={persist} theme={theme} view={vp} />
          ) : (
            <CatalogView data={data} filter={filter} view={vp} onDetails={onDetails} onEdit={onEdit} onAdd={onAdd} onInstructor={onInstructor} onCategory={onCategory} />
          )}
        </div>
      </div>

      {detailCourse && details && (() => {
        const c = data.cohorts[details.ci];
        const x = detailCourse;
        return (
          <>
            <div className="drawer-scrim" onClick={() => setDetails(null)} />
            <aside className="drawer">
              <button className="drawer-x" onClick={() => setDetails(null)}>✕</button>
              <div className="dr-eyebrow">{c.program} · {semLabel(c.semester)} · {x.type}</div>
              <h2 className="dr-name">{x.name}</h2>
              {x.specialization && <div className="dr-spec">{x.specialization}</div>}
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
              {x.cel && <div className="dr-field"><h4>A tárgy célja</h4><p>{x.cel}</p></div>}
              <div className="dr-field"><h4>Összegzés</h4><p className={x.description ? '' : 'none'}>{x.description || 'még nincs megadva'}</p></div>
              {x.software.length > 0 && <div className="dr-field"><h4>Szoftverek</h4><div className="dr-chips">{x.software.map((s) => <span key={s} className="dr-chip sw">{s}</span>)}</div></div>}
              {x.keywords.length > 0 && <div className="dr-field"><h4>Kulcsszavak</h4><div className="dr-chips">{x.keywords.map((k) => <span key={k} className="dr-chip">{k}</span>)}</div></div>}
              {x.prerequisite && <div className="dr-field"><h4>Előfeltétel</h4><p>{x.prerequisite}</p></div>}
              {x.requirement && <div className="dr-field"><h4>Követelmény</h4><p>{x.requirement}</p></div>}
              {x.note && <div className="dr-field"><h4>Megjegyzés</h4><p>{x.note}</p></div>}
              {x.pdfUrl && <a className="btn dr-pdf" href={x.pdfUrl} target="_blank" rel="noopener noreferrer">📄 Hivatalos tantárgyi leírás (PDF) ↗</a>}
              <button className="btn btn--ink dr-edit" onClick={() => { setEditor({ ci: details.ci, xi: details.xi }); setDetails(null); }}>✎ Szerkesztés</button>
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
            onSave={(nc) => { saveCourse(editor, nc); setEditor(null); }}
            onDelete={() => { if (confirm('Törlöd ezt a tárgyat?')) { deleteCourse(editor.ci, editor.xi); setEditor(null); } }}
            onClose={() => setEditor(null)}
          />
        );
      })()}

      {hydrated && edited && <div style={{ position: 'fixed', bottom: 8, left: 12, fontSize: '.7rem', color: 'var(--muted)', pointerEvents: 'none', zIndex: 5 }}>helyi módosítások mentve</div>}
    </>
  );
}
