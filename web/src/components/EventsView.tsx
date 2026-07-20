'use client';

import { useState } from 'react';
import { Agenda, AgendaEvent, eventHasPerson, fmtDayHu, placeIcon, taskHasPerson, isAwaiting } from '@/data/agenda';
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
  onOpenPost: (sel: string) => void;      // ugrás a Postába erre a levélre (válaszra vár / kész válasz)
  onPerson: (name: string) => void;
  onSyncOutlook?: () => void;             // az abalogh@metropolitan.hu Outlook-naptár behúzása (COM)
  onPublishGoogle?: () => void;           // ⇪ minden esemény egyirányú publikálása a Gmail-naptárba
  publishMsg?: string | null;             // a publikálás folyamat-/eredményüzenete
}

export default function EventsView({ agenda, q, instr, letterStats, onAdd, onOpen, onOpenTask, onOpenPost, onPerson, onSyncOutlook, onPublishGoogle, publishMsg }: Props) {
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

  const todayStr = new Date().toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <main className="catalog agenda">
      <PageHead title="Események" sub="szakos események · 2026/27 ősz">
        <div className="viewtoggle ag-mode">
          <button className={mode === 'list' ? 'is-on' : ''} onClick={() => setMode('list')}>≡ Lista</button>
          <button className={mode === 'cal' ? 'is-on' : ''} onClick={() => setMode('cal')}>▦ Naptár</button>
        </div>
        <div className="ag-actions">
          <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új esemény</button>
          {onSyncOutlook && <button className="btn" onClick={onSyncOutlook} title="A saját (abalogh@metropolitan.hu) Outlook-naptárad időpontjainak behúzása ide (a klasszikus Outlook fusson a gépen). Csak olvas, semmit nem változtat.">🔄 Outlook-naptár</button>}
          {onPublishGoogle && <button className="btn" onClick={onPublishGoogle} title="MINDEN itteni esemény (az Outlook-tükrök is) felmásolása a draronbalogh@gmail.com Google-naptárba. Egyirányú: a Gmailben kézzel felvett bejegyzések SOSEM kerülnek be ide.">⇪ Gmail-naptárba</button>}
        </div>
      </PageHead>
      <div className="ev-todaybar">📅 Ma: <b>{todayStr}</b>{publishMsg ? <span style={{ marginLeft: 14 }}>{publishMsg}</span> : null}</div>

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
                  {e.place && <span className="m">{placeIcon(e.place)} {e.place}</span>}
                  {e.owner && <span className="m">👤 {familyName(e.owner)}{e.people.length > 0 ? ` +${e.people.length}` : ''}</span>}
                  {e.meetLink && <a className="m" href={e.meetLink} target="_blank" rel="noopener noreferrer" title="Google Meet belépés" onClick={(ev) => ev.stopPropagation()}>📹 Meet</a>}
                  {linked.length > 0 && <span className={`m${doneN === linked.length ? ' ok' : ''}`}>▤ {doneN}/{linked.length} feladat</span>}
                  {ls && <span className={`m${ls.drafts ? ' warn' : ''}`}>✉ {ls.n}</span>}
                  {(e.source?.attachments?.length ?? 0) > 0 && <span className="m" title="A levélnek van melléklete - a Postában megnyitható">📎 {e.source?.attachments?.length}</span>}
                  {isAwaiting(e.source) && <button type="button" className="m hot mbtn" title="Levél érkezett - ugrás a Postába, választervekkel (Titkárnő, küldés)" onClick={(ev) => { ev.stopPropagation(); onOpenPost(`e:${e.id}`); }}>✉ válaszra vár{e.source?.returned ? ' (új)' : ''}</button>}
                  {e.source?.status === 'drafted' && <button type="button" className="m warn mbtn" title="Megírt válasz - ugrás a Postába (másolható/küldhető)" onClick={(ev) => { ev.stopPropagation(); onOpenPost(`e:${e.id}`); }}>✉ válasz kész</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <button type="button" className="ag-fab" title="Új esemény" onClick={onAdd}>+</button>
    </main>
  );
}
