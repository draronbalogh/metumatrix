'use client';

import { useMemo, useState } from 'react';
import { TOPIC_TEMPLATES, TOPIC_GROUPS, TopicTemplate, TopicCtx, autoFill } from '@/lib/topics';
import { Letter } from '@/data/agenda';

// Levelek központ: kétpaneles (levelezőkliens-szerű) nézet.
// Bal oldalt kereshető lista (sablontár VAGY mentett levelek), jobb oldalt állandó
// előnézet — másik elemre kattintva csak átvált, nem kell semmit bezárni.
// Mobilon drill-in: a lista után az előnézet külön "lapon" nyílik, ← vissza gombbal.

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// üres kontextus: az előnézetben a [szögletes] kitöltendő helyek látszanak
const CTX: TopicCtx = { title: '', when: null, place: null, due: null };

interface Props {
  letters: Letter[];
  onCompose: (t: TopicTemplate) => void;
  onOpenLetter: (l: Letter) => void;
  targetTitle: (l: Letter) => string | null;
}

export default function TopicsView({ letters, onCompose, onOpenLetter, targetTitle }: Props) {
  const [tab, setTab] = useState<'sablonok' | 'levelek'>('sablonok');
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState('');
  const [selT, setSelT] = useState<string | null>(null);   // kiválasztott sablon
  const [selL, setSelL] = useState<string | null>(null);   // kiválasztott mentett levél
  const [mobileDetail, setMobileDetail] = useState(false); // mobilon: lista helyett az előnézet látszik

  // teljes szövegű keresőindex (cím + csoport + tárgy + törzs), ékezet-függetlenül
  const index = useMemo(() => new Map(TOPIC_TEMPLATES.map((t) => [t.id, norm(`${t.label} ${t.group} ${t.subject(CTX)} ${t.body(CTX)}`)])), []);
  const tList = useMemo(() => TOPIC_TEMPLATES.filter((t) =>
    (!grp || t.group === grp) && (!q.trim() || (index.get(t.id) as string).includes(norm(q)))
  ), [q, grp, index]);

  const lSorted = useMemo(() => [...letters].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [letters]);
  const lList = useMemo(() => lSorted.filter((l) =>
    !q.trim() || norm(`${l.subject} ${l.body} ${l.names.join(' ')} ${targetTitle(l) ?? ''}`).includes(norm(q))
  ), [lSorted, q, targetTitle]);

  const curT = TOPIC_TEMPLATES.find((t) => t.id === selT) ?? null;
  const curL = letters.find((l) => l.id === selL) ?? null;

  const pickT = (id: string) => { setSelT(id); setMobileDetail(true); };
  const pickL = (id: string) => { setSelL(id); setMobileDetail(true); };
  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');
  const lKind = (l: Letter) => (l.targetType === 'task' ? 'Feladat' : l.targetType === 'event' ? 'Esemény' : 'Önálló levél');

  return (
    <section className="wrap tpv">
      <header className="tp-head-block">
        <h2 className="tp-title">✉ Levelek</h2>
        <p className="tp-sub">Egy helyen a teljes sablontár és minden elmentett leveled, teljes szövegű kereséssel. Balra a lista, jobbra az előnézet; a kiválasztott elemből egy gombbal nyílik az egységes levélszerkesztő, ahol a címzettek, a meeting és minden más beállítható. Ugyanez a szerkesztő nyílik a feladatok és események ✉ gombjáról is.</p>
      </header>
      <div className="chipradio tp-tabs">
        <button type="button" aria-pressed={tab === 'sablonok'} className={`crx c-blue${tab === 'sablonok' ? ' is-on' : ''}`}
          onClick={() => { setTab('sablonok'); setMobileDetail(false); }}>Sablontár ({TOPIC_TEMPLATES.length})</button>
        <button type="button" aria-pressed={tab === 'levelek'} className={`crx c-blue${tab === 'levelek' ? ' is-on' : ''}`}
          onClick={() => { setTab('levelek'); setMobileDetail(false); }}>Mentett levelek ({letters.length})</button>
      </div>
      <div className={`tp-split${mobileDetail ? ' is-detail' : ''}`}>
        <div className="tp-listcol">
          <input className="nm-search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'sablonok' ? 'Keresés a sablonokban (cím, tárgy, szöveg)…' : 'Keresés a mentett levelekben…'} />
          {tab === 'sablonok' && (
            <div className="cat-picker tp-grps">
              <button type="button" className={`chip${grp === '' ? ' is-on' : ''}`} onClick={() => setGrp('')}>Mind</button>
              {TOPIC_GROUPS.map((g) => (
                <button key={g} type="button" className={`chip${grp === g ? ' is-on' : ''}`} onClick={() => setGrp((v) => (v === g ? '' : g))}>{g}</button>
              ))}
            </div>
          )}
          <div className="tp-scroll">
            {tab === 'sablonok' ? (
              <>
                {tList.length === 0 && <p className="tp-empty">Nincs találat.</p>}
                {TOPIC_GROUPS.map((g) => {
                  const items = tList.filter((t) => t.group === g);
                  if (!items.length) return null;
                  return (
                    <div key={g}>
                      <div className="tp-gh">{g}</div>
                      {items.map((t) => (
                        <button key={t.id} type="button" aria-pressed={selT === t.id}
                          className={`tp-item${selT === t.id ? ' is-on' : ''}`} onClick={() => pickT(t.id)}>
                          <span className="s">{t.label}</span>
                          <span className="d">{autoFill(t.subject(CTX))}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                {lList.length === 0 && <p className="tp-empty">{letters.length ? 'Nincs találat.' : 'Még nincs mentett levél. A levélszerkesztő 💾 Levél mentése gombja teszi ide őket.'}</p>}
                {lList.map((l) => (
                  <button key={l.id} type="button" aria-pressed={selL === l.id}
                    className={`tp-item${selL === l.id ? ' is-on' : ''}`} onClick={() => pickL(l.id)}>
                    <span className="s">{l.subject || '(tárgy nélkül)'}</span>
                    <span className="d">{fmtDate(l.createdAt)} · {lKind(l)}{targetTitle(l) ? `: ${targetTitle(l)}` : ''} · {l.names.length} címzett</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="tp-preview">
          {tab === 'sablonok' && curT && (
            <>
              <button type="button" className="btn tp-back" onClick={() => setMobileDetail(false)}>← Vissza a listához</button>
              <div className="tp-pv-meta">{curT.group}</div>
              <h3 className="tp-pv-title">{curT.label}</h3>
              <div className="tp-pv-subj"><b>Tárgy:</b> {autoFill(curT.subject(CTX))}</div>
              <pre className="tp-pv-body">{autoFill(curT.body(CTX))}</pre>
              <div className="tp-pv-actions">
                <button type="button" className="btn btn--ink" onClick={() => onCompose(curT)}>✉ Levélírás ebből a sablonból</button>
              </div>
              <p className="tp-pv-hint">A [szögletes] mezőket a szerkesztőben töltsd ki; az aláírás automatikusan a levél végére kerül.</p>
            </>
          )}
          {tab === 'levelek' && curL && (
            <>
              <button type="button" className="btn tp-back" onClick={() => setMobileDetail(false)}>← Vissza a listához</button>
              <div className="tp-pv-meta">{fmtDate(curL.createdAt)} · {lKind(curL)}{targetTitle(curL) ? `: ${targetTitle(curL)}` : ''}</div>
              <h3 className="tp-pv-title">{curL.subject || '(tárgy nélkül)'}</h3>
              {curL.names.length > 0 && <div className="tp-pv-subj"><b>Címzettek:</b> {curL.names.join(', ')}</div>}
              <pre className="tp-pv-body">{curL.body}</pre>
              <div className="tp-pv-actions">
                <button type="button" className="btn btn--ink" onClick={() => onOpenLetter(curL)}>✉ Megnyitás a levélszerkesztőben</button>
              </div>
              <p className="tp-pv-hint">A levél a saját kártyája (feladat / esemény) kontextusában nyílik meg, a címzettekkel együtt.</p>
            </>
          )}
          {((tab === 'sablonok' && !curT) || (tab === 'levelek' && !curL)) && (
            <div className="tp-pv-empty">Válassz egy elemet a listából, itt jelenik meg az előnézete.</div>
          )}
        </div>
      </div>
    </section>
  );
}
