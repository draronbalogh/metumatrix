'use client';

import { Agenda, AgendaEvent } from '@/data/agenda';

interface Props {
  agenda: Agenda;
  q: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
}

export default function EventsView({ agenda, q, onAdd, onEdit }: Props) {
  const matches = (e: AgendaEvent) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return e.title.toLowerCase().includes(s) || (e.note || '').toLowerCase().includes(s)
      || e.when.toLowerCase().includes(s) || (e.place || '').toLowerCase().includes(s) || (e.owner || '').toLowerCase().includes(s);
  };
  // dátum szerint rendezve; a sort nélküliek (bizonytalan időpont) a lista végére
  const shown = agenda.events.filter(matches).sort((a, b) => {
    if (a.sort && b.sort) return a.sort.localeCompare(b.sort) || a.title.localeCompare(b.title, 'hu');
    if (a.sort) return -1;
    if (b.sort) return 1;
    return a.title.localeCompare(b.title, 'hu');
  });

  return (
    <main className="catalog agenda">
      <div className="cat-block-head">
        <span className="pl">Események</span>
        <span className="nm">szakos események · 2026/27 ősz</span>
        <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új esemény</button>
      </div>

      {shown.length === 0 && (
        <div className="cc-empty">
          <span>{q ? 'Nincs a keresésnek megfelelő esemény.' : 'Még nincs esemény.'}</span>
          {!q && <button onClick={onAdd}>+ Esemény felvétele</button>}
        </div>
      )}

      <div className="ev-list">
        {shown.map((e) => (
          <article key={e.id} className="cc-card ev-card" onClick={() => onEdit(e.id)}>
            <div className="ev-when">{e.when}</div>
            <div className="ev-body">
              <div className="cc-name">{e.title}</div>
              {e.note && <div className="cc-desc">{e.note}</div>}
              {(e.place || e.owner) && (
                <div className="cc-meta">
                  {e.place && <span className="cc-tag">📍 {e.place}</span>}
                  {e.owner && <span className="cc-tag">{e.owner}</span>}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
