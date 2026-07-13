'use client';

import { useState } from 'react';
import { Agenda, AgendaEvent, STATUS_LABEL, eventHasPerson } from '@/data/agenda';
import { PersonKind } from '@/data/people';
import EventsCalendar from './EventsCalendar';
import { PersonChip } from './AgendaView';
import PageHead from './PageHead';

interface Props {
  agenda: Agenda;
  q: string;
  instr: string;                          // aktív név-szűrő — üres = mindenki
  kindOf: Record<string, PersonKind>;     // név -> Tanár/Hallgató badge
  letterStats: Record<string, { n: number; drafts: number }>; // esemény-id → kapcsolt levelek száma / vázlatok
  onAdd: () => void;
  onEdit: (id: string) => void;
  onEditTask: (id: string) => void;       // eseményhez kötött feladat megnyitása
  onAddTaskFor: (eventId: string) => void; // új feladat rögtön ehhez az eseményhez kötve
  onPerson: (name: string) => void;
  onNotify: (id: string) => void;         // értesítés az esemény résztvevőinek
  emailFor: (name: string) => string | null; // a Névjegyzékből — a Meet-meghívó vendégeihez
}

// Google Naptár-esemény előtöltve Meet videohívással (vcon=meet): cím, időpont,
// helyszín, leírás és a résztvevők email-címei már ki vannak töltve, csak menteni kell.
const meetUrl = (e: AgendaEvent, emails: string[]): string => {
  const p = new URLSearchParams({ text: e.title, vcon: 'meet', hl: 'hu' });
  if (e.day) {
    // ha a "when" szövegben van óra:perc, azt vesszük kezdésnek, különben 9:00; hossz 1 óra
    const m = e.when.match(/(\d{1,2})[:.](\d{2})/);
    const h = m ? Math.min(23, parseInt(m[1], 10)) : 9;
    const mi = m ? m[2] : '00';
    const d = e.day.replace(/-/g, '');
    const hh = String(h).padStart(2, '0');
    const he = String(Math.min(23, h + 1)).padStart(2, '0');
    p.set('dates', `${d}T${hh}${mi}00/${d}T${he}${mi}00`);
  }
  if (e.place) p.set('location', e.place);
  if (e.note) p.set('details', e.note);
  if (emails.length > 0) p.set('add', emails.join(','));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&${p.toString()}`;
};

export default function EventsView({ agenda, q, instr, kindOf, letterStats, onAdd, onEdit, onEditTask, onAddTaskFor, onPerson, onNotify, emailFor }: Props) {
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
                    {letterStats[e.id] && (
                      <button className={`ag-mailsum${letterStats[e.id].drafts ? ' has-draft' : ''}`}
                        title={`${letterStats[e.id].n} kapcsolt levél${letterStats[e.id].drafts ? `, ebből ${letterStats[e.id].drafts} vázlat` : ''} — megnyitás a levélíróban`}
                        onClick={(ev) => { ev.stopPropagation(); onNotify(e.id); }}>✉ {letterStats[e.id].n}</button>
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
                    <button className="ev-task meet" title="Google Meet találkozó szervezése: naptár-esemény előtöltve videohívással, résztvevőkkel"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const emails = [e.owner, ...e.people].filter((n): n is string => !!n).map(emailFor).filter((x): x is string => !!x);
                        window.open(meetUrl(e, [...new Set(emails)]), '_blank', 'noopener');
                      }}>📹 Meet</button>
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
