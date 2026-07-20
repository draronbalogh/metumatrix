'use client';

import { useMemo, useState } from 'react';
import {
  Agenda, AgendaTask, STATUS_LABEL, PRIORITY_LABEL, PRIORITY_ORDER, TASK_CATEGORIES,
  TaskPriority, TaskStar, taskHasPerson, eventHasPerson, taskSteps, stepsDone, fmtDueHu, fmtDayHu, isAwaiting,
  urgencyRank, nextStarFor,
} from '@/data/agenda';
import { PersonKind } from '@/data/people';
import PageHead from './PageHead';

interface Props {
  agenda: Agenda;
  q: string;
  instr: string;                       // aktív név-szűrő (oktató vagy hallgató) - üres = mindenki
  taught: string[];                    // a szűrt személy tanított tárgyai (tantervből)
  letterStats: Record<string, { n: number; drafts: number }>; // tétel-id → kapcsolt levelek száma / vázlatok
  onAdd: () => void;
  onOpen: (id: string) => void;        // a feladat RÉSZLETEZŐJE (drawer) - innen nyílik minden más
  onOpenPost: (sel: string) => void;   // ugrás a Postába erre a levélre (válaszra vár / kész válasz)
  onEditIntro: () => void;
  onPerson: (name: string) => void;    // név-szűrő ki/be
  onToggleDone: (id: string) => void;  // pipa: kész / nem kész
  onCyclePriority: (id: string) => void;
  onSetStar: (id: string, star: TaskStar | null) => void; // kézi ⭐ a Legfontosabbak sávhoz
  onOpenEvent: (id: string) => void;   // kapcsolt esemény részletezője
}

// rövid név a meta-sor badge-eihez: a titulusok nélküli első (vezeték)név
export const familyName = (n: string): string =>
  n.trim().split(/\s+/).filter((p) => !/^dr\.?$/i.test(p) && !/^habil\.?$/i.test(p))[0] ?? n;

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
const UNCAT = 'Besorolatlan';
const prioRank = (p: TaskPriority) => PRIORITY_ORDER.indexOf(p);
// keletkezési sorrend-kulcs: az ISO createdAt (ms), enélkül a folytatólagos id sorszáma
// (t53 → 53) - így a dátum nélküli, régi kártyák a lista végére (legrégebbinek) sorolódnak
const createdKey = (t: AgendaTask): number => {
  if (t.createdAt) { const ms = Date.parse(t.createdAt); if (!Number.isNaN(ms)) return ms; }
  const n = parseInt((t.id.match(/\d+/) || ['0'])[0], 10);
  return Number.isNaN(n) ? 0 : n;
};
// ÚJ jelzés: a 72 órán belül keletkezett feladat villogó narancs címkét kap
export const isNewTask = (t: AgendaTask): boolean =>
  !!t.createdAt && Date.now() - Date.parse(t.createdAt) < 72 * 3600 * 1000;

const DAY_MS = 86400000;
// a rang- és ⭐-logika a data/agenda.ts-ben él (urgencyRank, nextStarFor) - a kézi
// felülbírálatot (star/starAt) is ott kezeli, így a drawer és a modál is ugyanazt látja

export default function AgendaView({ agenda, q, instr, taught, letterStats, onAdd, onOpen, onOpenPost, onEditIntro, onPerson, onToggleDone, onCyclePriority, onSetStar, onOpenEvent }: Props) {
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
  // LEGFONTOSABBAK: a nyitott feladatok közül a levél-ügyek + közeli határidő + magas
  // prioritás, egy tömör sávban elöl (a szűrők érvényesülnek, mert az `open`-ből dolgozik)
  const soon = Date.now() + 7 * DAY_MS;
  const important = open
    .filter((t) => urgencyRank(t, soon) < 99)
    .sort((a, b) => urgencyRank(a, soon) - urgencyRank(b, soon)
      || (a.dueDate || 'zzz').localeCompare(b.dueDate || 'zzz')
      || prioRank(a.priority) - prioRank(b.priority)
      || a.title.localeCompare(b.title, 'hu'))
    .slice(0, 8);
  const eventOf = (id: string | null) => (id ? agenda.events.find((e) => e.id === id) ?? null : null);
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
      <PageHead title="Feladatok" sub="Média Design tanszék · 2026/27 ősz">
        <div className="viewtoggle ag-mode">
          <button className={groupBy === 'newest' ? 'is-on' : ''} onClick={() => setGroupBy('newest')} title="Dátum szerint: a legújabb feladat legelöl">📅 Új elöl</button>
          <button className={groupBy === 'oldest' ? 'is-on' : ''} onClick={() => setGroupBy('oldest')} title="Dátum szerint: a legrégebbi feladat legelöl">📅 Régi elöl</button>
          <button className={groupBy === 'priority' ? 'is-on' : ''} onClick={() => setGroupBy('priority')}>⚑ Prioritás</button>
          <button className={groupBy === 'category' ? 'is-on' : ''} onClick={() => setGroupBy('category')}>▦ Kategória</button>
          <button className={groupBy === 'status' ? 'is-on' : ''} onClick={() => setGroupBy('status')}>◔ Állapot</button>
        </div>
        <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új feladat</button>
      </PageHead>

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

      {important.length > 0 && (
        <section className="cc-section ag-top">
          <div className="cc-grp ag-grp ag-top-h">⭐ Legfontosabbak · {important.length}</div>
          <div className="ag-toplist">
            {important.map((t) => {
              const r = urgencyRank(t, soon);
              return (
                <div key={t.id} className={`ag-toprow prio-${t.priority}`}>
                  <button type="button" className="ag-check" title="Kész - pipa" onClick={() => onToggleDone(t.id)} />
                  <button type="button" className="ag-star is-on" title="Kivétel a Legfontosabbak közül"
                    onClick={() => onSetStar(t.id, nextStarFor(t, soon))}>⭐</button>
                  <button type="button" className="ag-toprow-open" onClick={() => onOpen(t.id)} title="Feladat megnyitása">
                    <span className="tt">{isNewTask(t) && <span className="ag-new">ÚJ</span>}{t.title}</span>
                    {t.source?.returned ? <span className="b hot">✉ új válasz kell</span>
                      : isAwaiting(t.source) ? <span className="b hot">✉ válaszra vár</span>
                      : t.source?.status === 'drafted' ? <span className="b warn">✉ válasz kész</span> : null}
                    {(t.dueDate || t.due) && <span className={`b${r === 3 ? ' hot' : ''}`}>📅 {t.dueDate ? fmtDueHu(t.dueDate) : t.due}</span>}
                    {t.priority === 'high' && <span className="b prio">⚑</span>}
                  </button>
                  {(() => { const ev = eventOf(t.eventId); return ev ? (
                    <button type="button" className="evbtn" title={`Kapcsolt esemény: ${ev.title}`}
                      onClick={() => onOpenEvent(ev.id)}>▤ {ev.day ? fmtDayHu(ev.day) : ev.title}</button>
                  ) : null; })()}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sections.map((sec) => (
        <section className="cc-section" key={sec.key}>
          <div className={`cc-grp ag-grp ${sec.cls}`}>{sec.label} · {sec.items.length}</div>
          <div className="cc-grid">
            {sec.items.map((t) => {
              const steps = taskSteps(t);
              const doneN = stepsDone(t);
              const ls = letterStats[t.id];
              return (
              // TÖMÖR kártya: cím-sor + meta-sor - minden részlet a részletezőben (koppintásra)
              <article key={t.id} className={`cc-card agc prio-${t.priority}${t.status === 'doing' ? ' is-doing' : ''}`} onClick={() => onOpen(t.id)}>
                <div className="agc-top">
                  <button className="ag-check" title="Kész - pipa" onClick={(e) => { e.stopPropagation(); onToggleDone(t.id); }} />
                  <span className="agc-title">{isNewTask(t) && <span className="ag-new">ÚJ</span>}{t.title}</span>
                  {/* prioritás-címke CSAK a magasnál - a többi szintet a bal színsáv jelzi, a címke mindenhol csak zaj volt */}
                  {t.priority === 'high' && (
                    <button className="ag-prio high" title={`Prioritás: ${PRIORITY_LABEL[t.priority]} - kattints a váltáshoz`} onClick={(e) => { e.stopPropagation(); onCyclePriority(t.id); }}>⚑ {PRIORITY_LABEL[t.priority]}</button>
                  )}
                </div>
                <div className="agc-meta">
                  <button type="button" className={`ag-star${urgencyRank(t, soon) < 99 ? ' is-on' : ''}`}
                    title={urgencyRank(t, soon) < 99 ? 'Kivétel a Legfontosabbak közül' : 'Kiemelés a Legfontosabbak közé'}
                    onClick={(e) => { e.stopPropagation(); onSetStar(t.id, nextStarFor(t, soon)); }}>{urgencyRank(t, soon) < 99 ? '⭐' : '☆'}</button>
                  {(t.dueDate || t.due) && <span className="m">📅 {t.dueDate ? fmtDueHu(t.dueDate) : t.due}</span>}
                  {t.owner && <span className="m">👤 {familyName(t.owner)}{t.people.length > 0 ? ` +${t.people.length}` : ''}</span>}
                  {(t.meetLink || t.source?.meetLink) && <a className="m" href={(t.meetLink || t.source?.meetLink) as string} target="_blank" rel="noopener noreferrer" title="Google Meet belépés" onClick={(ev) => ev.stopPropagation()}>📹 Meet</a>}
                  {steps.length > 0 && <span className={`m${doneN === steps.length ? ' ok' : ''}`}>☑ {doneN}/{steps.length}</span>}
                  {ls && <span className={`m${ls.drafts ? ' warn' : ''}`}>✉ {ls.n}</span>}
                  {(t.source?.attachments?.length ?? 0) > 0 && <span className="m" title="A levélnek van melléklete - a Postában megnyitható">📎 {t.source?.attachments?.length}</span>}
                  {isAwaiting(t.source) && <button type="button" className="m hot mbtn" title="Levél érkezett - ugrás a Postába, választervekkel (Titkárnő, küldés)" onClick={(e) => { e.stopPropagation(); onOpenPost(`t:${t.id}`); }}>✉ válaszra vár{t.source?.returned ? ' (új)' : ''}</button>}
                  {t.source?.status === 'drafted' && <button type="button" className="m warn mbtn" title="Megírt válasz - ugrás a Postába (másolható/küldhető)" onClick={(e) => { e.stopPropagation(); onOpenPost(`t:${t.id}`); }}>✉ válasz kész</button>}
                  {t.status === 'doing' && <span className="m doing">▶ folyamatban</span>}
                  {(() => { const ev = eventOf(t.eventId); return ev ? (
                    <button type="button" className="m ev evbtn" title={`Kapcsolt esemény megnyitása: ${ev.title}`}
                      onClick={(e) => { e.stopPropagation(); onOpenEvent(ev.id); }}>▤ {ev.title}{ev.day ? ` · ${fmtDayHu(ev.day)}` : ''}</button>
                  ) : null; })()}
                </div>
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
                <button className="ag-done-open" onClick={() => onOpen(t.id)} title="Megnyitás">
                  <span className="nm">{t.title}</span>
                  {t.category && <span className="cat">{t.category}</span>}
                  {(t.people.length > 0 || t.owner) && <span className="pp">{[t.owner, ...t.people].filter(Boolean).join(', ')}</span>}
                  {t.eventId && eventOf(t.eventId) && <span className="evt">▤ {eventOf(t.eventId)?.title}</span>}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <button type="button" className="ag-fab" title="Új feladat" onClick={onAdd}>+</button>
    </main>
  );
}
