'use client';

import { Agenda, AgendaTask, STATUS_LABEL, STATUS_ORDER, taskHasPerson, eventHasPerson } from '@/data/agenda';

interface Props {
  agenda: Agenda;
  q: string;
  instr: string;                       // aktív név-szűrő (oktató vagy hallgató) — üres = mindenki
  taught: string[];                    // a szűrt személy tanított tárgyai (tantervből)
  onAdd: () => void;
  onEdit: (id: string) => void;
  onCycle: (id: string) => void;
  onEditIntro: () => void;
  onPerson: (name: string) => void;    // név-szűrő ki/be
}

const IDEAS_ON_CARD = 3;

export default function AgendaView({ agenda, q, instr, taught, onAdd, onEdit, onCycle, onEditIntro, onPerson }: Props) {
  const matches = (t: AgendaTask) => {
    if (instr && !taskHasPerson(t, instr)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.summary.toLowerCase().includes(s)
      || t.ideas.some((i) => i.toLowerCase().includes(s)) || (t.owner || '').toLowerCase().includes(s)
      || t.people.some((p) => p.toLowerCase().includes(s));
  };
  const shown = agenda.tasks.filter(matches);
  const open = shown.filter((t) => t.status !== 'done');
  const done = shown.filter((t) => t.status === 'done');
  const eventTitle = (id: string | null) => (id ? agenda.events.find((e) => e.id === id)?.title ?? null : null);
  const personEvents = instr ? agenda.events.filter((e) => eventHasPerson(e, instr)) : [];

  return (
    <main className="catalog agenda">
      <div className="cat-block-head">
        <span className="pl">Feladatok</span>
        <span className="nm">Média Design tanszék · 2026/27 ősz</span>
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
      ) : (
        <div className="ag-intro">
          <p>{agenda.intro}</p>
          <button className="btn ag-intro-edit" title="Bevezető szerkesztése" onClick={onEditIntro}>✎</button>
        </div>
      )}

      {shown.length === 0 && (
        <div className="cc-empty">
          <span>{q || instr ? 'Nincs a szűrőnek megfelelő feladat.' : 'Még nincs feladat.'}</span>
          {!q && !instr && <button onClick={onAdd}>+ Feladat felvétele</button>}
        </div>
      )}

      {STATUS_ORDER.filter((st) => st !== 'done').map((st) => {
        const items = open.filter((t) => t.status === st);
        if (!items.length) return null;
        return (
          <section className="cc-section" key={st}>
            <div className={`cc-grp ag-grp st-${st}`}>{STATUS_LABEL[st]} · {items.length}</div>
            <div className="cc-grid">
              {items.map((t) => (
                <article key={t.id} className={`cc-card ag-card st-${t.status}`} onClick={() => onEdit(t.id)}>
                  <div className="cc-accent" />
                  <button
                    className={`ag-status st-${t.status}`}
                    title={`Állapot léptetése: ${STATUS_LABEL[t.status]} → ${STATUS_LABEL[STATUS_ORDER[(STATUS_ORDER.indexOf(t.status) + 1) % 3]]}`}
                    onClick={(e) => { e.stopPropagation(); onCycle(t.id); }}
                  >{STATUS_LABEL[t.status]}</button>
                  <div className="cc-name">{t.title}</div>
                  {t.summary && <div className="cc-desc">{t.summary}</div>}
                  {t.ideas.length > 0 && (
                    <ul className="ag-ideas">
                      {t.ideas.slice(0, IDEAS_ON_CARD).map((i, ix) => <li key={ix}>{i}</li>)}
                    </ul>
                  )}
                  {t.ideas.length > IDEAS_ON_CARD && <div className="ag-more">+ {t.ideas.length - IDEAS_ON_CARD} további pont…</div>}
                  {(t.owner || t.due || t.people.length > 0 || t.eventId) && (
                    <div className="cc-meta">
                      {t.owner && (
                        <button className={`ag-pp${instr === t.owner ? ' is-on' : ''}`} title={`Szűrés rá: ${t.owner} (felelős)`}
                          onClick={(e) => { e.stopPropagation(); onPerson(t.owner as string); }}>★ {t.owner}</button>
                      )}
                      {t.people.map((p) => (
                        <button key={p} className={`ag-pp${instr === p ? ' is-on' : ''}`} title={`Szűrés rá: ${p}`}
                          onClick={(e) => { e.stopPropagation(); onPerson(p); }}>{p}</button>
                      ))}
                      {t.due && <span className="cc-tag ea">⏱ {t.due}</span>}
                      {t.eventId && eventTitle(t.eventId) && <span className="cc-tag ev">▤ {eventTitle(t.eventId)}</span>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      {done.length > 0 && (
        <section className="cc-section">
          <div className="cc-grp ag-grp st-done">Kész · {done.length}</div>
          <div className="ag-done-list">
            {done.map((t) => (
              <button key={t.id} className="ag-done-row" onClick={() => onEdit(t.id)} title="Megnyitás / visszaállítás">
                <span className="ck">✓</span>
                <span className="nm">{t.title}</span>
                {(t.people.length > 0 || t.owner) && (
                  <span className="pp">{[t.owner, ...t.people].filter(Boolean).join(', ')}</span>
                )}
                {t.eventId && eventTitle(t.eventId) && <span className="evt">▤ {eventTitle(t.eventId)}</span>}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
