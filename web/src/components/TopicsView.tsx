'use client';

import { useMemo, useState } from 'react';
import { TOPIC_TEMPLATES, TOPIC_GROUPS, TopicTemplate, TopicCtx } from '@/lib/topics';

// Sablontár nézet: a teljes, tanévet lefedő levélsablon-készlet böngészhetően.
// Kattintásra előnézet nyílik, onnan egy gombbal indul a levélírás a sablonnal.

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// üres kontextus: az előnézetben a [szögletes] kitöltendő helyek látszanak
const CTX: TopicCtx = { title: '', when: null, place: null, due: null };

export default function TopicsView({ onCompose }: { onCompose: (t: TopicTemplate) => void }) {
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => TOPIC_TEMPLATES.filter((t) =>
    (!grp || t.group === grp) &&
    (!q.trim() || norm(`${t.label} ${t.group} ${t.subject(CTX)} ${t.body(CTX)}`).includes(norm(q)))
  ), [q, grp]);

  return (
    <section className="wrap tpv">
      <header className="tp-head-block">
        <h2 className="tp-title">✉ Levélsablonok <span className="tp-count">{TOPIC_TEMPLATES.length}</span></h2>
        <p className="tp-sub">A tanév egészét lefedő sablontár az elküldött leveleid mintáiból. Kattints egy sablonra az előnézethez, majd indíts belőle levelet: csak a [szögletes] mezőket kell kitölteni, az aláírás automatikusan a levél végére kerül. Ugyanez a tár a feladatok és események levélírójában is ott van a szöveg mellett.</p>
      </header>
      <div className="tp-tools">
        <input className="nm-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés a sablonokban (cím, tárgy, szöveg)…" />
        <div className="cat-picker">
          <button type="button" className={`chip${grp === '' ? ' is-on' : ''}`} onClick={() => setGrp('')}>Mind</button>
          {TOPIC_GROUPS.map((g) => (
            <button key={g} type="button" className={`chip${grp === g ? ' is-on' : ''}`} onClick={() => setGrp((v) => (v === g ? '' : g))}>{g}</button>
          ))}
        </div>
      </div>
      {list.length === 0 && <p className="tp-empty">Nincs találat. Próbáld rövidebb kereséssel vagy másik csoporttal.</p>}
      {TOPIC_GROUPS.map((g) => {
        const items = list.filter((t) => t.group === g);
        if (!items.length) return null;
        return (
          <div key={g} className="tp-group">
            <h3 className="tp-gh">{g} <span className="tp-gcount">{items.length}</span></h3>
            <div className="tp-list">
              {items.map((t) => (
                <div key={t.id} className={`tp-card${open === t.id ? ' is-open' : ''}`}>
                  <button type="button" className="tp-card-head" onClick={() => setOpen((v) => (v === t.id ? null : t.id))}>
                    <span className="tp-label">{t.label}</span>
                    <span className="tp-subj">Tárgy: {t.subject(CTX)}</span>
                  </button>
                  {open === t.id && (
                    <>
                      <pre className="tp-body">{t.body(CTX)}</pre>
                      <div className="tp-actions">
                        <button type="button" className="btn btn--ink" onClick={() => onCompose(t)}>✉ Levélírás ebből a sablonból</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
