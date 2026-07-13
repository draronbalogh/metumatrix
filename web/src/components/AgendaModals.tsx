'use client';

import { useEffect, useRef, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter, STATUS_LABEL, TaskStatus, TaskStep, PRIORITY_LABEL, TaskPriority, TASK_CATEGORIES, taskSteps, stepsDone } from '@/data/agenda';
import { RosterEntry, PersonKind, KIND_LABEL } from '@/data/people';
import GrowArea from './GrowArea';
import PlaceQuickPick from './PlaceQuickPick';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

// Felelős-választó: egyetlen név az öt állandó listából
function OwnerSelect({ value, roster, onChange }: { value: string; roster: RosterEntry[]; onChange: (v: string) => void }) {
  const known = roster.some((r) => r.name === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— nincs —</option>
      {value && !known && <option value={value}>{value} (régi bejegyzés)</option>}
      {(['T', 'H', 'I', 'A', 'O', 'P'] as PersonKind[]).map((k) => {
        const items = roster.filter((r) => r.kind === k);
        if (!items.length) return null;
        return (
          <optgroup key={k} label={KIND_LABEL[k]}>
            {items.map((r) => <option key={`${k}-${r.name}`} value={r.name}>{r.name}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

// Chip-választó (állapot / prioritás / kategória) — select helyett ujjbarát, színes
function ChipRadio<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string; cls?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="chipradio">
      {options.map((o) => (
        <button type="button" key={o.v} className={`crx${o.cls ? ` ${o.cls}` : ''}${value === o.v ? ' is-on' : ''}`} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

// Résztvevő-választó — áttekinthető, keresés-első felépítés:
//   1. felül CSAK a kiválasztottak (✕-szel eltávolíthatók),
//   2. hozzáadni kereséssel lehet (gépelésre max 40 találat),
//   3. böngészni kategória-fülből lehet — a teljes, több száz fős névfal
//      SOHA nem jelenik meg egyszerre.
const normName = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function PeoplePicker({ selected, roster, onToggle, onSet }: { selected: string[]; roster: RosterEntry[]; onToggle: (name: string) => void; onSet?: (names: string[]) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<PersonKind | null>(null);
  const legacy = selected.filter((n) => !roster.some((r) => r.name === n));
  const uniq = (arr: string[]) => [...new Set(arr)];
  const kindNames = (k: PersonKind) => roster.filter((r) => r.kind === k).map((r) => r.name);
  const kindOf = (n: string): PersonKind | null => roster.find((r) => r.name === n)?.kind ?? null;
  const hits = q.trim()
    ? roster.filter((r) => normName(r.name).includes(normName(q)) && !selected.includes(r.name)).slice(0, 40)
    : [];
  return (
    <div className="pp-wrap">
      {/* 1) a kiválasztottak — csak ők látszanak mindig */}
      <div className="pp-selrow">
        <span className="pp-selcount">{selected.length || 'Nincs'} résztvevő</span>
        {selected.map((n) => {
          const k = kindOf(n);
          return (
            <button key={n} type="button" className="chip is-on pp-selchip" title="Kattints az eltávolításhoz"
              onClick={() => onToggle(n)}>
              {k && <span className={`pb ${k.toLowerCase()}`}>{k}</span>}{n}<span className="pp-x">✕</span>
            </button>
          );
        })}
        {legacy.map((n) => (
          <button key={n} type="button" className="chip is-on pp-selchip" title="Régi, listán kívüli bejegyzés — kattintva lekerül"
            onClick={() => onToggle(n)}>{n}<span className="pp-x">✕</span></button>
        ))}
        {selected.length > 1 && onSet && (
          <button type="button" className="chip chip--danger" title="Minden résztvevő törlése" onClick={() => onSet([])}>✕ mind</button>
        )}
      </div>
      {/* 2) hozzáadás kereséssel */}
      <input className="nm-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Írj be egy nevet a hozzáadáshoz…" />
      {q.trim() ? (
        <div className="cat-picker pp-picker">
          {hits.map((r) => (
            <button type="button" key={`${r.kind}-${r.name}`} className="chip"
              onClick={() => { onToggle(r.name); setQ(''); }}>
              + <span className={`pb ${r.kind.toLowerCase()}`}>{r.kind}</span>{r.name}
            </button>
          ))}
          {hits.length === 0 && <span className="pp-nohit">Nincs ilyen név a listákban — a ☎ Névjegyzékben tudod felvenni.</span>}
        </div>
      ) : (
        <>
          {/* 3) böngészés kategóriánként — csak a megnyitott fül nevei látszanak */}
          <div className="pp-cats">
            {(['T', 'H', 'I', 'A', 'O', 'P'] as PersonKind[]).map((k) => {
              const n = kindNames(k).length;
              return (
                <button key={k} type="button" className={`chip${cat === k ? ' is-on' : ''}`} disabled={!n}
                  title={n ? `${KIND_LABEL[k]} lista megnyitása (${n} név)` : `A(z) ${KIND_LABEL[k]} lista még üres. A ☎ Névjegyzékben tudod feltölteni.`}
                  onClick={() => setCat((c) => (c === k ? null : k))}>
                  <span className={`pb ${k.toLowerCase()}`}>{k}</span>{KIND_LABEL[k]}{n ? ` (${n})` : ''}
                </button>
              );
            })}
          </div>
          {cat && (
            <div className="pp-browse">
              {onSet && (
                <button type="button" className="chip pp-addall"
                  onClick={() => onSet(uniq([...selected, ...kindNames(cat)]))}>
                  + a teljes {KIND_LABEL[cat]} lista hozzáadása ({kindNames(cat).length})
                </button>
              )}
              <div className="cat-picker pp-picker pp-scroll">
                {roster.filter((r) => r.kind === cat).map((r) => (
                  <button type="button" key={`${r.kind}-${r.name}`} className={`chip${selected.includes(r.name) ? ' is-on' : ''}`}
                    onClick={() => onToggle(r.name)}>
                    <span className={`pb ${r.kind.toLowerCase()}`}>{r.kind}</span>{r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// A szerkesztő-modálok közös, színes fülsora — szabad ugrálás, egyszerre egy egység
interface TabDef { id: string; label: string; cls?: string }
function ModalTabs({ tabs, active, onPick }: { tabs: TabDef[]; active: string; onPick: (id: string) => void }) {
  return (
    <div className="mt-tabs" role="tablist">
      {tabs.map((t, i) => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id}
          className={`mt-tab${t.cls ? ` ${t.cls}` : ''}${active === t.id ? ' is-on' : ''}`}
          onClick={() => onPick(t.id)}>
          <span className="n">{i + 1}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// rövid név az alfeladat-badge-hez: a titulusok nélküli első (vezeték)név
const familyName = (n: string): string =>
  n.trim().split(/\s+/).filter((p) => !/^dr\.?$/i.test(p) && !/^habil\.?$/i.test(p))[0] ?? n;
export const fmtStepDue = (d?: string | null): string => (d && d.length >= 10 ? `${d.slice(5, 7)}.${d.slice(8, 10)}.` : '');

// Alfeladat-szerkesztő: pipa + szöveg + átrendezés + opcionális felelős/határidő soronként
function StepsEditor({ steps, roster, onChange }: { steps: TaskStep[]; roster: RosterEntry[]; onChange: (s: TaskStep[]) => void }) {
  const [draft, setDraft] = useState('');
  const [openIx, setOpenIx] = useState<number | null>(null); // melyik sor felelős/határidő panelje van nyitva
  const upd = (i: number, patch: Partial<TaskStep>) => onChange(steps.map((s, ix) => (ix === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIx((o) => (o === i ? j : o === j ? i : o));
  };
  const add = () => { const t = draft.trim(); if (!t) return; onChange([...steps, { text: t, done: false }]); setDraft(''); };
  return (
    <div className="se-wrap">
      {steps.length === 0 && <div className="se-empty">Még nincs alfeladat — írd be lent az elsőt, és nyomj Entert.</div>}
      {steps.map((s, i) => (
        <div key={i} className={`se-row${s.done ? ' is-done' : ''}`}>
          <div className="se-main">
            <button type="button" className={`ag-check se-check${s.done ? ' is-on' : ''}`}
              title={s.done ? 'Visszaállítás nyitottra' : 'Kész — pipa'} onClick={() => upd(i, { done: !s.done })}>{s.done ? '✓' : ''}</button>
            <input className="se-text" value={s.text} onChange={(e) => upd(i, { text: e.target.value })} placeholder="alfeladat…" />
            {(s.owner || s.due) && (
              <button type="button" className="se-meta" title="Felelős / határidő szerkesztése" onClick={() => setOpenIx((o) => (o === i ? null : i))}>
                {s.owner ? `👤 ${familyName(s.owner)}` : ''}{s.owner && s.due ? ' · ' : ''}{s.due ? `📅 ${fmtStepDue(s.due)}` : ''}
              </button>
            )}
            <button type="button" className={`se-btn${openIx === i ? ' is-on' : ''}`}
              title="Felelős és határidő ehhez az alfeladathoz" onClick={() => setOpenIx((o) => (o === i ? null : i))}>👤</button>
            <button type="button" className="se-btn" title="Feljebb" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="se-btn" title="Lejjebb" disabled={i === steps.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="se-btn se-del" title="Alfeladat törlése" onClick={() => { onChange(steps.filter((_, ix) => ix !== i)); setOpenIx(null); }}>✕</button>
          </div>
          {openIx === i && (
            <div className="se-det">
              <div className="fld">
                <label>A lépés felelőse — üresen a feladat felelőse viszi</label>
                <OwnerSelect value={s.owner ?? ''} roster={roster} onChange={(v) => upd(i, { owner: v || null })} />
              </div>
              <div className="fld">
                <label>A lépés határideje</label>
                <input type="date" value={s.due ?? ''} onChange={(e) => upd(i, { due: e.target.value || null })} />
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="se-add">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="+ új alfeladat — Enter a hozzáadáshoz" />
        <button type="button" className="btn" disabled={!draft.trim()} onClick={add}>+ Hozzáadás</button>
      </div>
    </div>
  );
}

// ---- Feladat ----

interface TaskProps {
  task: AgendaTask;
  isNew: boolean;
  events: { id: string; title: string }[];
  roster: RosterEntry[];
  letters?: Letter[];    // a feladathoz mentett levelek (összegző + Levelezés fül)
  onSave: (t: AgendaTask) => void;
  onDelete: () => void;
  onNotify?: () => void; // mentés után egyből a levélíró nyílik erre a feladatra
  onClose: () => void;
}

const TASK_TABS: TabDef[] = [
  { id: 'alap', label: 'Alap' },
  { id: 'steps', label: 'Alfeladatok', cls: 'c-yellow' },
  { id: 'people', label: 'Emberek', cls: 'c-blue' },
  { id: 'mail', label: 'Levelezés', cls: 'c-green' },
];

export function TaskModal({ task, isNew, events, roster, letters, onSave, onDelete, onNotify, onClose }: TaskProps) {
  const [d, setD] = useState(() => ({
    title: task.title, summary: task.summary,
    status: task.status as string, priority: task.priority as string, category: task.category ?? '',
    owner: task.owner ?? '', due: task.due ?? '', dueDate: task.dueDate ?? '',
    eventId: task.eventId ?? '',
    srcName: task.source?.name ?? '', srcEmail: task.source?.email ?? '',
  }));
  const [people, setPeopleRaw] = useState<string[]>(task.people);
  const [steps, setStepsRaw] = useState<TaskStep[]>(() => taskSteps(task));
  const [tab, setTab] = useState('alap');
  // elmentetlen módosítás követése — bezárás előtt rákérdezünk
  const dirty = useRef(false);
  const tryClose = () => { if (dirty.current && !confirm('Elmentetlen módosítások vannak. Bezárod mentés nélkül?')) return; onClose(); };
  useEsc(tryClose);
  const set = (k: keyof typeof d, v: string) => { dirty.current = true; setD((p) => ({ ...p, [k]: v })); };
  const setSteps = (s: TaskStep[]) => { dirty.current = true; setStepsRaw(s); };
  const setPeople = (names: string[]) => { dirty.current = true; setPeopleRaw(names); };
  const togglePerson = (name: string) => { dirty.current = true; setPeopleRaw((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name])); };
  const save = () => {
    if (!d.title.trim()) return;
    const cleanSteps = steps.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => s.text);
    dirty.current = false;
    onSave({
      ...task,
      title: d.title.trim(),
      summary: d.summary.trim(),
      steps: cleanSteps,
      ideas: cleanSteps.map((s) => s.text), // tükör a régi fogyasztóknak
      status: d.status as TaskStatus,
      priority: d.priority as TaskPriority,
      category: d.category || null,
      owner: d.owner.trim() || null,
      due: d.due.trim() || null,
      dueDate: d.dueDate.trim() || null,
      people,
      eventId: d.eventId || null,
      source: d.srcName.trim() || d.srcEmail.trim()
        ? { name: d.srcName.trim(), email: d.srcEmail.trim(), subject: task.source?.subject ?? null }
        : null,
    });
  };
  const saveAndNotify = () => { if (!d.title.trim() || !onNotify) return; save(); onNotify(); };
  const doneN = steps.filter((s) => s.done).length;

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) tryClose(); }}>
      <div className="modal">
        <h3>{d.title.trim() || (isNew ? 'Új feladat' : 'Feladat szerkesztése')}</h3>
        <div className="mt-sum">
          <button type="button" className="mt-chip" title="Határidő — az Alap fülön" onClick={() => setTab('alap')}>🕑 {d.dueDate || d.due.trim() || 'nincs határidő'}</button>
          <button type="button" className="mt-chip" title="Alfeladatok" onClick={() => setTab('steps')}>☑ {doneN}/{steps.length} alfeladat</button>
          <button type="button" className="mt-chip" title="Felelős és résztvevők" onClick={() => setTab('people')}>👥 {(d.owner ? 1 : 0) + people.length} fő</button>
          <button type="button" className="mt-chip" title="Kapcsolt levelek" onClick={() => setTab('mail')}>✉ {letters?.length ?? 0} levél</button>
        </div>
        <ModalTabs tabs={TASK_TABS} active={tab} onPick={setTab} />
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {tab === 'alap' && (<>
            <div className="f-sec">Alapok</div>
            <div className="field full">
              <label>Feladat neve</label>
              <input value={d.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div className="field full">
              <label>Állapot</label>
              <ChipRadio value={d.status} onChange={(v) => set('status', v)}
                options={[{ v: 'todo', label: STATUS_LABEL.todo }, { v: 'doing', label: STATUS_LABEL.doing, cls: 'c-blue' }, { v: 'done', label: `✓ ${STATUS_LABEL.done}`, cls: 'c-green' }]} />
            </div>
            <div className="field full">
              <label>Prioritás</label>
              <ChipRadio value={d.priority} onChange={(v) => set('priority', v)}
                options={[{ v: 'high', label: `⚑ ${PRIORITY_LABEL.high}` }, { v: 'normal', label: PRIORITY_LABEL.normal, cls: 'c-amber' }, { v: 'low', label: PRIORITY_LABEL.low, cls: 'c-grey' }]} />
            </div>
            <div className="field full">
              <label>Kategória</label>
              <ChipRadio value={d.category} onChange={(v) => set('category', d.category === v ? '' : v)}
                options={TASK_CATEGORIES.map((c) => ({ v: c, label: c, cls: 'c-blue' }))} />
            </div>
            <div className="f-sec c-yellow">Időzítés és kapcsolat</div>
            <div className="field">
              <label>Határidő szövegesen</label>
              <input value={d.due} onChange={(e) => set('due', e.target.value)} placeholder="pl. szeptemberre" />
            </div>
            <div className="field">
              <label>Pontos határidő</label>
              <input type="date" value={d.dueDate} onChange={(e) => set('dueDate', e.target.value)} title="Ha megadod, a rendszer emlékeztethet előtte" />
            </div>
            <div className="field full">
              <label>Kapcsolódó esemény</label>
              <select value={d.eventId} onChange={(e) => set('eventId', e.target.value)}>
                <option value="">— nincs —</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
            <div className="f-sec c-green">Tartalom</div>
            <div className="field full">
              <label>Rövid összefoglaló — a kártyán ez látszik</label>
              <GrowArea minRows={3} value={d.summary} onChange={(e) => set('summary', e.target.value)} placeholder="miről szól a feladat" />
            </div>
          </>)}
          {tab === 'steps' && (<>
            <div className="f-sec c-yellow">Alfeladatok</div>
            <div className="field full">
              <label>Pipálhatók és átrendezhetők — a 👤 gombbal lépésenként felelős és határidő adható</label>
              <StepsEditor steps={steps} roster={roster} onChange={setSteps} />
            </div>
          </>)}
          {tab === 'people' && (<>
            <div className="f-sec c-blue">Felelős és résztvevők</div>
            <div className="field full">
              <label>Felelős — az állandó listából</label>
              <OwnerSelect value={d.owner} roster={roster} onChange={(v) => set('owner', v)} />
            </div>
            <div className="field full">
              <label>Résztvevők — keress névre, vagy nyiss meg egy kategóriát</label>
              <PeoplePicker selected={people} roster={roster} onToggle={togglePerson} onSet={setPeople} />
            </div>
            <div className="field">
              <label>Feladó neve — ha emailből jött a feladat</label>
              <input value={d.srcName} onChange={(e) => set('srcName', e.target.value)} placeholder="pl. Rizmajer Andrea" />
            </div>
            <div className="field">
              <label>Feladó email-címe</label>
              <input type="email" value={d.srcEmail} onChange={(e) => set('srcEmail', e.target.value)} placeholder="valaki@metropolitan.hu" />
            </div>
          </>)}
          {tab === 'mail' && (<>
            <div className="f-sec c-green">Levelezés</div>
            <div className="field full">
              <label>Kapcsolt levelek ({letters?.length ?? 0})</label>
              {(letters?.length ?? 0) === 0 && <div className="se-empty">Ehhez a feladathoz még nincs mentett levél.</div>}
              {onNotify
                ? <button type="button" className="btn nm-jump" title="Menti a feladatot, és megnyitja a levélírót (értesítés, felkérés, válasz a feladónak)" onClick={saveAndNotify}>✉ Mentés és levélírás</button>
                : <div className="se-empty">Az új feladatot előbb mentsd el, utána nyithatod rá a levélírót.</div>}
            </div>
          </>)}
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          {onNotify && <button className="btn" title="Menti a feladatot, és megnyitja a levélírót" onClick={saveAndNotify}>✉ Levél</button>}
          <span className="sp" />
          <button className="btn" onClick={tryClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

// ---- Esemény ----

interface EventProps {
  event: AgendaEvent;
  isNew: boolean;
  roster: RosterEntry[];
  tasks?: AgendaTask[];  // az eseményhez kötött feladatok (Feladatok fül)
  letters?: Letter[];    // az eseményhez mentett levelek (összegző + Levelezés fül)
  onSave: (e: AgendaEvent) => void;
  onDelete: () => void;
  onNotify?: () => void;             // mentés után egyből a levélíró nyílik erre az eseményre
  onOpenTask?: (id: string) => void; // mentés után a kapcsolt feladat szerkesztője nyílik
  onAddTask?: () => void;            // mentés után új, előtöltött feladat nyílik ehhez az eseményhez
  onClose: () => void;
}

const EVENT_TABS: TabDef[] = [
  { id: 'alap', label: 'Alap' },
  { id: 'tasks', label: 'Feladatok', cls: 'c-yellow' },
  { id: 'people', label: 'Emberek', cls: 'c-blue' },
  { id: 'mail', label: 'Levelezés', cls: 'c-green' },
];

export function EventModal({ event, isNew, roster, tasks, letters, onSave, onDelete, onNotify, onOpenTask, onAddTask, onClose }: EventProps) {
  const [d, setD] = useState(() => ({
    title: event.title, when: event.when, sort: event.sort ?? '', day: event.day ?? '', dayEnd: event.dayEnd ?? '',
    note: event.note ?? '', place: event.place ?? '', owner: event.owner ?? '',
  }));
  const [featured, setFeaturedRaw] = useState(event.featured);
  const [people, setPeopleRaw] = useState<string[]>(event.people);
  const [tab, setTab] = useState('alap');
  const dirty = useRef(false);
  const tryClose = () => { if (dirty.current && !confirm('Elmentetlen módosítások vannak. Bezárod mentés nélkül?')) return; onClose(); };
  useEsc(tryClose);
  const set = (k: keyof typeof d, v: string) => { dirty.current = true; setD((p) => ({ ...p, [k]: v })); };
  const setPeople = (names: string[]) => { dirty.current = true; setPeopleRaw(names); };
  const togglePerson = (name: string) => { dirty.current = true; setPeopleRaw((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name])); };
  const save = () => {
    if (!d.title.trim()) return;
    dirty.current = false;
    onSave({
      ...event,
      title: d.title.trim(),
      when: d.when.trim() || 'időpont egyeztetés alatt',
      sort: d.day.trim() ? d.day.trim().slice(0, 7) : (d.sort.trim() || null),
      day: d.day.trim() || null,
      dayEnd: d.dayEnd.trim() && d.day.trim() && d.dayEnd.trim() > d.day.trim() ? d.dayEnd.trim() : null,
      featured,
      note: d.note.trim() || null,
      place: d.place.trim() || null,
      owner: d.owner.trim() || null,
      people,
    });
  };
  const saveAndNotify = () => { if (!d.title.trim() || !onNotify) return; save(); onNotify(); };
  const linked = tasks ?? [];

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) tryClose(); }}>
      <div className="modal">
        <h3>{d.title.trim() || (isNew ? 'Új esemény' : 'Esemény szerkesztése')}</h3>
        <div className="mt-sum">
          <button type="button" className="mt-chip" title="Időpont — az Alap fülön" onClick={() => setTab('alap')}>🕑 {d.day || d.when.trim() || 'nincs időpont'}</button>
          {d.place.trim() !== '' && <button type="button" className="mt-chip" title="Helyszín — az Alap fülön" onClick={() => setTab('alap')}>📍 {d.place.trim()}</button>}
          <button type="button" className="mt-chip" title="Az esemény feladatai" onClick={() => setTab('tasks')}>▤ {linked.length} feladat</button>
          <button type="button" className="mt-chip" title="Felelős és résztvevők" onClick={() => setTab('people')}>👥 {(d.owner ? 1 : 0) + people.length} fő</button>
          <button type="button" className="mt-chip" title="Kapcsolt levelek" onClick={() => setTab('mail')}>✉ {letters?.length ?? 0} levél</button>
        </div>
        <ModalTabs tabs={EVENT_TABS} active={tab} onPick={setTab} />
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {tab === 'alap' && (<>
            <div className="f-sec">Alapok</div>
            <div className="field full">
              <label>Esemény neve</label>
              <input value={d.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div className="field full">
              <label>Kiemelés</label>
              <div className="chipradio">
                <button type="button" className={`crx c-amber${featured ? ' is-on' : ''}`} onClick={() => { dirty.current = true; setFeaturedRaw((v) => !v); }}>★ Kiemelt esemény</button>
              </div>
            </div>
            <div className="f-sec c-yellow">Időpont és helyszín</div>
            <div className="field full">
              <label>Mikor — szabad szöveg</label>
              <input value={d.when} onChange={(e) => set('when', e.target.value)} placeholder="pl. szeptember vagy október eleje" />
            </div>
            <div className="field">
              <label>Kezdőnap — ha ismert</label>
              <input type="date" value={d.day} onChange={(e) => set('day', e.target.value)} title="A naptárban ettől a naptól jelölődik" />
            </div>
            <div className="field">
              <label>Utolsó nap — ha időszak</label>
              <input type="date" value={d.dayEnd} onChange={(e) => set('dayEnd', e.target.value)} title="Többnapos esemény/időszak záró napja — a naptár a teljes tartományt jelöli" />
            </div>
            <div className="field">
              <label>Rendezési hónap</label>
              <input type="month" value={d.sort} onChange={(e) => set('sort', e.target.value)} title="Ez alapján rendeződik a lista; üresen a végére kerül" />
            </div>
            <div className="field full">
              <label>Helyszín</label>
              <input value={d.place} onChange={(e) => set('place', e.target.value)} placeholder="pl. METU, Infopark D épület, 212 vagy külső cím" />
              <PlaceQuickPick value={d.place} onPick={(v) => set('place', v)} />
            </div>
            <div className="f-sec c-green">Leírás</div>
            <div className="field full">
              <label>Leírás</label>
              <GrowArea minRows={4} value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="mire kell készülni, mi kapcsolódik hozzá" />
            </div>
          </>)}
          {tab === 'tasks' && (<>
            <div className="f-sec c-yellow">Az esemény feladatai</div>
            <div className="field full">
              <label>Kapcsolt feladatok ({linked.length}){onOpenTask ? ' — kattintásra az esemény mentődik, és a feladat nyílik meg' : ''}</label>
              {linked.length === 0 && <div className="se-empty">Ehhez az eseményhez még nincs feladat.</div>}
              {linked.length > 0 && (
                <div className="mt-tasklist">
                  {linked.map((t) => (
                    <button key={t.id} type="button" className="mt-task" disabled={!onOpenTask}
                      onClick={() => { if (!d.title.trim() || !onOpenTask) return; save(); onOpenTask(t.id); }}>
                      <span className={`mt-tst st-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                      <span className="t">{t.title}</span>
                      <span className="m">☑ {stepsDone(t)}/{taskSteps(t).length}{t.owner ? ` · ${t.owner}` : ''}{(t.dueDate || t.due) ? ` · ⏱ ${t.dueDate || t.due}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {onAddTask && (
                <button type="button" className="btn" title="Menti az eseményt, és új feladatot nyit, ami mindent örököl az eseménytől"
                  onClick={() => { if (!d.title.trim()) return; save(); onAddTask(); }}>+ Új feladat ehhez az eseményhez</button>
              )}
            </div>
          </>)}
          {tab === 'people' && (<>
            <div className="f-sec c-blue">Felelős és résztvevők</div>
            <div className="field full">
              <label>Felelős — az állandó listából</label>
              <OwnerSelect value={d.owner} roster={roster} onChange={(v) => set('owner', v)} />
            </div>
            <div className="field full">
              <label>Résztvevők — keress névre, vagy nyiss meg egy kategóriát</label>
              <PeoplePicker selected={people} roster={roster} onToggle={togglePerson} onSet={setPeople} />
            </div>
          </>)}
          {tab === 'mail' && (<>
            <div className="f-sec c-green">Levelezés</div>
            <div className="field full">
              <label>Kapcsolt levelek ({letters?.length ?? 0})</label>
              {(letters?.length ?? 0) === 0 && <div className="se-empty">Ehhez az eseményhez még nincs mentett levél.</div>}
              {onNotify
                ? <button type="button" className="btn nm-jump" title="Menti az eseményt, és megnyitja a levélírót (meghívó, emlékeztető, felkérés)" onClick={saveAndNotify}>✉ Mentés és levélírás</button>
                : <div className="se-empty">Az új eseményt előbb mentsd el, utána nyithatod rá a levélírót.</div>}
            </div>
          </>)}
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          {onNotify && <button className="btn" title="Menti az eseményt, és megnyitja a levélírót" onClick={saveAndNotify}>✉ Levél</button>}
          <span className="sp" />
          <button className="btn" onClick={tryClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

// ---- Bevezető szöveg ----

interface IntroProps {
  intro: string;
  onSave: (s: string) => void;
  onClose: () => void;
}

export function IntroModal({ intro, onSave, onClose }: IntroProps) {
  const [v, setV] = useState(intro);
  useEsc(onClose);
  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Bevezető szöveg</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
          <div className="field full">
            <label>A Feladatok oldal tetején megjelenő szöveg</label>
            <GrowArea minRows={6} value={v} onChange={(e) => setV(e.target.value)} />
          </div>
        </form>
        <div className="mfoot">
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={() => onSave(v)}>Mentés</button>
        </div>
      </div>
    </div>
  );
}
