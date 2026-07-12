'use client';

import { useEffect, useMemo, useState } from 'react';

// Média Design órarend: az Excelből MD-re szűrt digitális táblázat.
// Napok szerint csoportosítva, kereshető (tantárgy / oktató / terem / tankör),
// és jelzi, ha egy oktató nincs a Névjegyzékben.

interface Entry {
  targy: string; oktato: string | null; tankor: string | null;
  szint: string | null; nyelv: string | null; kovetelmeny: string | null; kredit: string | null;
  nap: string | null; terem: string | null; ido: string | null;
}
interface Orarend { cim: string; forras: string; frissitve: string; entries: Entry[]; }

const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// a Névjegyzék-egyeztetéshez: Dr. / habil előtagok nélkül hasonlítunk
const normName = (s: string): string => norm(s.replace(/\b(dr|habil)\.?\s*/gi, '').trim());

export default function OrarendView({ knownNames, q }: { knownNames: string[]; q: string }) {
  const [data, setData] = useState<Orarend | null>(null);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState('');

  useEffect(() => {
    fetch('/api/orarend').then((r) => r.json()).then((j) => (j.ok && j.data ? setData(j.data) : setFailed(true))).catch(() => setFailed(true));
  }, []);

  const known = useMemo(() => new Set(knownNames.map(normName)), [knownNames]);
  const list = useMemo(() => {
    if (!data) return [];
    return data.entries.filter((e) =>
      !q.trim() || norm(`${e.targy} ${e.oktato ?? ''} ${e.terem ?? ''} ${e.tankor ?? ''} ${e.szint ?? ''}`).includes(norm(q)));
  }, [data, q]);
  const teacherCount = useMemo(() => new Set(list.map((e) => e.oktato).filter(Boolean)).size, [list]);

  if (failed) return <section className="wrap orv"><p className="tp-empty">Az órarend-adat még nincs feltöltve (grid/orarend.json).</p></section>;
  if (!data) return <section className="wrap orv"><p className="tp-empty">Órarend betöltése…</p></section>;

  const groups: { label: string; items: Entry[] }[] = [
    ...DAYS.map((d) => ({ label: d, items: list.filter((e) => e.nap === d) })),
    { label: 'Időpont nélkül (egyeztetés alatt)', items: list.filter((e) => !e.nap) },
  ].filter((g) => g.items.length > 0);

  return (
    <section className="wrap orv">
      <div className="tp-headrow">
        <h2 className="tp-title">🕒 {data.cim}</h2>
        <span className="tp-headhint">{data.forras} · frissítve: {data.frissitve} · {list.length} órarendi sor, {teacherCount} oktató</span>
      </div>
      <div className="or-tools">
        <div className="cat-picker">
          <button type="button" className={`chip${day === '' ? ' is-on' : ''}`} onClick={() => setDay('')}>Minden nap</button>
          {DAYS.map((d) => (
            <button key={d} type="button" className={`chip${day === d ? ' is-on' : ''}`} onClick={() => setDay((v) => (v === d ? '' : d))}>{d}</button>
          ))}
        </div>
      </div>
      {groups.filter((g) => !day || g.label === day).map((g) => (
        <div key={g.label} className="or-day">
          <h3 className="tp-gh">{g.label} <span className="tp-gcount">{g.items.length}</span></h3>
          <div className="or-tablewrap">
            <table className="or-table">
              <thead>
                <tr><th>Idő</th><th>Tantárgy</th><th>Oktató</th><th>Terem</th><th>Tankör</th><th>Szint</th><th>Köv. / kredit</th></tr>
              </thead>
              <tbody>
                {[...g.items].sort((a, b) => (a.ido ?? '99').localeCompare(b.ido ?? '99')).map((e, i) => (
                  <tr key={i}>
                    <td className="or-ido">{e.ido ?? '—'}</td>
                    <td className="or-targy">{e.targy}</td>
                    <td>
                      {e.oktato ?? 'nincs megadva'}
                      {e.oktato && !known.has(normName(e.oktato)) && <span className="or-warn" title="Ez a név nem szerepel a ☎ Névjegyzékben — érdemes felvenni az elérhetőségét">⚠</span>}
                    </td>
                    <td>{e.terem ?? '—'}</td>
                    <td>{e.tankor ?? '—'}</td>
                    <td>{e.szint ?? ''}{e.nyelv === 'E' ? ' (EN)' : ''}</td>
                    <td>{[e.kovetelmeny, e.kredit ? `${e.kredit} kr` : null].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="tp-empty">Nincs találat.</p>}
      <p className="tp-pv-hint">Csak a Média Design szak (magyar nyelvű BA + MA) órái — az animációs és angol nyelvű sorok az Excelből ki vannak szűrve a mintatanterv kurzuslistája alapján. A ⚠ jel oktatót jelöl, aki még nincs a Névjegyzékben.</p>
    </section>
  );
}
