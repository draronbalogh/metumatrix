'use client';

import { useMemo, useState } from 'react';
import {
  Agenda, AgendaTask, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_ORDER, TASK_CATEGORIES,
  TaskPriority, taskHasPerson, eventHasPerson, taskSteps, stepsDone,
} from '@/data/agenda';
import { PersonKind } from '@/data/people';

interface Props {
  agenda: Agenda;
  q: string;
  instr: string;                       // aktív név-szűrő (oktató vagy hallgató) — üres = mindenki
  taught: string[];                    // a szűrt személy tanított tárgyai (tantervből)
  kindOf: Record<string, PersonKind>;  // név -> Tanár/Hallgató badge
  letterStats: Record<string, { n: number; drafts: number }>; // tétel-id → kapcsolt levelek száma / vázlatok
  onAdd: () => void;
  onEdit: (id: string) => void;
  onEditIntro: () => void;
  onPerson: (name: string) => void;    // név-szűrő ki/be
  onNotify: (id: string) => void;      // értesítés küldése a feladat résztvevőinek
  onToggleDone: (id: string) => void;  // pipa: kész / nem kész
  onToggleDoing: (id: string) => void; // Folyamatban jelölő
  onCyclePriority: (id: string) => void;
  onToggleStep: (id: string, ix: number) => void; // alfeladat-pipa a kártyán
}

// rövid név az alfeladat-badge-hez: a titulusok nélküli első (vezeték)név
const familyName = (n: string): string =>
  n.trim().split(/\s+/).filter((p) => !/^dr\.?$/i.test(p) && !/^habil\.?$/i.test(p))[0] ?? n;
const fmtStepDue = (d?: string | null): string => (d && d.length >= 10 ? `${d.slice(5, 7)}.${d.slice(8, 10)}.` : '');

export function PersonChip({ name, star, on, kind, onClick }: { name: string; star?: boolean; on: boolean; kind?: PersonKind; onClick: () => void }) {
  return (
    <button className={`ag-pp${on ? ' is-on' : ''}`} title={`Szűrés rá: ${name}${star ? ' (felelős)' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {kind && <span className={`pb ${kind === 'T' ? 't' : 'h'}`}>{kind}</span>}
      {star ? '★ ' : ''}{name}
    </button>
  );
}

type GroupBy = 'newest' | 'oldest' | 'priority' | 'category' | 'status';
const IDEAS_ON_CARD = 3;
const UNCAT = 'Besorolatlan';
const prioRank = (p: TaskPriority) => PRIORITY_ORDER.indexOf(p);
// keletkezési sorrend-kulcs: az ISO createdAt (ms), enélkül a folytatólagos id sorszáma
// (t53 → 53) — így a dátum nélküli, régi kártyák a lista végére (legrégebbinek) sorolódnak
const createdKey = (t: AgendaTask): number => {
  if (t.createdAt) { const ms = Date.parse(t.createdAt); if (!Number.isNaN(ms)) return ms; }
  const n = parseInt((t.id.match(/\d+/) || ['0'])[0], 10);
  return Number.isNaN(n) ? 0 : n;
};
// ÚJ jelzés: a 72 órán belül keletkezett feladat villogó narancs címkét kap
export const isNewTask = (t: AgendaTask): boolean =>
  !!t.createdAt && Date.now() - Date.parse(t.createdAt) < 72 * 3600 * 1000;

export default function AgendaView({ agenda, q, instr, taught, kindOf, letterStats, onAdd, onEdit, onEditIntro, onPerson, onNotify, onToggleDone, onToggleDoing, onCyclePriority, onToggleStep }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('newest');
  const [catFilter, setCatFilter] = useState('');

  const matches = (t: AgendaTask) => {
    if (instr && !taskHasPerson(t, instr)) return false;
    if (catFilter && (t.category || UNCAT) !== catFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.summary.toLowerCase().includes(s)
      || taskSteps(t).some((st) => st.text.toLowerCase().includes(s)) || (t.owner || '').toLowerCase().includes(s)
      || t.people.some((p) => p.toLowerCase().includes(s)) || (t.category || '').toLowerCase().includes(s);
  };
  const shown = agenda.tasks.filter(matches);
  const open = shown.filter((t) => t.status !== 'done');
  const done = shown.filter((t) => t.status === 'done');
  const eventTitle = (id: string | null) => (id ? agenda.events.find((e) => e.id === id)?.title ?? null : null);
  const personEvents = instr ? agenda.events.filter((e) => eventHasPerson(e, instr)) : [];

  // a szűrősorhoz: a jelen lévő kategóriák (a névszűrőn átment feladatokból)
  const presentCats = useMemo(() => {
    const set = new Set<string>();
    agenda.tasks.filter((t) => !instr || taskHasPerson(t, instr)).forEach((t) => set.add(t.category || UNCAT));
    return [...TASK_CATEGORIES, UNCAT].filter((c) => set.has(c));
  }, [agenda.tasks, instr]);

  // rendezés egy szekción belül: prioritás, majd határidő, majd cím
  const byPrioThenDue = (a: AgendaTask, b: AgendaTask) =>
    prioRank(a.priority) - prioRank(b.priority)
    || (a.dueDate || 'zzz').localeCompare(b.dueDate || 'zzz')
    || a.title.localeCompare(b.title, 'hu');
  const byDue = (a: AgendaTask, b: AgendaTask) =>
    (a.dueDate || 'zzz').localeCompare(b.dueDate || 'zzz') || a.title.localeCompare(b.title, 'hu');

  // szekciók a csoportosítás szerint
  const sections: { key: string; label: string; cls: string; items: AgendaTask[] }[] = [];
  if (groupBy === 'newest' || groupBy === 'oldest') {
    const items = [...open].sort((a, b) => (groupBy === 'newest' ? createdKey(b) - createdKey(a) : createdKey(a) - createdKey(b)));
    if (items.length) sections.push({ key: groupBy, label: groupBy === 'newest' ? 'Legújabb elöl' : 'Legrégebbi elöl', cls: 'bydate', items });
  } else if (groupBy === 'priority') {
    PRIORITY_ORDER.forEach((p) => {
      const items = open.filter((t) => t.priority === p).sort(byDue);
      if (items.length) sections.push({ key: p, label: PRIORITY_LABEL[p], cls: `prio-${p}`, items });
    });
  } else if (groupBy === 'category') {
    [...TASK_CATEGORIES, UNCAT].forEach((c) => {
      const items = open.filter((t) => (t.category || UNCAT) === c).sort(byPrioThenDue);
      if (items.length) sections.push({ key: c, label: c, cls: 'cat', items });
    });
  } else {
    (['todo', 'doing'] as const).forEach((st) => {
      const items = open.filter((t) => t.status === st).sort(byPrioThenDue);
      if (items.length) sections.push({ key: st, label: STATUS_LABEL[st], cls: `st-${st}`, items });
    });
  }

  return (
    <main className="catalog agenda">
      <div className="cat-block-head">
        <span className="pl">Feladatok</span>
        <span className="nm">Média Design tanszék · 2026/27 ősz</span>
        <div className="viewtoggle ag-mode">
          <button className={groupBy === 'newest' ? 'is-on' : ''} onClick={() => setGroupBy('newest')} title="Dátum szerint: a legújabb feladat legelöl">📅 Új elöl</button>
          <button className={groupBy === 'oldest' ? 'is-on' : ''} onClick={() => setGroupBy('oldest')} title="Dátum szerint: a legrégebbi feladat legelöl">📅 Régi elöl</button>
          <button className={groupBy === 'priority' ? 'is-on' : ''} onClick={() => setGroupBy('priority')}>⚑ Prioritás</button>
          <button className={groupBy === 'category' ? 'is-on' : ''} onClick={() => setGroupBy('category')}>▦ Kategória</button>
          <button className={groupBy === 'status' ? 'is-on' : ''} onClick={() => setGroupBy('status')}>◔ Állapot</button>
        </div>
        <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új feladat</button>
      </div>

      {instr ? (
        <div className="ag-person">
          <div className="ag-person-head">
            <span className="ag-person-name">{instr}</span>
            <span className="ag-person-sum">{open.length} nyitott feladat · {done.length} kész · {personEvents.length} esemény</span>
            <button className="btn" onClick={() => onPerson(instr)}>✕ szűrő ki</button>
          </div>
          {taught.length > 0 && (
            <div className="ag-person-taught">
              <span className="ag-person-h">Oktat:</span>
              {taught.map((c) => <span key={c} className="cc-tag">{c}</span>)}
            </div>
          )}
          {personEvents.length > 0 && (
            <div className="ag-person-taught">
              <span className="ag-person-h">Eseményei:</span>
              {personEvents.map((e) => <span key={e.id} className="cc-tag ea">▤ {e.title}</span>)}
            </div>
          )}
        </div>
      ) : null}

      {presentCats.length > 0 && (
        <div className="ag-catfilter">
          <button className={`ag-cat${catFilter === '' ? ' is-on' : ''}`} onClick={() => setCatFilter('')}>Összes</button>
          {presentCats.map((c) => (
            <button key={c} className={`ag-cat${catFilter === c ? ' is-on' : ''}`} onClick={() => setCatFilter((v) => (v === c ? '' : c))}>{c}</button>
          ))}
        </div>
      )}

      {shown.length === 0 && (
        <div className="cc-empty">
          <span>{q || instr || catFilter ? 'Nincs a szűrőnek megfelelő feladat.' : 'Még nincs feladat.'}</span>
          {!q && !instr && !catFilter && <button onClick={onAdd}>+ Feladat felvétele</button>}
        </div>
      )}

      {sections.map((sec) => (
        <section className="cc-section" key={sec.key}>
          <div className={`cc-grp ag-grp ${sec.cls}`}>{sec.label} · {sec.items.length}</div>
          <div className="cc-grid">
            {sec.items.map((t) => {
              const steps = taskSteps(t);
              const doneN = stepsDone(t);
              return (
              <article key={t.id} className={`cc-card ag-card prio-${t.priority}${t.status === 'doing' ? ' is-doing' : ''}`} onClick={() => onEdit(t.id)}>
                <div className="cc-accent" />
                <div className="ag-cardtop">
                  <button className="ag-check" title="Kész — pipa" onClick={(e) => { e.stopPropagation(); onToggleDone(t.id); }} />
                  <div className="cc-name">{isNewTask(t) && <span className="ag-new">ÚJ</span>}{t.title}</div>
                </div>
                <div className="ag-badges">
                  <button className={`ag-prio ${t.priority}`} title={`Prioritás: ${PRIORITY_LABEL[t.priority]} — kattints a váltáshoz`} onClick={(e) => { e.stopPropagation(); onCyclePriority(t.id); }}>⚑ {PRIORITY_LABEL[t.priority]}</button>
                  {t.category && <button className="ag-cat on-card" title={`Szűrés: ${t.category}`} onClick={(e) => { e.stopPropagation(); setCatFilter((v) => (v === t.category ? '' : (t.category as string))); }}>{t.category}</button>}
                  <button className={`ag-doing${t.status === 'doing' ? ' is-on' : ''}`} title="Folyamatban jelölő" onClick={(e) => { e.stopPropagation(); onToggleDoing(t.id); }}>▶ Folyamatban</button>
                  {steps.length > 0 && <span className={`ag-stepsum${doneN === steps.length ? ' all-done' : ''}`} title="Kész alfeladatok / összes">☑ {doneN}/{steps.length}</span>}
                  {letterStats[t.id] && (
                    <button className={`ag-mailsum${letterStats[t.id].drafts ? ' has-draft' : ''}`}
                      title={`${letterStats[t.id].n} kapcsolt levél${letterStats[t.id].drafts ? `, ebből ${letterStats[t.id].drafts} vázlat` : ''} — megnyitás a levélíróban`}
                      onClick={(e) => { e.stopPropagation(); onNotify(t.id); }}>✉ {letterStats[t.id].n}</button>
                  )}
                </div>
                {t.summary && <div className="cc-desc">{t.summary}</div>}
                {steps.length > 0 && (
                  <ul className="ag-ideas ag-steps">
                    {steps.slice(0, IDEAS_ON_CARD).map((s, ix) => (
                      <li key={ix} className={s.done ? 'is-done' : ''}>
                        <button className={`ag-scheck${s.done ? ' is-on' : ''}`} title={s.done ? 'Visszaállítás nyitottra' : 'Alfeladat kész — pipa'}
                          onClick={(e) => { e.stopPropagation(); onToggleStep(t.id, ix); }}>{s.done ? '✓' : ''}</button>
                        <span className="tx">{s.text}</span>
                        {(s.owner || s.due) && (
                          <span className="ag-smeta">
                            {s.owner ? `👤 ${familyName(s.owner)}` : ''}{s.owner && s.due ? ' · ' : ''}{s.due ? `📅 ${fmtStepDue(s.due)}` : ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {steps.length > IDEAS_ON_CARD && <div className="ag-more">+ {steps.length - IDEAS_ON_CARD} további alfeladat…</div>}
                {(t.owner || t.due || t.dueDate || t.people.length > 0 || t.eventId) && (
                  <div className="cc-meta">
                    {t.owner && <PersonChip name={t.owner} star on={instr === t.owner} kind={kindOf[t.owner]} onClick={() => onPerson(t.owner as string)} />}
                    {t.people.map((p) => <PersonChip key={p} name={p} on={instr === p} kind={kindOf[p]} onClick={() => onPerson(p)} />)}
                    {(t.due || t.dueDate) && <span className="cc-tag ea">⏱ {t.due || t.dueDate}</span>}
                    {t.eventId && eventTitle(t.eventId) && <span className="cc-tag ev">▤ {eventTitle(t.eventId)}</span>}
                  </div>
                )}
                <button className="ag-notify" title="Értesítés küldése a résztvevőknek" onClick={(e) => { e.stopPropagation(); onNotify(t.id); }}>✉ Értesítés</button>
              </article>
              );
            })}
          </div>
        </section>
      ))}

      {done.length > 0 && (
        <section className="cc-section">
          <div className="cc-grp ag-grp st-done">Kész · {done.length}</div>
          <div className="ag-done-list">
            {done.map((t) => (
              <div key={t.id} className="ag-done-row">
                <button className="ag-check is-on" title="Visszaállítás nyitottra" onClick={() => onToggleDone(t.id)}>✓</button>
                <button className="ag-done-open" onClick={() => onEdit(t.id)} title="Megnyitás">
                  <span className="nm">{t.title}</span>
                  {t.category && <span className="cat">{t.category}</span>}
                  {(t.people.length > 0 || t.owner) && <span className="pp">{[t.owner, ...t.people].filter(Boolean).join(', ')}</span>}
                  {t.eventId && eventTitle(t.eventId) && <span className="evt">▤ {eventTitle(t.eventId)}</span>}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
