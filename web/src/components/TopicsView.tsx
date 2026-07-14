'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { TOPIC_TEMPLATES, TOPIC_GROUPS, TopicTemplate, TopicCtx, autoFill } from '@/lib/topics';
import { Letter } from '@/data/agenda';
import PageHead from './PageHead';

// Levelek központ: HÁROM oszlop, levelezőkliens-logika.
// 1. oszlop: kereshető lista (sablontár / mentett levelek), 2. oszlop: előnézet
// a betöltés-gombbal LEGFELÜL, 3. oszlop: MAGA A LEVÉLSZERKESZTŐ — ugyanaz a
// komponens, ami a feladatok és események ✉ gombjáról modálként nyílik.
// Az első találat automatikusan kiválasztódik, így az előnézet sosem üres.
// Mobilon lista → előnézet drill-in, a betöltés ott modálban nyitja a szerkesztőt.

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// üres kontextus: az előnézetben a [szögletes] kitöltendő helyek látszanak
const CTX: TopicCtx = { title: '', when: null, place: null, due: null };

interface Props {
  q: string; // a felső, globális keresőmező értéke — nincs saját kereső
  letters: Letter[];
  composer: ReactNode;                    // az egységes levélszerkesztő, beágyazva
  onUseTopic: (t: TopicTemplate) => void; // sablon betöltése a szerkesztőbe
  onOpenLetter: (l: Letter) => void;      // mentett levél betöltése a szerkesztőbe
  targetTitle: (l: Letter) => string | null;
}

export default function TopicsView({ q, letters, composer, onUseTopic, onOpenLetter, targetTitle }: Props) {
  const [tab, setTab] = useState<'sablonok' | 'levelek'>('sablonok');
  const [selT, setSelT] = useState<string | null>(TOPIC_TEMPLATES[0]?.id ?? null);
  const [selL, setSelL] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false); // mobilon: lista helyett az előnézet
  // csoport-accordion: alapból minden csoport összecsukva (a kiválasztotté nyitva),
  // így 17 áttekinthető sor látszik 172 sablon helyett; keresésnél a találati
  // csoportok maguktól kinyílnak
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(TOPIC_TEMPLATES[0] ? [TOPIC_TEMPLATES[0].group] : []));
  const toggleGroup = (g: string) => setOpenGroups((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; });

  // teljes szövegű keresőindex (cím + csoport + tárgy + törzs), ékezet-függetlenül
  const index = useMemo(() => new Map(TOPIC_TEMPLATES.map((t) => [t.id, norm(`${t.label} ${t.group} ${t.subject(CTX)} ${t.body(CTX)}`)])), []);
  const tList = useMemo(() => TOPIC_TEMPLATES.filter((t) =>
    !q.trim() || (index.get(t.id) as string).includes(norm(q))
  ), [q, index]);

  const lSorted = useMemo(() => [...letters].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [letters]);
  const lList = useMemo(() => lSorted.filter((l) =>
    !q.trim() || norm(`${l.subject} ${l.body} ${l.names.join(' ')} ${targetTitle(l) ?? ''}`).includes(norm(q))
  ), [lSorted, q, targetTitle]);

  // mindig legyen kiválasztott elem, hogy az előnézet sose legyen üres
  useEffect(() => {
    if (tab === 'sablonok' && tList.length && !tList.some((t) => t.id === selT)) setSelT(tList[0].id);
    if (tab === 'levelek' && lList.length && !lList.some((l) => l.id === selL)) setSelL(lList[0].id);
  }, [tab, tList, lList, selT, selL]);

  // közepes szélességen (721-1180px) az előnézet-oszlop rejtett: ilyenkor a
  // lista-kattintás azonnal a szerkesztőbe tölti a kiválasztott elemet
  const noPreview = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 721px) and (max-width: 1180px)').matches;
  const pickT = (t: TopicTemplate) => { setSelT(t.id); setOpenGroups((s) => new Set(s).add(t.group)); setMobileDetail(true); if (noPreview()) onUseTopic(t); };
  const pickL = (l: Letter) => { setSelL(l.id); setMobileDetail(true); if (noPreview()) onOpenLetter(l); };

  const curT = TOPIC_TEMPLATES.find((t) => t.id === selT) ?? null;
  const curL = letters.find((l) => l.id === selL) ?? null;
  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');
  const lKind = (l: Letter) => (l.targetType === 'task' ? 'Feladat' : l.targetType === 'event' ? 'Esemény' : 'Önálló levél');

  return (
    <section className="wrap tpv">
      <PageHead title="✉️ Levelek" sub="1 · válassz a listából → 2 · előnézet → 3 · a szerkesztőben fejezd be és küldd">
        <div className="viewtoggle ag-mode">
          <button type="button" className={tab === 'sablonok' ? 'is-on' : ''}
            onClick={() => { setTab('sablonok'); setMobileDetail(false); }}>Sablontár ({TOPIC_TEMPLATES.length})</button>
          <button type="button" className={tab === 'levelek' ? 'is-on' : ''}
            onClick={() => { setTab('levelek'); setMobileDetail(false); }}>Mentett levelek ({letters.length})</button>
        </div>
      </PageHead>
      <div className={`tp3${mobileDetail ? ' is-detail' : ''}`}>
        <div className="tp-listcol">
          <div className="tp-scroll">
            {tab === 'sablonok' ? (
              <>
                {tList.length === 0 && <p className="tp-empty">Nincs találat.</p>}
                {TOPIC_GROUPS.map((g) => {
                  const items = tList.filter((t) => t.group === g);
                  if (!items.length) return null;
                  const open = openGroups.has(g) || !!q.trim();
                  return (
                    <div key={g}>
                      <button type="button" className={`tp-ghbtn${open ? ' is-open' : ''}`} aria-expanded={open}
                        title={open ? 'Csoport összecsukása' : 'Csoport kinyitása'} onClick={() => toggleGroup(g)}>
                        <span className="ar">{open ? '▾' : '▸'}</span>{g}<span className="ct">{items.length}</span>
                      </button>
                      {open && items.map((t) => (
                        <button key={t.id} type="button" aria-pressed={selT === t.id}
                          className={`tp-item${selT === t.id ? ' is-on' : ''}`} onClick={() => pickT(t)}>
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
                {lList.length === 0 && <p className="tp-empty">{letters.length ? 'Nincs találat.' : 'Még nincs mentett levél. A szerkesztő 💾 Levél mentése gombja teszi ide őket.'}</p>}
                {lList.map((l) => (
                  <button key={l.id} type="button" aria-pressed={selL === l.id}
                    className={`tp-item${selL === l.id ? ' is-on' : ''}`} onClick={() => pickL(l)}>
                    <span className="s">{l.subject || '(tárgy nélkül)'}</span>
                    <span className="d">{fmtDate(l.createdAt)} · {(l.status ?? 'draft') === 'sent' ? '✓ kiküldve' : '✎ vázlat'} · {lKind(l)}{targetTitle(l) ? `: ${targetTitle(l)}` : ''} · {l.names.length} címzett</span>
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
              <div className="tp-pv-top">
                <div>
                  <div className="tp-pv-meta">{curT.group}</div>
                  <h3 className="tp-pv-title">{curT.label}</h3>
                </div>
                <button type="button" className="btn btn--ink tp-pv-cta" onClick={() => onUseTopic(curT)}>✉ Betöltés a szerkesztőbe →</button>
              </div>
              <div className="tp-pv-subj"><b>Tárgy:</b> {autoFill(curT.subject(CTX))}</div>
              <pre className="tp-pv-body">{autoFill(curT.body(CTX))}</pre>
              <p className="tp-pv-hint">Betöltéskor a kiválasztott címzettekhez igazodik a megszólítás, a tanév/félév kitöltődik, az aláírás a levél végére kerül; csak a maradék [szögletes] mezőt kell kitölteni.</p>
            </>
          )}
          {tab === 'levelek' && curL && (
            <>
              <button type="button" className="btn tp-back" onClick={() => setMobileDetail(false)}>← Vissza a listához</button>
              <div className="tp-pv-top">
                <div>
                  <div className="tp-pv-meta">{fmtDate(curL.createdAt)} · {lKind(curL)}{targetTitle(curL) ? `: ${targetTitle(curL)}` : ''}</div>
                  <h3 className="tp-pv-title">{curL.subject || '(tárgy nélkül)'}</h3>
                </div>
                <button type="button" className="btn btn--ink tp-pv-cta" onClick={() => onOpenLetter(curL)}>✉ Betöltés a szerkesztőbe →</button>
              </div>
              {curL.names.length > 0 && <div className="tp-pv-subj"><b>Címzettek:</b> {curL.names.join(', ')}</div>}
              <pre className="tp-pv-body">{curL.body}</pre>
            </>
          )}
          {((tab === 'sablonok' && !curT) || (tab === 'levelek' && !curL)) && (
            <div className="tp-pv-empty">Válassz egy elemet a listából, itt jelenik meg az előnézete.</div>
          )}
        </div>
        <div className="tp-composer">{composer}</div>
      </div>
    </section>
  );
}
