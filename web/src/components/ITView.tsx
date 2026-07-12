'use client';

import { useEffect, useMemo, useState } from 'react';

// IT és szoftverek: az Infopark termeiben telepített szoftverek (xlsx-ből generálva),
// kétféle nézetben (termek szerint / szoftverek szerint), a globális keresővel szűrve.
// A segédletek KÜLÖN főmenü-fülön élnek (DocsView).

interface Terem { terem: string; tipus: string; gepek: string; szoftverek: string[]; }
interface Epulet { nev: string; termek: Terem[]; }
interface ITData { cim: string; forras: string; frissitve: string; epuletek: Epulet[]; }

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// szoftvernév-csoportosítás: verziószám/évszám/zárójel nélkül egy csoportba
// (pl. "Adobe CC (2024)" és "Adobe CC (2025)" ugyanaz a szoftver)
const swKey = (s: string): string =>
  norm(s).replace(/\(.*?\)/g, ' ').replace(/\b\d[\d.]*\b/g, ' ').replace(/\s+/g, ' ').trim() || norm(s);

export default function ITView({ q }: { q: string }) {
  const [data, setData] = useState<ITData | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<'terem' | 'szoftver'>('terem');
  const [ep, setEp] = useState('');

  useEffect(() => {
    fetch('/api/it').then((r) => r.json()).then((j) => (j.ok && j.data ? setData(j.data) : setFailed(true))).catch(() => setFailed(true));
  }, []);

  const rooms = useMemo(() => {
    if (!data) return [];
    return data.epuletek
      .filter((e) => !ep || e.nev === ep)
      .flatMap((e) => e.termek.map((t) => ({ ...t, epulet: e.nev })));
  }, [data, ep]);

  // terem-nézet: a keresés teremre VAGY telepített szoftverre illeszkedik
  const roomList = useMemo(() => {
    const nq = norm(q);
    if (!q.trim()) return rooms.map((r) => ({ ...r, hits: [] as string[] }));
    return rooms
      .map((r) => ({ ...r, hits: r.szoftverek.filter((s) => norm(s).includes(nq)) }))
      .filter((r) => r.hits.length > 0 || norm(`${r.terem} ${r.tipus} ${r.gepek}`).includes(nq));
  }, [rooms, q]);

  // szoftver-nézet: szoftver → mely termekben van (verzió-változatokkal)
  const swList = useMemo(() => {
    const m = new Map<string, { nevek: Set<string>; termek: string[] }>();
    rooms.forEach((r) => r.szoftverek.forEach((s) => {
      const k = swKey(s);
      const e = m.get(k) ?? { nevek: new Set<string>(), termek: [] };
      e.nevek.add(s);
      if (!e.termek.includes(r.terem)) e.termek.push(r.terem);
      m.set(k, e);
    }));
    const nq = norm(q);
    return [...m.values()]
      .map((e) => ({ nev: [...e.nevek].sort((a, b) => b.localeCompare(a))[0], valtozatok: [...e.nevek], termek: e.termek }))
      .filter((e) => !nq || e.valtozatok.some((v) => norm(v).includes(nq)) || e.termek.some((t) => norm(t).includes(nq)))
      .sort((a, b) => b.termek.length - a.termek.length || a.nev.localeCompare(b.nev, 'hu'));
  }, [rooms, q]);

  if (failed) return <section className="wrap orv"><p className="tp-empty">A szoftver-adat még nincs feltöltve (grid/it-szoftverek.json).</p></section>;
  if (!data) return <section className="wrap orv"><p className="tp-empty">Betöltés…</p></section>;

  return (
    <section className="wrap orv itv">
      <div className="tp-headrow">
        <h2 className="tp-title">🖥 {data.cim}</h2>
        <span className="tp-headhint">frissítve: {data.frissitve} · {rooms.length} terem · {swList.length} szoftver</span>
      </div>
      <div className="or-tools">
        <div className="cat-picker">
          <button type="button" className={`chip${mode === 'terem' ? ' is-on' : ''}`} onClick={() => setMode('terem')}>Termek szerint</button>
          <button type="button" className={`chip${mode === 'szoftver' ? ' is-on' : ''}`} onClick={() => setMode('szoftver')}>Szoftverek szerint</button>
          {data.epuletek.map((e) => (
            <button key={e.nev} type="button" className={`chip${ep === e.nev ? ' is-on' : ''}`} onClick={() => setEp((v) => (v === e.nev ? '' : e.nev))}>{e.nev}</button>
          ))}
        </div>
      </div>

      {mode === 'terem' ? (
        <div className="it-grid">
          {roomList.map((r) => (
            <article key={`${r.epulet}-${r.terem}`} className="cc-card it-room">
              <div className="it-room-head">
                <span className="it-room-no">{r.terem}</span>
                <span className="it-room-type">{r.tipus}</span>
                <span className="it-room-pc">{r.gepek}</span>
              </div>
              {q.trim() && r.hits.length > 0 && (
                <div className="it-hits">{r.hits.map((s) => <span key={s} className="cc-tag it-hit">{s}</span>)}</div>
              )}
              <details className="it-swlist" open={!!q.trim() && r.hits.length === 0}>
                <summary>{r.szoftverek.length} telepített szoftver</summary>
                <ul>{r.szoftverek.map((s) => <li key={s}>{s}</li>)}</ul>
              </details>
            </article>
          ))}
          {roomList.length === 0 && <p className="tp-empty">Nincs a keresésnek megfelelő terem vagy szoftver.</p>}
        </div>
      ) : (
        <div className="it-swgrid">
          {swList.map((s) => (
            <article key={s.nev} className="cc-card it-sw">
              <div className="it-sw-name">{s.nev}</div>
              {s.valtozatok.length > 1 && <div className="it-sw-vars">{s.valtozatok.filter((v) => v !== s.nev).join(' · ')}</div>}
              <div className="it-sw-rooms">{s.termek.sort().map((t) => <span key={t} className="cc-tag">{t}</span>)}</div>
            </article>
          ))}
          {swList.length === 0 && <p className="tp-empty">Nincs a keresésnek megfelelő szoftver.</p>}
        </div>
      )}

      <p className="tp-pv-hint">Forrás: {data.forras} — újrageneráláskor a lista frissül. A kereső teremre és szoftverre is illeszkedik (pl. „Maya", „225", „Avid").</p>
    </section>
  );
}
