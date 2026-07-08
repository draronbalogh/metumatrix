'use client';

import { AgendaEvent } from '@/data/agenda';

interface Props {
  events: AgendaEvent[];
  onEdit: (id: string) => void;
}

const MONTH_NAME = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const WDAY = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];

// A tanév hónapjai: 2026. augusztus – 2027. július
const MONTHS: { y: number; m: number }[] = [];
for (let i = 0; i < 12; i++) {
  const m = 7 + i; // 0-indexelt: aug = 7
  MONTHS.push({ y: 2026 + Math.floor(m / 12), m: m % 12 });
}

const mkey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
const parseYMD = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));

export default function EventsCalendar({ events, onEdit }: Props) {
  // hónaphoz rendelés a KEZDŐ hónap szerint: pontos nap (day) vagy hónap (sort); egyik sincs → „egyeztetés alatt" sáv
  const byMonth: Record<string, AgendaEvent[]> = {};
  const undated: AgendaEvent[] = [];
  events.forEach((e) => {
    const k = e.day ? e.day.slice(0, 7) : e.sort;
    if (k) (byMonth[k] ||= []).push(e);
    else undated.push(e);
  });

  // napjelölés: az IDŐSZAK minden napja (day → dayEnd), hónapokon átívelve is.
  // 'single' = egynapos (teli jelölés), 'range' = időszak napja (halvány sáv).
  const marked: Record<string, Record<number, 'single' | 'range'>> = {};
  events.forEach((e) => {
    if (!e.day) return;
    const end = e.dayEnd && e.dayEnd > e.day ? e.dayEnd : e.day;
    const isRange = end !== e.day;
    const cur = parseYMD(e.day);
    const endD = parseYMD(end);
    let guard = 0;
    while (cur <= endD && guard < 400) {
      const k = mkey(cur.getFullYear(), cur.getMonth());
      const day = cur.getDate();
      const m = (marked[k] ||= {});
      if (!isRange) m[day] = 'single';
      else if (m[day] !== 'single') m[day] = 'range';
      cur.setDate(day + 1);
      guard++;
    }
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // az esemény dátum-cimkéje a hónap-listában: "26–30." / "7.→" (átlógó) / "26."
  const dateLabel = (e: AgendaEvent) => {
    if (!e.day) return '~';
    const d1 = Number(e.day.slice(8, 10));
    if (!e.dayEnd || e.dayEnd <= e.day) return `${d1}.`;
    if (e.dayEnd.slice(0, 7) === e.day.slice(0, 7)) return `${d1}–${Number(e.dayEnd.slice(8, 10))}.`;
    return `${d1}.→`;
  };

  return (
    <div className="cal">
      <div className="cal-grid">
        {MONTHS.map(({ y, m }) => {
          const k = mkey(y, m);
          const evs = (byMonth[k] || []).slice().sort((a, b) => (a.day || 'zz').localeCompare(b.day || 'zz'));
          const daysIn = new Date(y, m + 1, 0).getDate();
          const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // hétfő-kezdés
          const mk = marked[k] || {};
          const hasAny = evs.length > 0 || Object.keys(mk).length > 0;
          return (
            <section className={`cal-month${hasAny ? ' has-ev' : ''}`} key={k}>
              <div className="cal-mh">{y}. {MONTH_NAME[m]}</div>
              <div className="cal-days">
                {WDAY.map((w, i) => <span key={`w${i}`} className="wd">{w}</span>)}
                {Array.from({ length: firstDow }, (_, i) => <span key={`p${i}`} />)}
                {Array.from({ length: daysIn }, (_, i) => {
                  const d = i + 1;
                  const dk = `${k}-${String(d).padStart(2, '0')}`;
                  const mark = mk[d];
                  return (
                    <span key={d} className={`dd${mark === 'single' ? ' ev' : mark === 'range' ? ' evr' : ''}${dk === todayKey ? ' today' : ''}`}>{d}</span>
                  );
                })}
              </div>
              {evs.length > 0 && (
                <div className="cal-evs">
                  {evs.map((e) => (
                    <button key={e.id} className="cal-ev" onClick={() => onEdit(e.id)} title={e.when + (e.place ? ` · ${e.place}` : '')}>
                      <span className="d">{dateLabel(e)}</span>
                      <span className="t">{e.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      {undated.length > 0 && (
        <div className="cal-undated">
          <span className="cal-undated-h">Időpont egyeztetés alatt:</span>
          {undated.map((e) => (
            <button key={e.id} className="cal-ev loose" onClick={() => onEdit(e.id)}>
              <span className="t">{e.title}</span>
              <span className="w">{e.when}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
