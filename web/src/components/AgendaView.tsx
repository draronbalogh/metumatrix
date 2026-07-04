'use client';

import { Agenda, AgendaTask, STATUS_LABEL, STATUS_ORDER, TaskStatus } from '@/data/agenda';

interface Props {
  agenda: Agenda;
  q: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onCycle: (id: string) => void;
  onEditIntro: () => void;
}

const IDEAS_ON_CARD = 3;

export default function AgendaView({ agenda, q, onAdd, onEdit, onCycle, onEditIntro }: Props) {
  const matches = (t: AgendaTask) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.summary.toLowerCase().includes(s)
      || t.ideas.some((i) => i.toLowerCase().includes(s)) || (t.owner || '').toLowerCase().includes(s);
  };
  const shown = agenda.tasks.filter(matches);

  return (
    <main className="catalog agenda">
      <div className="cat-block-head">
        <span className="pl">Feladatok</span>
        <span className="nm">Média Design tanszék · 2026/27 ősz</span>
        <button className="btn btn--ink ag-add" onClick={onAdd}>+ Új feladat</button>
      </div>

      <div className="ag-intro">
        <p>{agenda.intro}</p>
        <button className="btn ag-intro-edit" title="Bevezető szerkesztése" onClick={onEditIntro}>✎</button>
      </div>

      {shown.length === 0 && (
        <div className="cc-empty">
          <span>{q ? 'Nincs a keresésnek megfelelő feladat.' : 'Még nincs feladat.'}</span>
          {!q && <button onClick={onAdd}>+ Feladat felvétele</button>}
        </div>
      )}

      {STATUS_ORDER.map((st: TaskStatus) => {
        const items = shown.filter((t) => t.status === st);
        if (!items.length) return null;
        return (
          <section className="cc-section" key={st}>
            <div className={`cc-grp ag-grp st-${st}`}>{STATUS_LABEL[st]} · {items.length}</div>
            <div className="cc-grid">
              {items.map((t) => (
                <article key={t.id} className={`cc-card ag-card st-${t.status}`} onClick={() => onEdit(t.id)}>
                  <div className="cc-accent" />
                  <button
                    className={`ag-status st-${t.status} nodrag`}
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
                  {(t.owner || t.due) && (
                    <div className="cc-meta">
                      {t.owner && <span className="cc-tag">{t.owner}</span>}
                      {t.due && <span className="cc-tag ea">⏱ {t.due}</span>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
