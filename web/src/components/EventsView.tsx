'use client';

import { useState } from 'react';
import { Agenda, AgendaEvent, eventHasPerson, fmtDayHu, taskHasPerson, isAwaiting } from '@/data/agenda';
import EventsCalendar, { CalDeadline } from './EventsCalendar';
import { familyName } from './AgendaView';
import PageHead from './PageHead';

interface Props {
  agenda: Agenda;
  q: string;
  instr: string;                          // aktív név-szűrő - üres = mindenki
  letterStats: Record<string, { n: number; drafts: number }>; // esemény-id → kapcsolt levelek száma / vázlatok
  onAdd: () => void;
  onOpen: (id: string) => void;           // az esemény RÉSZLETEZŐJE (drawer) - innen nyílik minden más
  onOpenTask: (id: string) => void;       // a naptárban jelölt feladat-határidő → a feladat részletezője
  onPerson: (name: string) => void;
}

export default function EventsView({ agenda, q, instr, letterStats, onAdd, onOpen, onOpenTask, onPerson }: Props) {
  const [mode, setMode] = useState<'list' | 'cal'>('cal'); // alapból a naptár nyílik

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
  // a levél–feladat–naptár tengely: a NYITOTT feladatok határidői is a naptárra kerülnek
  const deadlines: CalDeadline[] = agenda.tasks
    .filter((t) => t.dueDate && t.status !== 'done'
      && (!instr || taskHasPerson(t, instr))
      && (!q || t.title.toLowerCase().includes(q.toLowerCase())))
    .map((t) => ({ id: t.id, title: t.title, day: t.dueDate as string, done: false }));

  return (
    <main className="catalog agenda">
      <PageHead title="Események" sub="szakos események · 2026/27 ősz">
        <div className="viewtoggle ag-mode">
          <button className={mode === 'list' ? 'is-on' : ''} onClick={() => setMode('list')}>≡ Lista</button>
          <button className={mode === 'cal' ? 'is-on' : ''} onClick={() => setMode('cal')}>▦ Naptár</button>
        </div>
        <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új esemény</button>
      </PageHead>

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
        <EventsCalendar events={shown} deadlines={deadlines} onEdit={onOpen} onTask={onOpenTask} />
      ) : (
        <div className="cc-grid">
          {shown.map((e) => {
            const linked = tasksFor(e.id);
            const doneN = linked.filter((t) => t.status === 'done').length;
            const ls = letterStats[e.id];
            return (
              // TÖMÖR kártya: cím-sor + meta-sor - minden részlet a részletezőben (koppintásra)
              <article key={e.id} className={`cc-card agc${e.featured ? ' is-featured' : ''}`} onClick={() => onOpen(e.id)}>
                <div className="agc-top">
                  <span className="agc-title">{e.featured && <span className="ev-star" title="Kiemelt esemény">★ </span>}{e.title}</span>
                </div>
                <div className="agc-meta noindent">
                  <span className="m">🕑 {e.day ? `${fmtDayHu(e.day)}${e.dayEnd ? ` – ${fmtDayHu(e.dayEnd)}` : ''}` : e.when}</span>
                  {e.place && <span className="m">📍 {e.place}</span>}
                  {e.owner && <span className="m">👤 {familyName(e.owner)}{e.people.length > 0 ? ` +${e.people.length}` : ''}</span>}
                  {linked.length > 0 && <span className={`m${doneN === linked.length ? ' ok' : ''}`}>▤ {doneN}/{linked.length} feladat</span>}
                  {ls && <span className={`m${ls.drafts ? ' warn' : ''}`}>✉ {ls.n}</span>}
                  {isAwaiting(e.source) && <span className="m hot" title="Levél érkezett, válaszra vár - a Postában elintézhető (választervekkel)">✉ válaszra vár{e.source?.returned ? ' (új)' : ''}</span>}
                  {e.source?.status === 'drafted' && <span className="m warn" title="Megírt válasz készen áll - a Postából másolható/küldhető">✉ válasz kész</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
