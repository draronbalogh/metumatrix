'use client';

import { useEffect, useRef, useState } from 'react';
import { AgendaEvent, AgendaMeetSlot, AgendaTask, Letter, STATUS_LABEL, TaskStar, TaskStatus, TaskStep, PRIORITY_LABEL, TaskPriority, TASK_CATEGORIES, taskSteps, stepsDone, fmtDueHu, fmtEventWhen } from '@/data/agenda';
import { RosterEntry, RosterGroups, PersonKind, KIND_LABEL } from '@/data/people';
import { suggestTemplatesFor } from '@/lib/topics';
import { suggestEventFor } from '@/lib/linkSuggest';
import GrowArea from './GrowArea';
import PlaceQuickPick from './PlaceQuickPick';
import MeetSlots from './MeetSlots';
import { MeetSlot } from '@/lib/letters';

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
      <option value="">- nincs -</option>
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

// Chip-választó (állapot / prioritás / kategória) - select helyett ujjbarát, színes
function ChipRadio<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string; cls?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="chipradio">
      {options.map((o) => (
        <button type="button" key={o.v} className={`crx${o.cls ? ` ${o.cls}` : ''}${value === o.v ? ' is-on' : ''}`} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

// Strukturált határidő-választó: hónap VAGY konkrét nap, opcionális óra:perccel -
// szabad szöveg nincs. Érték: '' | 'ÉÉÉÉ-HH' | 'ÉÉÉÉ-HH-NN' | 'ÉÉÉÉ-HH-NN ÓÓ:PP'.
function DueInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<'none' | 'month' | 'day'>(value.length >= 10 ? 'day' : value.length === 7 ? 'month' : 'none');
  const day = value.length >= 10 ? value.slice(0, 10) : '';
  const time = value.length >= 16 ? value.slice(11, 16) : '';
  const month = value.length === 7 ? value : value.length >= 10 ? value.slice(0, 7) : '';
  return (
    <div className="due-in">
      <div className="chipradio">
        <button type="button" className={`crx c-grey${mode === 'none' ? ' is-on' : ''}`} onClick={() => { setMode('none'); onChange(''); }}>Nincs</button>
        <button type="button" className={`crx${mode === 'month' ? ' is-on' : ''}`} title="Csak a hónap ismert" onClick={() => { setMode('month'); if (month) onChange(month); }}>Hónap</button>
        <button type="button" className={`crx${mode === 'day' ? ' is-on' : ''}`} title="Konkrét nap, akár óra:perccel" onClick={() => setMode('day')}>Pontos nap</button>
      </div>
      {mode === 'month' && (
        <div className="due-row">
          <input type="month" value={month} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
      {mode === 'day' && (
        <div className="due-row">
          <input type="date" value={day} onChange={(e) => onChange(e.target.value ? (time ? `${e.target.value} ${time}` : e.target.value) : '')} />
          <input type="time" value={time} disabled={!day} title="Óra:perc - csak ha kell" onChange={(e) => onChange(e.target.value ? `${day} ${e.target.value}` : day)} />
        </div>
      )}
      {value !== '' && <div className="due-preview">Kijelzés: <strong>{fmtDueHu(value)}</strong></div>}
    </div>
  );
}

// Résztvevő-választó - áttekinthető, keresés-első felépítés:
//   1. felül CSAK a kiválasztottak (✕-szel eltávolíthatók),
//   2. hozzáadni kereséssel lehet (gépelésre max 40 találat),
//   3. böngészni kategória-fülből lehet - a teljes, több száz fős névfal
//      SOHA nem jelenik meg egyszerre.
const normName = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function PeoplePicker({ selected, roster, groups, onToggle, onSet }: { selected: string[]; roster: RosterEntry[]; groups?: RosterGroups; onToggle: (name: string) => void; onSet?: (names: string[]) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<PersonKind | null>(null);
  const [sub, setSub] = useState<string | null>(null); // kategórián belüli gyorsszűrő (pl. Óraadó)
  const legacy = selected.filter((n) => !roster.some((r) => r.name === n));
  const uniq = (arr: string[]) => [...new Set(arr)];
  const subGroups = cat ? (groups?.[cat] ?? []).filter((g) => g.names.length > 0) : [];
  const subNames = sub ? new Set(subGroups.find((g) => g.label === sub)?.names ?? []) : null;
  const kindNames = (k: PersonKind) => roster.filter((r) => r.kind === k).map((r) => r.name);
  // a megnyitott kategória névsora a gyorsszűrővel szűkítve - ezt mutatjuk és ezt adja a "mind" gomb
  const browse = cat ? roster.filter((r) => r.kind === cat && (!subNames || subNames.has(r.name))) : [];
  const kindOf = (n: string): PersonKind | null => roster.find((r) => r.name === n)?.kind ?? null;
  const hits = q.trim()
    ? roster.filter((r) => normName(r.name).includes(normName(q)) && !selected.includes(r.name)).slice(0, 40)
    : [];
  return (
    <div className="pp-wrap">
      {/* 1) a kiválasztottak - csak ők látszanak mindig */}
      <div className="pp-selrow">
        <span className="pp-selcount">{selected.length || 'Nincs'} résztvevő</span>
        {selected.length > 0 && onSet && (
          <button type="button" className="chip chip--danger" title="Senki - minden kijelölt egyben törlése" onClick={() => onSet([])}>Senki</button>
        )}
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
          <button key={n} type="button" className="chip is-on pp-selchip" title="Régi, listán kívüli bejegyzés - kattintva lekerül"
            onClick={() => onToggle(n)}>{n}<span className="pp-x">✕</span></button>
        ))}
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
          {hits.length === 0 && <span className="pp-nohit">Nincs ilyen név a listákban - a ☎ Névjegyzékben tudod felvenni.</span>}
        </div>
      ) : (
        <>
          {/* 3) böngészés kategóriánként - csak a megnyitott fül nevei látszanak */}
          <div className="pp-cats">
            {(['T', 'H', 'I', 'A', 'O', 'P'] as PersonKind[]).map((k) => {
              const n = kindNames(k).length;
              return (
                <button key={k} type="button" className={`chip${cat === k ? ' is-on' : ''}`} disabled={!n}
                  title={n ? `${KIND_LABEL[k]} lista megnyitása (${n} név)` : `A(z) ${KIND_LABEL[k]} lista még üres. A ☎ Névjegyzékben tudod feltölteni.`}
                  onClick={() => { setCat((c) => (c === k ? null : k)); setSub(null); }}>
                  <span className={`pb ${k.toLowerCase()}`}>{k}</span>{KIND_LABEL[k]}{n ? ` (${n})` : ''}
                </button>
              );
            })}
          </div>
          {cat && (
            <div className="pp-browse">
              {subGroups.length > 0 && (
                <div className="chipradio pp-subrow">
                  <button type="button" className={`crx c-grey${sub === null ? ' is-on' : ''}`}
                    title="A teljes lista, szűrés nélkül" onClick={() => setSub(null)}>Mind ({kindNames(cat).length})</button>
                  {subGroups.map((g) => (
                    <button key={g.label} type="button" className={`crx${sub === g.label ? ' is-on' : ''}`}
                      title={`Csak a(z) ${g.label} kör mutatása (${g.names.length} név)`}
                      onClick={() => setSub((s) => (s === g.label ? null : g.label))}>{g.label} ({g.names.length})</button>
                  ))}
                </div>
              )}
              {onSet && (
                <button type="button" className="chip pp-addall"
                  onClick={() => onSet(uniq([...selected, ...browse.map((r) => r.name)]))}>
                  + {sub ? `a(z) ${sub} kör` : `a teljes ${KIND_LABEL[cat]} lista`} hozzáadása ({browse.length})
                </button>
              )}
              <div className="cat-picker pp-picker pp-scroll">
                {browse.map((r) => (
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

// A szerkesztő-modálok közös, színes fülsora - szabad ugrálás, egyszerre egy egység
// (a NotifyModal is ezt használja, ezért exportált)
export interface TabDef { id: string; label: string; cls?: string }
export function ModalTabs({ tabs, active, onPick }: { tabs: TabDef[]; active: string; onPick: (id: string) => void }) {
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

// Alfeladat-szerkesztő: pipa + szöveg + átrendezés + opcionális felelős/határidő soronként.
// A team a kártya emberei (felelős + résztvevők az Emberek fülről) - ők egy kattintással
// kioszthatók egy lépésre, a teljes névsoros lenyíló csak a "bárki más" esetre kell.
function StepsEditor({ steps, roster, team, onChange }: { steps: TaskStep[]; roster: RosterEntry[]; team?: string[]; onChange: (s: TaskStep[]) => void }) {
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
      {steps.length === 0 && <div className="se-empty">Még nincs alfeladat - írd be lent az elsőt, és nyomj Entert.</div>}
      {steps.map((s, i) => (
        <div key={i} className={`se-row${s.done ? ' is-done' : ''}`}>
          <div className="se-main">
            <button type="button" className={`ag-check se-check${s.done ? ' is-on' : ''}`}
              title={s.done ? 'Visszaállítás nyitottra' : 'Kész - pipa'} onClick={() => upd(i, { done: !s.done })}>{s.done ? '✓' : ''}</button>
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
              {(team ?? []).length > 0 && (
                <div className="fld se-teamfld">
                  <label>A feladat emberei - kattints, és ő viszi ezt a lépést</label>
                  <div className="se-team">
                    {(team ?? []).map((n) => {
                      const k = roster.find((r) => r.name === n)?.kind;
                      return (
                        <button key={n} type="button" className={`chip${s.owner === n ? ' is-on' : ''}`}
                          title={s.owner === n ? 'Levétel - a lépést a feladat felelőse viszi' : `A lépés felelőse: ${n}`}
                          onClick={() => upd(i, { owner: s.owner === n ? null : n })}>
                          {k && <span className={`pb ${k.toLowerCase()}`}>{k}</span>}{n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="fld">
                <label>Bárki más a teljes névsorból - üresen a feladat felelőse viszi</label>
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
          placeholder="+ új alfeladat - Enter a hozzáadáshoz" />
        <button type="button" className="btn" disabled={!draft.trim()} onClick={add}>+ Hozzáadás</button>
      </div>
    </div>
  );
}

// Levelezés fül (Feladat + Esemény modál közösen): kapcsolt levelek állapot-badge-dzsel,
// új levél gomb és a kártya címéhez illő sablon-ajánlások - minden útvonal előbb MENT
function MailTab({ letters, title, saveFirst, onOpenLetter, onLetterStatus, onNotify, onNotifyTopic }: {
  letters: Letter[];
  title: string;
  saveFirst: () => boolean; // ment; false, ha nem lehet (üres cím)
  onOpenLetter?: (l: Letter) => void;
  onLetterStatus?: (id: string, status: 'draft' | 'sent') => void;
  onNotify?: () => void;
  onNotifyTopic?: (topicId: string) => void;
}) {
  const suggested = suggestTemplatesFor(title);
  const fmt = (iso: string) => iso.slice(0, 16).replace('T', ' ');
  return (
    <>
      <div className="f-sec c-green">Levelezés</div>
      <div className="field full">
        <label>Kapcsolt levelek ({letters.length}){letters.length && onOpenLetter ? ' - kattintásra mentés után a levélíróban nyílik meg' : ''}</label>
        {letters.length === 0 && <div className="se-empty">Ehhez a tételhez még nincs mentett levél.</div>}
        {letters.length > 0 && (
          <div className="mt-letters">
            {letters.map((l) => {
              const st = l.status ?? 'draft';
              return (
                <div key={l.id} className="mt-letter">
                  <button type="button" className="mt-letter-open" disabled={!onOpenLetter}
                    onClick={() => { if (!onOpenLetter || !saveFirst()) return; onOpenLetter(l); }}>
                    <span className="s">{l.subject}</span>
                    <span className="d">{fmt(l.createdAt)} · {l.names.length} címzett</span>
                  </button>
                  <button type="button" className={`mt-lst ${st}`} disabled={!onLetterStatus}
                    title={st === 'sent' ? 'Kiküldve - kattints, ha mégis vázlat' : 'Vázlat - kattints, ha már kiküldted (pl. Outlookból)'}
                    onClick={() => onLetterStatus?.(l.id, st === 'sent' ? 'draft' : 'sent')}>
                    {st === 'sent' ? '✓ Kiküldve' : '✎ Vázlat'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {onNotify ? (
        <div className="field full">
          <label>Új levél</label>
          <div className="nm-groups">
            <button type="button" className="btn nm-jump" title="Ment, és megnyitja a levélírót (értesítés, meghívó, felkérés, válasz)"
              onClick={() => { if (saveFirst()) onNotify(); }}>✉ Mentés és levélírás</button>
          </div>
          {onNotifyTopic && suggested.length > 0 && (
            <>
              <label className="mt-sublabel">Ehhez illő sablonok - kattintásra a levélíró a sablonnal nyílik</label>
              <div className="nm-groups">
                {suggested.map((t) => (
                  <button key={t.id} type="button" className="chip" title={t.group}
                    onClick={() => { if (saveFirst()) onNotifyTopic(t.id); }}>✉ {t.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="field full"><div className="se-empty">Az új tételt előbb mentsd el, utána nyithatod rá a levélírót.</div></div>
      )}
    </>
  );
}

// ---- Feladat ----

interface TaskProps {
  task: AgendaTask;
  isNew: boolean;
  events: { id: string; title: string }[];
  roster: RosterEntry[];
  rosterGroups?: RosterGroups; // kategórián belüli gyorsszűrők (aktív/főállású/óraadó...)
  letters?: Letter[];    // a feladathoz mentett levelek (összegző + Levelezés fül)
  onSave: (t: AgendaTask) => void;
  onDelete: () => void;
  onNotify?: () => void; // mentés után egyből a levélíró nyílik erre a feladatra
  onAddEvent?: () => void; // mentés után új, előtöltött esemény nyílik ehhez a feladathoz
  onOpenLetter?: (l: Letter) => void;                              // mentett levél megnyitása a levélíróban
  onLetterStatus?: (id: string, status: 'draft' | 'sent') => void; // vázlat/kiküldve váltás
  onNotifyTopic?: (topicId: string) => void;                       // levélíró nyitása ajánlott sablonnal
  onClose: () => void;
}

const TASK_TABS: TabDef[] = [
  { id: 'alap', label: 'Alap' },
  { id: 'steps', label: 'Alfeladatok', cls: 'c-yellow' },
  { id: 'people', label: 'Emberek', cls: 'c-blue' },
  { id: 'mail', label: 'Levelezés', cls: 'c-green' },
];

export function TaskModal({ task, isNew, events, roster, rosterGroups, letters, onSave, onDelete, onNotify, onAddEvent, onOpenLetter, onLetterStatus, onNotifyTopic, onClose }: TaskProps) {
  const [d, setD] = useState(() => ({
    title: task.title, summary: task.summary,
    status: task.status as string, priority: task.priority as string, category: task.category ?? '',
    star: (task.star ?? '') as string,
    owner: task.owner ?? '', due: task.due ?? '', dueDate: task.dueDate ?? '',
    eventId: task.eventId ?? '',
    srcName: task.source?.name ?? '', srcEmail: task.source?.email ?? '',
  }));
  const [people, setPeopleRaw] = useState<string[]>(task.people);
  const [steps, setStepsRaw] = useState<TaskStep[]>(() => taskSteps(task));
  const [tab, setTab] = useState('alap');
  // elmentetlen módosítás követése - bezárás előtt rákérdezünk
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
      // a strukturált határidő az egyetlen forrás - a régi szöveges csak addig él, amíg nincs
      due: d.dueDate.trim() ? null : d.due.trim() || null,
      dueDate: d.dueDate.trim() || null,
      people,
      eventId: d.eventId || null,
      star: (d.star || null) as TaskStar | null,
      starAt: (d.star || null) === (task.star ?? null) ? task.starAt ?? null : (d.star ? new Date().toISOString() : null),
      // a source-csomag (Posta-állapot, szál, választervek) NEM veszhet el a szerkesztéskor:
      // csak a név/email írható át, minden más mező (status, thread, replies, gist...) megmarad
      source: d.srcName.trim() || d.srcEmail.trim()
        ? (task.source
          ? { ...task.source, name: d.srcName.trim(), email: d.srcEmail.trim() }
          : { name: d.srcName.trim(), email: d.srcEmail.trim(), subject: null })
        : task.source ?? null,
    });
  };
  const saveAndNotify = () => { if (!d.title.trim() || !onNotify) return; save(); onNotify(); };
  const doneN = steps.filter((s) => s.done).length;
  // automatikus esemény-javaslat a címek egyezése alapján, amíg nincs kapcsolat
  const eventSugg = !d.eventId ? suggestEventFor(`${d.title} ${d.summary}`, events) : null;

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) tryClose(); }}>
      <div className="modal modal--tabs">
        <h3>{d.title.trim() || (isNew ? 'Új feladat' : 'Feladat szerkesztése')}</h3>
        <div className="mt-sum">
          <button type="button" className="mt-chip" title="Határidő - az Alap fülön" onClick={() => setTab('alap')}>🕑 {fmtDueHu(d.dueDate) || d.due.trim() || 'nincs határidő'}</button>
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
              <label>⭐ Legfontosabbak sáv - kézi felülbírálat</label>
              <ChipRadio value={d.star} onChange={(v) => set('star', v)}
                options={[{ v: '', label: 'Automatikus', cls: 'c-grey' }, { v: 'on', label: '⭐ Mindig bent' }, { v: 'off', label: 'Soha', cls: 'c-grey' }]} />
            </div>
            <div className="field full">
              <label>Kategória</label>
              <ChipRadio value={d.category} onChange={(v) => set('category', d.category === v ? '' : v)}
                options={TASK_CATEGORIES.map((c) => ({ v: c, label: c, cls: 'c-blue' }))} />
            </div>
            <div className="f-sec c-yellow">Időzítés és kapcsolat</div>
            <div className="field full">
              <label>Határidő - hónap vagy pontos nap, óra:perc ha kell</label>
              <DueInput value={d.dueDate} onChange={(v) => set('dueDate', v)} />
              {d.due.trim() !== '' && !d.dueDate && (
                <div className="due-legacy">Régi szöveges bejegyzés: „{d.due}" - válassz fent hónapot vagy napot, az váltja ki.</div>
              )}
            </div>
            <div className="field full">
              <label>Kapcsolódó esemény</label>
              <select value={d.eventId} onChange={(e) => set('eventId', e.target.value)}>
                <option value="">- nincs -</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
              {!d.eventId && eventSugg && (
                <button type="button" className="chip due-sugg" title="A rendszer a címek egyezése alapján ezt az eseményt javasolja"
                  onClick={() => set('eventId', eventSugg.id)}>⚡ Javaslat: ▤ {eventSugg.title} - összekapcsolás</button>
              )}
              {!d.eventId && onAddEvent && (
                <button type="button" className="btn" title="Menti a feladatot, és új eseményt nyit a feladat adataival - az esemény mentésekor össze lesznek kapcsolva"
                  onClick={() => { if (!d.title.trim()) return; save(); onAddEvent(); }}>+ Új esemény ehhez a feladathoz</button>
              )}
            </div>
            <div className="f-sec c-green">Tartalom</div>
            <div className="field full">
              <label>Rövid összefoglaló - a kártyán ez látszik</label>
              <GrowArea minRows={7} value={d.summary} onChange={(e) => set('summary', e.target.value)} placeholder="miről szól a feladat" />
            </div>
          </>)}
          {tab === 'steps' && (<>
            <div className="f-sec c-yellow">Alfeladatok</div>
            <div className="field full">
              <label>Pipálhatók és átrendezhetők - a 👤 gombbal lépésenként felelős és határidő adható</label>
              <StepsEditor steps={steps} roster={roster} team={[...new Set([d.owner, ...people].filter(Boolean))]} onChange={setSteps} />
            </div>
          </>)}
          {tab === 'people' && (<>
            <div className="f-sec c-blue">Felelős és résztvevők</div>
            <div className="field full">
              <label>Felelős - az állandó listából</label>
              <OwnerSelect value={d.owner} roster={roster} onChange={(v) => set('owner', v)} />
            </div>
            <div className="field full">
              <label>Résztvevők - keress névre, vagy nyiss meg egy kategóriát</label>
              <PeoplePicker selected={people} roster={roster} groups={rosterGroups} onToggle={togglePerson} onSet={setPeople} />
            </div>
            <div className="field">
              <label>Feladó neve - ha emailből jött a feladat</label>
              <input value={d.srcName} onChange={(e) => set('srcName', e.target.value)} placeholder="pl. Rizmajer Andrea" />
            </div>
            <div className="field">
              <label>Feladó email-címe</label>
              <input type="email" value={d.srcEmail} onChange={(e) => set('srcEmail', e.target.value)} placeholder="valaki@metropolitan.hu" />
            </div>
          </>)}
          {tab === 'mail' && (
            <MailTab letters={letters ?? []} title={d.title} onNotify={onNotify}
              saveFirst={() => { if (!d.title.trim()) return false; save(); return true; }}
              onOpenLetter={onOpenLetter} onLetterStatus={onLetterStatus} onNotifyTopic={onNotifyTopic} />
          )}
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
  rosterGroups?: RosterGroups; // kategórián belüli gyorsszűrők (aktív/főállású/óraadó...)
  tasks?: AgendaTask[];  // az eseményhez kötött feladatok (Feladatok fül)
  letters?: Letter[];    // az eseményhez mentett levelek (összegző + Levelezés fül)
  onSave: (e: AgendaEvent) => void;
  onDelete: () => void;
  onNotify?: () => void;             // mentés után egyből a levélíró nyílik erre az eseményre
  onOpenTask?: (id: string) => void; // mentés után a kapcsolt feladat szerkesztője nyílik
  onAddTask?: () => void;            // mentés után új, előtöltött feladat nyílik ehhez az eseményhez
  onOpenLetter?: (l: Letter) => void;                              // mentett levél megnyitása a levélíróban
  onLetterStatus?: (id: string, status: 'draft' | 'sent') => void; // vázlat/kiküldve váltás
  onNotifyTopic?: (topicId: string) => void;                       // levélíró nyitása ajánlott sablonnal
  onClose: () => void;
}

const EVENT_TABS: TabDef[] = [
  { id: 'alap', label: 'Alap' },
  { id: 'tasks', label: 'Feladatok', cls: 'c-yellow' },
  { id: 'people', label: 'Emberek', cls: 'c-blue' },
  { id: 'mail', label: 'Levelezés', cls: 'c-green' },
];

export function EventModal({ event, isNew, roster, rosterGroups, tasks, letters, onSave, onDelete, onNotify, onOpenTask, onAddTask, onOpenLetter, onLetterStatus, onNotifyTopic, onClose }: EventProps) {
  // az időpont strukturált: hónap VAGY nap/időszak (+ opcionális óra:perc) - szabad szöveg nincs;
  // a régi when-szövegből az óra:percet kiolvassuk, a kijelzett szöveget mentéskor generáljuk
  const m0 = event.when.match(/(\d{1,2})[:.](\d{2})/);
  const [d, setD] = useState(() => ({
    title: event.title, day: event.day ?? '', dayEnd: event.dayEnd ?? '', month: event.sort ?? '',
    time: event.day && m0 ? `${m0[1].padStart(2, '0')}:${m0[2]}` : '',
    note: event.note ?? '', place: event.place ?? '', owner: event.owner ?? '',
  }));
  const [mode, setModeRaw] = useState<'none' | 'month' | 'day'>(event.day ? 'day' : event.sort ? 'month' : 'none');
  const [featured, setFeaturedRaw] = useState(event.featured);
  const [people, setPeopleRaw] = useState<string[]>(event.people);
  const [tab, setTab] = useState('alap');
  // több javasolt Meet-időpont: mentéskor az esemény meetSlots mezőjébe kerülnek,
  // az esemény "egyeztetés alatt" (tentative) lesz, a naptár halványan jelöli őket
  const [meetSlots, setMeetSlotsRaw] = useState<MeetSlot[]>(() =>
    (event.meetSlots ?? []).map((s) => ({ day: s.day, start: s.start ?? '', end: s.end ?? '' })));
  const [slotsOpen, setSlotsOpen] = useState(() => (event.meetSlots?.length ?? 0) > 0);
  const dirty = useRef(false);
  const tryClose = () => { if (dirty.current && !confirm('Elmentetlen módosítások vannak. Bezárod mentés nélkül?')) return; onClose(); };
  useEsc(tryClose);
  const set = (k: keyof typeof d, v: string) => { dirty.current = true; setD((p) => ({ ...p, [k]: v })); };
  const setMode = (m: 'none' | 'month' | 'day') => { dirty.current = true; setModeRaw(m); };
  const setPeople = (names: string[]) => { dirty.current = true; setPeopleRaw(names); };
  const togglePerson = (name: string) => { dirty.current = true; setPeopleRaw((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name])); };
  const setMeetSlots = (s: MeetSlot[]) => { dirty.current = true; setMeetSlotsRaw(s); };
  const effDay = mode === 'day' ? d.day.trim() : '';
  const effEnd = mode === 'day' && effDay && d.dayEnd.trim() > effDay ? d.dayEnd.trim() : null;
  const effMonth = mode === 'month' ? d.month.trim() : '';
  const effTime = effDay ? d.time.trim() : '';
  const whenOut = mode !== 'none'
    ? fmtEventWhen(effDay || null, effEnd, effMonth || null, effTime || null)
    : (event.day || event.sort ? 'időpont egyeztetés alatt' : (event.when.trim() || 'időpont egyeztetés alatt'));
  const save = () => {
    if (!d.title.trim()) return;
    dirty.current = false;
    // a kitöltött időpontjavaslatok; kézi nap híján az első javaslat napja horgonyozza az eseményt
    const cleanSlots: AgendaMeetSlot[] = meetSlots.filter((s) => s.day).map((s) => ({ day: s.day, start: s.start || null, end: s.end || null }));
    const slotDay = cleanSlots.length ? cleanSlots[0].day : null;
    const outDay = effDay || slotDay || null;
    const outWhen = mode !== 'none' || !slotDay
      ? whenOut
      : `${fmtEventWhen(slotDay, null, slotDay.slice(0, 7), cleanSlots[0].start ?? null)} (egyeztetés alatt)`;
    onSave({
      ...event,
      title: d.title.trim(),
      when: outWhen,
      sort: outDay ? outDay.slice(0, 7) : (effMonth || null),
      day: outDay,
      dayEnd: effEnd,
      featured,
      note: d.note.trim() || null,
      place: d.place.trim() || null,
      owner: d.owner.trim() || null,
      people,
      meetSlots: cleanSlots.length ? cleanSlots : null,
      mstatus: cleanSlots.length ? 'tentative' : event.mstatus ?? null,
    });
  };
  const saveAndNotify = () => { if (!d.title.trim() || !onNotify) return; save(); onNotify(); };
  const linked = tasks ?? [];

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) tryClose(); }}>
      <div className="modal modal--tabs">
        <h3>{d.title.trim() || (isNew ? 'Új esemény' : 'Esemény szerkesztése')}</h3>
        <div className="mt-sum">
          <button type="button" className="mt-chip" title="Időpont - az Alap fülön" onClick={() => setTab('alap')}>🕑 {whenOut}</button>
          {d.place.trim() !== '' && <button type="button" className="mt-chip" title="Helyszín - az Alap fülön" onClick={() => setTab('alap')}>📍 {d.place.trim()}</button>}
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
              <label>Időpont - hónap vagy konkrét nap/időszak</label>
              <div className="chipradio">
                <button type="button" className={`crx c-grey${mode === 'none' ? ' is-on' : ''}`} onClick={() => setMode('none')}>Nincs még</button>
                <button type="button" className={`crx${mode === 'month' ? ' is-on' : ''}`} title="Csak a hónap ismert" onClick={() => setMode('month')}>Hónap</button>
                <button type="button" className={`crx${mode === 'day' ? ' is-on' : ''}`} title="Konkrét nap vagy többnapos időszak - a naptárban is jelölődik" onClick={() => setMode('day')}>Nap / időszak</button>
              </div>
            </div>
            {mode === 'month' && (
              <div className="field">
                <label>Hónap</label>
                <input type="month" value={d.month} onChange={(e) => set('month', e.target.value)} />
              </div>
            )}
            {mode === 'day' && (<>
              <div className="field">
                <label>Kezdőnap</label>
                <input type="date" value={d.day} onChange={(e) => set('day', e.target.value)} title="A naptárban ettől a naptól jelölődik" />
              </div>
              <div className="field">
                <label>Utolsó nap - ha időszak</label>
                <input type="date" value={d.dayEnd} onChange={(e) => set('dayEnd', e.target.value)} title="Többnapos esemény/időszak záró napja - a naptár a teljes tartományt jelöli" />
              </div>
              <div className="field">
                <label>Óra:perc - ha van</label>
                <input type="time" value={d.time} disabled={!d.day.trim()} onChange={(e) => set('time', e.target.value)} />
              </div>
            </>)}
            {mode !== 'none' && (
              <div className="field full"><div className="due-preview">Kijelzés: <strong>{whenOut}</strong></div></div>
            )}
            <div className="field full">
              <label>Helyszín</label>
              <input value={d.place} onChange={(e) => set('place', e.target.value)} placeholder="pl. METU, Infopark D épület, 212 vagy külső cím" />
              <PlaceQuickPick value={d.place} onPick={(v) => set('place', v)} />
            </div>
            <div className="field full">
              <label>Google Meet</label>
              {event.meetLink ? (
                <p className="ev-meetrow">
                  <a href={event.meetLink} target="_blank" rel="noopener noreferrer">📹 Belépés a meetre</a>
                  <button type="button" className="btn" onClick={() => { void navigator.clipboard?.writeText(event.meetLink as string); }}>⧉ Link másolása</button>
                  {event.mstatus === 'tentative' && <span> · egyeztetés alatt</span>}
                </p>
              ) : (
                <div className="se-empty">Mentéskor automatikusan készül Google-naptár-pár Meet-linkkel (napra tett eseménynél) - a link mentés után itt és a részletezőben látszik.</div>
              )}
            </div>
            <div className="field full">
              <button type="button" className="btn" onClick={() => setSlotsOpen((o) => !o)}>📹 Javasolt időpontok - több opció {slotsOpen ? '▴' : '▾'}</button>
              {slotsOpen && (<>
                <MeetSlots slots={meetSlots.length ? meetSlots : [{ day: '', start: '', end: '' }]} onSlots={setMeetSlots} />
                <div className="due-preview">A kitöltött javaslatok a naptárban halvány, „függő" csíkként jelennek meg. Véglegesítéskor (részletező vagy Posta) a választott lesz az esemény időpontja.</div>
              </>)}
            </div>
            <div className="f-sec c-green">Leírás</div>
            <div className="field full">
              <label>Leírás</label>
              <GrowArea minRows={7} value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="mire kell készülni, mi kapcsolódik hozzá" />
            </div>
          </>)}
          {tab === 'tasks' && (<>
            <div className="f-sec c-yellow">Az esemény feladatai</div>
            <div className="field full">
              <label>Kapcsolt feladatok ({linked.length}){onOpenTask ? ' - kattintásra az esemény mentődik, és a feladat nyílik meg' : ''}</label>
              {linked.length === 0 && <div className="se-empty">Ehhez az eseményhez még nincs feladat.</div>}
              {linked.length > 0 && (
                <div className="mt-tasklist">
                  {linked.map((t) => (
                    <button key={t.id} type="button" className="mt-task" disabled={!onOpenTask}
                      onClick={() => { if (!d.title.trim() || !onOpenTask) return; save(); onOpenTask(t.id); }}>
                      <span className={`mt-tst st-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                      <span className="t">{t.title}</span>
                      <span className="m">☑ {stepsDone(t)}/{taskSteps(t).length}{t.owner ? ` · ${t.owner}` : ''}{(t.dueDate || t.due) ? ` · ⏱ ${fmtDueHu(t.dueDate) || t.due}` : ''}</span>
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
              <label>Felelős - az állandó listából</label>
              <OwnerSelect value={d.owner} roster={roster} onChange={(v) => set('owner', v)} />
            </div>
            <div className="field full">
              <label>Résztvevők - keress névre, vagy nyiss meg egy kategóriát</label>
              <PeoplePicker selected={people} roster={roster} groups={rosterGroups} onToggle={togglePerson} onSet={setPeople} />
            </div>
          </>)}
          {tab === 'mail' && (
            <MailTab letters={letters ?? []} title={d.title} onNotify={onNotify}
              saveFirst={() => { if (!d.title.trim()) return false; save(); return true; }}
              onOpenLetter={onOpenLetter} onLetterStatus={onLetterStatus} onNotifyTopic={onNotifyTopic} />
          )}
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
            <GrowArea minRows={9} value={v} onChange={(e) => setV(e.target.value)} />
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
