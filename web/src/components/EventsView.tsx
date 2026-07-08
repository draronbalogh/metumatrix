'use client';

import { useState } from 'react';
import { Agenda, AgendaEvent, STATUS_LABEL, eventHasPerson } from '@/data/agenda';
import { PersonKind } from '@/data/people';
import EventsCalendar from './EventsCalendar';
import { PersonChip } from './AgendaView';

interface Props {
  agenda: Agenda;
  q: string;
  instr: string;                          // aktív név-szűrő — üres = mindenki
  kindOf: Record<string, PersonKind>;     // név -> Tanár/Hallgató badge
  onAdd: () => void;
  onEdit: (id: string) => void;
  onEditTask: (id: string) => void;       // eseményhez kötött feladat megnyitása
  onAddTaskFor: (eventId: string) => void; // új feladat rögtön ehhez az eseményhez kötve
  onPerson: (name: string) => void;
  onNotify: (id: string) => void;         // értesítés az esemény résztvevőinek
}

export default function EventsView({ agenda, q, instr, kindOf, onAdd, onEdit, onEditTask, onAddTaskFor, onPerson, onNotify }: Props) {
  const [mode, setMode] = useState<'list' | 'cal'>('list');

  const matches = (e: AgendaEvent) => {
    if (instr && !eventHasPerson(e, instr)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return e.title.toLowerCase().includes(s) || (e.note || '').toLowerCase().includes(s)
      || e.when.toLowerCase().includes(s) || (e.place || '').toLowerCase().includes(s)
      || (e.owner || '').toLowerCase().includes(s) || e.people.some((p) => p.toLowerCase().includes(s));
  };
  // dátum szerint rendezve; a sort nélküliek (bizonytalan időpont) a lista végére
  const shown = agenda.events.filter(matches).sort((a, b) => {
    const ka = a.day || a.sort, kb = b.day || b.sort;
    if (ka && kb) return ka.localeCompare(kb) || a.title.localeCompare(b.title, 'hu');
    if (ka) return -1;
    if (kb) return 1;
    return a.title.localeCompare(b.title, 'hu');
  });
  const tasksFor = (eid: string) => agenda.tasks.filter((t) => t.eventId === eid);

  return (
    <main className="catalog agenda">
      <div className="cat-block-head">
        <span className="pl">Események</span>
        <span className="nm">szakos események · 2026/27 ősz</span>
        <div className="viewtoggle ag-mode">
          <button className={mode === 'list' ? 'is-on' : ''} onClick={() => setMode('list')}>≡ Lista</button>
          <button className={mode === 'cal' ? 'is-on' : ''} onClick={() => setMode('cal')}>▦ Naptár</button>
        </div>
        <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új esemény</button>
      </div>

      {instr && (
        <div className="ag-person slim">
          <div className="ag-person-head">
            <span className="ag-person-name">{instr}</span>
            <span className="ag-person-sum">{shown.length} esemény</span>
            <button className="btn" onClick={() => onPerson(instr)}>✕ szűrő ki</button>
          </div>
        </div>
      )}

      {shown.length === 0 && (
        <div className="cc-empty">
          <span>{q || instr ? 'Nincs a szűrőnek megfelelő esemény.' : 'Még nincs esemény.'}</span>
          {!q && !instr && <button onClick={onAdd}>+ Esemény felvétele</button>}
        </div>
      )}


      {mode === 'cal' ? (
        <EventsCalendar events={shown} onEdit={onEdit} />
      ) : (
        <div className="ev-list">
          {shown.map((e) => {
            const linked = tasksFor(e.id);
            const doneN = linked.filter((t) => t.status === 'done').length;
            return (
              <article key={e.id} className={`cc-card ev-card${e.featured ? ' is-featured' : ''}`} onClick={() => onEdit(e.id)}>
                <div className="ev-when">{e.when}{e.day && <span className="ev-day">{Number(e.day.slice(8, 10))}.</span>}</div>
                <div className="ev-body">
                  <div className="cc-name">
                    {e.featured && <span className="ev-star" title="Kiemelt esemény">★ </span>}
                    {e.title}
                    {linked.length > 0 && (
                      <span className={`ev-progress${doneN === linked.length ? ' all-done' : ''}`} title="Kapcsolt feladatok készültsége">
                        {doneN}/{linked.length} kész
                      </span>
                    )}
                  </div>
                  {e.note && <div className="cc-desc">{e.note}</div>}
                  {(e.place || e.owner || e.people.length > 0) && (
                    <div className="cc-meta">
                      {e.place && <span className="cc-tag">📍 {e.place}</span>}
                      {e.owner && (
                        <PersonChip name={e.owner} star on={instr === e.owner} kind={kindOf[e.owner]} onClick={() => onPerson(e.owner as string)} />
                      )}
                      {e.people.map((p) => (
                        <PersonChip key={p} name={p} on={instr === p} kind={kindOf[p]} onClick={() => onPerson(p)} />
                      ))}
                    </div>
                  )}
                  <div className="ev-tasks">
                    {linked.map((t) => (
                      <button key={t.id} className={`ev-task st-${t.status}`} title={`${STATUS_LABEL[t.status]} — megnyitás`}
                        onClick={(ev) => { ev.stopPropagation(); onEditTask(t.id); }}>
                        <span className="dot" />{t.title}
                      </button>
                    ))}
                    <button className="ev-task add" title="Új feladat ehhez az eseményhez"
                      onClick={(ev) => { ev.stopPropagation(); onAddTaskFor(e.id); }}>+ feladat</button>
                    <button className="ev-task notify" title="Értesítés küldése a résztvevőknek"
                      onClick={(ev) => { ev.stopPropagation(); onNotify(e.id); }}>✉ értesítés</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
