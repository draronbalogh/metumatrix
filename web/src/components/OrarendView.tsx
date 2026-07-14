'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import PageHead from './PageHead';
import { norm, normName } from '@/lib/normalize';

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

// A METU szabvány idősávjai: sorok a heti táblában. Minden óra a KEZDŐ
// sávjába kerül (a hosszabbak idejéből úgyis látszik, meddig tartanak),
// a párhuzamos órák a cellában egymás alatt, teljes szélességben olvashatók.
const BANDS = [
  { from: '8:00', to: '9:30', s: 8 * 60 },
  { from: '9:40', to: '11:10', s: 9 * 60 + 40 },
  { from: '11:20', to: '12:50', s: 11 * 60 + 20 },
  { from: '13:20', to: '14:50', s: 13 * 60 + 20 },
  { from: '15:00', to: '16:30', s: 15 * 60 },
  { from: '16:40', to: '18:10', s: 16 * 60 + 40 },
  { from: '18:20', to: '19:50', s: 18 * 60 + 20 },
];
const bandOf = (startMin: number): number => {
  let bi = 0;
  BANDS.forEach((b, i) => { if (startMin >= b.s) bi = i; });
  return bi;
};

// A 2026/27. őszi félév kulcsdátumai a hivatalos Tanév rendjéből (MKK) —
// az órarend tetején mindig szem előtt
const KEY_DATES: { l: string; d: string }[] = [
  { l: 'Projekthét', d: 'szept. 7–11.' },
  { l: 'Szorgalmi időszak', d: 'szept. 7. – dec. 4.' },
  { l: 'Őszi szünet', d: 'okt. 26–30.' },
  { l: 'Alkotói hét', d: 'dec. 7–11.' },
  { l: 'Vizsga + kiértékelés', d: 'dec. 7. – jan. 16.' },
  { l: 'Utóvizsga hét', d: 'jan. 18–23.' },
  { l: 'Jegyrögzítés', d: 'jan. 26.' },
  { l: 'Oktatási szünet', d: 'okt. 23. · nov. 1. · dec. 24–26.' },
];

export default function OrarendView({ knownNames, q, displayName, resolveCourse, onOpenCourse }: {
  knownNames: string[];
  q: string;
  // a név Névjegyzék-beli, titulusos írásmódja ("Balogh Áron" → "Dr. Balogh Áron")
  displayName: (n: string) => string;
  // órarendi tárgynév → tantervi kártya {ci,xi}; null, ha nincs egyezés
  resolveCourse: (targy: string, szint: string | null) => { ci: number; xi: number } | null;
  onOpenCourse: (ci: number, xi: number) => void;
}) {
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

  // heti tábla: cells[sáv][nap] = az ott kezdődő órák; nap-szűrővel az oszlopok szűkülnek
  const calDays = DAYS.filter((d) => !day || d === day);
  const cells: Entry[][][] = BANDS.map(() => calDays.map(() => []));
  let timedCount = 0;
  list.forEach((e) => {
    const di = calDays.indexOf(e.nap ?? '');
    const t = parseIdo(e.ido);
    if (di === -1 || !t) return;
    cells[bandOf(t.start)][di].push(e);
    timedCount++;
  });
  cells.forEach((row) => row.forEach((c) => c.sort((a, b) =>
    (parseIdo(a.ido)?.start ?? 0) - (parseIdo(b.ido)?.start ?? 0) || a.targy.localeCompare(b.targy, 'hu'))));
  const usedBands = BANDS.map((_, bi) => cells[bi].some((c) => c.length > 0));
  const noTime = list.filter((e) => !e.nap || !parseIdo(e.ido));

  // U+FE0F variációs szelektorral: e nélkül Windowson tofu/kérdőjelként renderelt
  const warn = (name: string | null) =>
    name && !known.has(normName(name)) ? <span className="or-warn" title="Ez a név nem szerepel a ☎ Névjegyzékben — érdemes felvenni az elérhetőségét">⚠️</span> : null;

  return (
    <section className="wrap orv orv--fixhead">
      <PageHead title="🕒 Órarend" sub={`${data.cim} · ${list.length} óra, ${teacherCount} oktató`}>
        <div className="viewtoggle ag-mode or-mode">
          <button type="button" className={mode === 'list' ? 'is-on' : ''} onClick={() => setMode('list')}>≡ Lista</button>
          <button type="button" className={mode === 'cal' ? 'is-on' : ''} onClick={() => setMode('cal')}>▦ Naptár</button>
        </div>
      </PageHead>
      {/* a cím a görgetőn KÍVÜL: görgetéskor semmi nem úszik a cím mögé/fölé */}
      <div className="orv-scroll">
      <div className="or-key">
        {KEY_DATES.map((k) => (
          <span key={k.l} className="or-kd"><b>{k.l}</b> {k.d}</span>
        ))}
      </div>
      <div className="or-tools">
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
            <div className={`orc${calDays.length === 1 ? ' orc--single' : ''}`} style={{ gridTemplateColumns: `72px repeat(${calDays.length}, minmax(170px, 1fr))` }}>
              <div className="orc-corner">idősáv</div>
              {calDays.map((d, i) => <div key={d} className={`orc-dh${i % 2 ? ' alt' : ''}`}>{d}</div>)}
              {BANDS.map((b, bi) => usedBands[bi] && (
                <Fragment key={b.from}>
                  <div className="orc-time"><b>{b.from}</b><span>{b.to}</span></div>
                  {calDays.map((d, di) => (
                    <div key={d} className={`orc-cell${di % 2 ? ' alt' : ''}`}>
                      {cells[bi][di].map((e, i) => {
                        const okt = e.oktato ? displayName(e.oktato) : null;
                        const tip = [e.ido, e.targy, okt, e.terem, e.tankor, e.szint].filter(Boolean).join(' · ');
                        const ref = resolveCourse(e.targy, e.szint);
                        return (
                          <div key={i} className={`orc-card${ref ? ' orc-card--link' : ''}`}
                            title={ref ? `${tip} — kattints a tárgy kártyájáért` : tip}
                            style={{ borderLeftColor: colorOf(e.targy) }}
                            role={ref ? 'button' : undefined} tabIndex={ref ? 0 : undefined}
                            onClick={ref ? () => onOpenCourse(ref.ci, ref.xi) : undefined}
                            onKeyDown={ref ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpenCourse(ref.ci, ref.xi); } } : undefined}>
                            <span className="orc-card-t">{e.targy}</span>
                            <span className="orc-card-m">{e.ido}{e.terem ? ` · ${e.terem}` : ''}</span>
                            {okt && <span className="orc-card-o">{okt}{warn(e.oktato)}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          {noTime.length > 0 && (
            <div className="orc-notime">
              <span className="orc-notime-h">Időpont nélkül (egyeztetés alatt):</span>
              {noTime.map((e, i) => {
                const okt = e.oktato ? displayName(e.oktato) : null;
                const ref = resolveCourse(e.targy, e.szint);
                return (
                  <span key={i} className={`cc-tag${ref ? ' orc-card--link' : ''}`}
                    title={[okt, e.tankor, e.szint].filter(Boolean).join(' · ') + (ref ? ' — kattints a tárgy kártyájáért' : '')}
                    role={ref ? 'button' : undefined} tabIndex={ref ? 0 : undefined}
                    onClick={ref ? () => onOpenCourse(ref.ci, ref.xi) : undefined}
                    onKeyDown={ref ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpenCourse(ref.ci, ref.xi); } } : undefined}>
                    {e.targy}{okt ? ` · ${okt}` : ''}{warn(e.oktato)}
                  </span>
                );
              })}
            </div>
          )}
          {timedCount === 0 && noTime.length === 0 && <p className="tp-empty">Nincs találat.</p>}
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
                        <td className="or-targy">
                          {(() => {
                            const ref = resolveCourse(e.targy, e.szint);
                            return ref
                              ? <button type="button" className="or-targy-link" title="A tárgy tantervi kártyájának megnyitása" onClick={() => onOpenCourse(ref.ci, ref.xi)}>{e.targy}</button>
                              : e.targy;
                          })()}
                        </td>
                        <td>
                          {e.oktato ? displayName(e.oktato) : 'nincs megadva'}
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
      <p className="tp-pv-hint">Forrás: {data.forras} · frissítve: {data.frissitve}. Csak a Média Design szak (magyar nyelvű BA + MA) órái — az animációs és angol nyelvű sorok az Excelből ki vannak szűrve a mintatanterv kurzuslistája alapján. Az oktatónevek a ☎ Névjegyzék szerinti írásmóddal (titulussal) jelennek meg; a ⚠️ jel oktatót jelöl, aki még nincs a Névjegyzékben. Az órákra kattintva a tárgy tantervi kártyája nyílik meg — ugyanaz, mint a Mátrixban és a Katalógusban. A heti táblában minden óra a kezdő idősávjában szerepel — a kártyán a pontos idő olvasható, a hosszabb (több sávot átfogó) óráké is.</p>
      </div>
    </section>
  );
}
