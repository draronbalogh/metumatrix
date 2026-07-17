'use client';

import { ReactNode, useMemo, useState } from 'react';
import { TOPIC_TEMPLATES, TOPIC_GROUPS, TopicTemplate, TopicCtx, autoFill } from '@/lib/topics';
import { Letter } from '@/data/agenda';
import PageHead from './PageHead';

// Levelek központ: ÍRÁS-KÖZPONTÚ elrendezés - balra a keskeny, kereshető lista
// (sablontár-accordion / mentett levelek), a nézet FŐ területe maga a
// LEVÉLSZERKESZTŐ. Nincs külön előnézet-oszlop: a lista-kattintás azonnal a
// szerkesztőbe tölti a sablont/levelet (mobilon modálként nyitja).

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// üres kontextus: az előnézetben a [szögletes] kitöltendő helyek látszanak
const CTX: TopicCtx = { title: '', when: null, place: null, due: null };

interface Props {
  q: string; // a felső, globális keresőmező értéke - nincs saját kereső
  letters: Letter[];
  composer: ReactNode;                    // az egységes levélszerkesztő, beágyazva
  onUseTopic: (t: TopicTemplate) => void; // sablon betöltése a szerkesztőbe
  onOpenLetter: (l: Letter) => void;      // mentett levél betöltése a szerkesztőbe
  targetTitle: (l: Letter) => string | null;
}

export default function TopicsView({ q, letters, composer, onUseTopic, onOpenLetter, targetTitle }: Props) {
  const [tab, setTab] = useState<'sablonok' | 'levelek'>('sablonok');
  const [selT, setSelT] = useState<string | null>(null);
  const [selL, setSelL] = useState<string | null>(null);
  // csoport-accordion: alapból minden csoport összecsukva, így 17 áttekinthető
  // sor látszik 172 sablon helyett; keresésnél a találati csoportok kinyílnak
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
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

  // ÍRÁS-KÖZPONTÚ: a lista-kattintás AZONNAL a szerkesztőbe tölt (mobilon a
  // szerkesztő modálként nyílik - az onUseTopic/onOpenLetter kezeli a szélességet)
  const pickT = (t: TopicTemplate) => { setSelT(t.id); setOpenGroups((s) => new Set(s).add(t.group)); onUseTopic(t); };
  const pickL = (l: Letter) => { setSelL(l.id); onOpenLetter(l); };

  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');
  const lKind = (l: Letter) => (l.targetType === 'task' ? 'Feladat' : l.targetType === 'event' ? 'Esemény' : 'Önálló levél');

  return (
    <section className="wrap tpv">
      <PageHead title="Levelek" sub="a sablonra kattintva rögtön a szerkesztőbe töltődik - csak befejezni és küldeni kell">
        <div className="viewtoggle ag-mode">
          <button type="button" className={tab === 'sablonok' ? 'is-on' : ''}
            onClick={() => setTab('sablonok')}>Sablontár ({TOPIC_TEMPLATES.length})</button>
          <button type="button" className={tab === 'levelek' ? 'is-on' : ''}
            onClick={() => setTab('levelek')}>Mentett levelek ({letters.length})</button>
        </div>
      </PageHead>
      <div className="tp3">
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
        <div className="tp-composer">{composer}</div>
      </div>
    </section>
  );
}
