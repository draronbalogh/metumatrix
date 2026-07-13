'use client';

import { useEffect, useState } from 'react';
import { AgendaEvent, AgendaTask, STATUS_LABEL, TaskStatus, PRIORITY_LABEL, TaskPriority, TASK_CATEGORIES } from '@/data/agenda';
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

// ---- Feladat ----

interface TaskProps {
  task: AgendaTask;
  isNew: boolean;
  events: { id: string; title: string }[];
  roster: RosterEntry[];
  onSave: (t: AgendaTask) => void;
  onDelete: () => void;
  onNotify?: () => void; // mentés után egyből a levélíró nyílik erre a feladatra
  onClose: () => void;
}

export function TaskModal({ task, isNew, events, roster, onSave, onDelete, onNotify, onClose }: TaskProps) {
  const [d, setD] = useState(() => ({
    title: task.title, summary: task.summary, ideas: task.ideas.join('\n'),
    status: task.status as string, priority: task.priority as string, category: task.category ?? '',
    owner: task.owner ?? '', due: task.due ?? '', dueDate: task.dueDate ?? '',
    eventId: task.eventId ?? '',
    srcName: task.source?.name ?? '', srcEmail: task.source?.email ?? '',
  }));
  const [people, setPeople] = useState<string[]>(task.people);
  useEsc(onClose);
  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }));
  const togglePerson = (name: string) => setPeople((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));
  const save = () => {
    if (!d.title.trim()) return;
    onSave({
      ...task,
      title: d.title.trim(),
      summary: d.summary.trim(),
      ideas: d.ideas.split('\n').map((s) => s.trim()).filter(Boolean),
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

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{isNew ? 'Új feladat' : 'Feladat szerkesztése'}</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {onNotify && (
            <div className="m-topact">
              <button type="button" className="btn nm-jump" title="Menti a feladatot, és megnyitja a levélírót (értesítés, felkérés, válasz a feladónak)"
                onClick={() => { if (!d.title.trim()) return; save(); onNotify(); }}>✉ Mentés és levélírás</button>
            </div>
          )}
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
          <div className="f-sec c-green">Tartalom</div>
          <div className="field full">
            <label>Rövid összefoglaló — a kártyán ez látszik</label>
            <GrowArea minRows={3} value={d.summary} onChange={(e) => set('summary', e.target.value)} placeholder="miről szól a feladat" />
          </div>
          <div className="field full">
            <label>Ötletek / teendők — soronként egy</label>
            <GrowArea minRows={6} value={d.ideas} onChange={(e) => set('ideas', e.target.value)} placeholder={'első lépés\nmásodik lépés'} />
          </div>
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          {onNotify && <button className="btn" title="Menti a feladatot, és megnyitja a levélírót"
            onClick={() => { if (!d.title.trim()) return; save(); onNotify(); }}>✉ Levél</button>}
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
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
  onSave: (e: AgendaEvent) => void;
  onDelete: () => void;
  onNotify?: () => void; // mentés után egyből a levélíró nyílik erre az eseményre
  onClose: () => void;
}

export function EventModal({ event, isNew, roster, onSave, onDelete, onNotify, onClose }: EventProps) {
  const [d, setD] = useState(() => ({
    title: event.title, when: event.when, sort: event.sort ?? '', day: event.day ?? '', dayEnd: event.dayEnd ?? '',
    note: event.note ?? '', place: event.place ?? '', owner: event.owner ?? '',
  }));
  const [featured, setFeatured] = useState(event.featured);
  const [people, setPeople] = useState<string[]>(event.people);
  useEsc(onClose);
  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }));
  const togglePerson = (name: string) => setPeople((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));
  const save = () => {
    if (!d.title.trim()) return;
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

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{isNew ? 'Új esemény' : 'Esemény szerkesztése'}</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {onNotify && (
            <div className="m-topact">
              <button type="button" className="btn nm-jump" title="Menti az eseményt, és megnyitja a levélírót (meghívó, emlékeztető, válasz a feladónak)"
                onClick={() => { if (!d.title.trim()) return; save(); onNotify(); }}>✉ Mentés és levélírás</button>
            </div>
          )}
          <div className="f-sec">Alapok</div>
          <div className="field full">
            <label>Esemény neve</label>
            <input value={d.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="field full">
            <label>Kiemelés</label>
            <div className="chipradio">
              <button type="button" className={`crx c-amber${featured ? ' is-on' : ''}`} onClick={() => setFeatured((v) => !v)}>★ Kiemelt esemény</button>
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
          <div className="f-sec c-blue">Felelős és résztvevők</div>
          <div className="field full">
            <label>Felelős — az állandó listából</label>
            <OwnerSelect value={d.owner} roster={roster} onChange={(v) => set('owner', v)} />
          </div>
          <div className="field full">
            <label>Résztvevők — keress névre, vagy nyiss meg egy kategóriát</label>
            <PeoplePicker selected={people} roster={roster} onToggle={togglePerson} onSet={setPeople} />
          </div>
          <div className="f-sec c-green">Leírás</div>
          <div className="field full">
            <label>Leírás</label>
            <GrowArea minRows={4} value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="mire kell készülni, mi kapcsolódik hozzá" />
          </div>
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          {onNotify && <button className="btn" title="Menti a feladatot, és megnyitja a levélírót"
            onClick={() => { if (!d.title.trim()) return; save(); onNotify(); }}>✉ Levél</button>}
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
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
