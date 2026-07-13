'use client';

import { useEffect, useMemo, useState } from 'react';

// Média Design órarend: az Excelből MD-re szűrt digitális táblázat.
// Két nézet: heti naptár-rács (alapértelmezett) és napok szerinti lista.
// Kereshető (tantárgy / oktató / terem / tankör), és jelzi, ha egy oktató
// nincs a Névjegyzékben.

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

// az EventsCalendar palettája — tantárgyanként stabil szín (név-hash alapján)
const PALETTE = ['#d7144b', '#2f6fe0', '#17935f', '#7b3fe4', '#e08b00', '#0e9aa7', '#c2185b', '#5d7a12', '#b3541e', '#4b5bd7', '#8e24aa', '#00796b'];
const colorOf = (s: string): string => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

// "8-11:10", "13:20-16:30", vagy heti bontás: "13:20-16:30, 1.3.5.7.9. hét, …"
// — mindig az ELSŐ időtartományt vesszük, a többi a tooltipben olvasható
const parseIdo = (ido: string | null): { start: number; end: number } | null => {
  if (!ido) return null;
  const m = ido.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  const start = parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
  const end = parseInt(m[3], 10) * 60 + (m[4] ? parseInt(m[4], 10) : 0);
  return end > start ? { start, end } : null;
};

const PX = 0.95; // 1 perc = ennyi px a heti rácsban

interface Block extends Entry { start: number; end: number; lane: number; cols: number; }

// átfedő órák sávokba rendezése: fürtönként (transzitívan átfedő csoport)
// annyi hasáb, ahány párhuzamos óra — a hasáb szélessége ebből jön
const layoutDay = (items: Entry[]): Block[] => {
  const timed = items
    .map((e) => ({ e, t: parseIdo(e.ido) }))
    .filter((x): x is { e: Entry; t: { start: number; end: number } } => !!x.t)
    .sort((a, b) => a.t.start - b.t.start || a.t.end - b.t.end || a.e.targy.localeCompare(b.e.targy, 'hu'));
  const blocks: Block[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];
  const closeCluster = () => {
    const cols = Math.max(1, ...cluster.map((b) => b.lane + 1));
    cluster.forEach((b) => { b.cols = cols; });
    cluster = []; laneEnds.length = 0;
  };
  timed.forEach(({ e, t }) => {
    if (cluster.length > 0 && t.start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= t.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = t.end;
    const b: Block = { ...e, start: t.start, end: t.end, lane, cols: 1 };
    cluster.push(b); blocks.push(b);
    clusterEnd = Math.max(clusterEnd, t.end);
  });
  if (cluster.length > 0) closeCluster();
  return blocks;
};

export default function OrarendView({ knownNames, q }: { knownNames: string[]; q: string }) {
  const [data, setData] = useState<Orarend | null>(null);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState('');
  const [mode, setMode] = useState<'cal' | 'list'>('cal'); // alapból a heti naptár nyílik

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

  // heti rács: nap-szűrővel az oszlopok szűkülnek; időtengely a tényleges órákhoz
  const calDays = DAYS.filter((d) => !day || d === day);
  const dayBlocks = calDays.map((d) => ({ day: d, blocks: layoutDay(list.filter((e) => e.nap === d)) }));
  const allBlocks = dayBlocks.flatMap((x) => x.blocks);
  const noTime = list.filter((e) => !e.nap || !parseIdo(e.ido));
  const startH = allBlocks.length > 0 ? Math.min(8, Math.floor(Math.min(...allBlocks.map((b) => b.start)) / 60)) : 8;
  const endH = allBlocks.length > 0 ? Math.max(18, Math.ceil(Math.max(...allBlocks.map((b) => b.end)) / 60)) : 20;
  const gridH = (endH - startH) * 60 * PX;

  const warn = (name: string | null) =>
    name && !known.has(normName(name)) ? <span className="or-warn" title="Ez a név nem szerepel a ☎ Névjegyzékben — érdemes felvenni az elérhetőségét">⚠</span> : null;

  return (
    <section className="wrap orv">
      <div className="tp-headrow">
        <h2 className="tp-title">🕒 {data.cim}</h2>
        <span className="tp-headhint">{data.forras} · frissítve: {data.frissitve} · {list.length} órarendi sor, {teacherCount} oktató</span>
      </div>
      <div className="or-tools">
        <div className="viewtoggle or-mode">
          <button type="button" className={mode === 'cal' ? 'is-on' : ''} onClick={() => setMode('cal')}>▦ Heti naptár</button>
          <button type="button" className={mode === 'list' ? 'is-on' : ''} onClick={() => setMode('list')}>≡ Lista</button>
        </div>
        <div className="cat-picker">
          <button type="button" className={`chip${day === '' ? ' is-on' : ''}`} onClick={() => setDay('')}>Minden nap</button>
          {DAYS.map((d) => (
            <button key={d} type="button" className={`chip${day === d ? ' is-on' : ''}`} onClick={() => setDay((v) => (v === d ? '' : d))}>{d}</button>
          ))}
        </div>
      </div>

      {mode === 'cal' ? (
        <>
          <div className="orc-scroll">
            <div className="orc" style={{ gridTemplateColumns: `44px repeat(${calDays.length}, minmax(150px, 1fr))` }}>
              <div className="orc-corner" />
              {calDays.map((d) => <div key={d} className="orc-dh">{d}</div>)}
              <div className="orc-axis" style={{ height: gridH }}>
                {Array.from({ length: endH - startH + 1 }, (_, i) => (
                  <span key={i} style={{ top: i * 60 * PX }}>{startH + i}:00</span>
                ))}
              </div>
              {dayBlocks.map(({ day: d, blocks }) => (
                <div key={d} className="orc-col" style={{ height: gridH, backgroundSize: `100% ${60 * PX}px` }}>
                  {blocks.map((b, i) => {
                    const w = 100 / b.cols;
                    const tip = [b.ido, b.targy, b.oktato, b.terem, b.tankor, b.szint].filter(Boolean).join(' · ');
                    return (
                      <div key={i} className="orc-ev" title={tip} style={{
                        top: (b.start - startH * 60) * PX, height: Math.max(26, (b.end - b.start) * PX - 2),
                        left: `calc(${b.lane * w}% + 1px)`, width: `calc(${w}% - 3px)`,
                        borderLeftColor: colorOf(b.targy),
                      }}>
                        <span className="orc-ev-t">{b.targy}</span>
                        <span className="orc-ev-m">{b.ido}{b.terem ? ` · ${b.terem}` : ''}</span>
                        {b.oktato && <span className="orc-ev-o">{b.oktato}{warn(b.oktato)}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {noTime.length > 0 && (
            <div className="orc-notime">
              <span className="orc-notime-h">Időpont nélkül (egyeztetés alatt):</span>
              {noTime.map((e, i) => (
                <span key={i} className="cc-tag" title={[e.oktato, e.tankor, e.szint].filter(Boolean).join(' · ')}>
                  {e.targy}{e.oktato ? ` · ${e.oktato}` : ''}{warn(e.oktato)}
                </span>
              ))}
            </div>
          )}
          {allBlocks.length === 0 && noTime.length === 0 && <p className="tp-empty">Nincs találat.</p>}
        </>
      ) : (
        <>
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
                          {warn(e.oktato)}
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
          {groups.filter((g) => !day || g.label === day).length === 0 && <p className="tp-empty">Nincs találat.</p>}
        </>
      )}
      <p className="tp-pv-hint">Csak a Média Design szak (magyar nyelvű BA + MA) órái — az animációs és angol nyelvű sorok az Excelből ki vannak szűrve a mintatanterv kurzuslistája alapján. A ⚠ jel oktatót jelöl, aki még nincs a Névjegyzékben. A heti rácsban a többhetes bontású órák az első időtartományukkal jelennek meg, a részletek a kártya fölé állva olvashatók.</p>
    </section>
  );
}
