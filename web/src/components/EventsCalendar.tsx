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

export default function EventsCalendar({ events, onEdit }: Props) {
  // hónaphoz rendelés: pontos nap (day) vagy hónap (sort); egyik sincs → „egyeztetés alatt” sáv
  const byMonth: Record<string, AgendaEvent[]> = {};
  const undated: AgendaEvent[] = [];
  events.forEach((e) => {
    const k = e.day ? e.day.slice(0, 7) : e.sort;
    if (k) (byMonth[k] ||= []).push(e);
    else undated.push(e);
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="cal">
      <div className="cal-grid">
        {MONTHS.map(({ y, m }) => {
          const k = mkey(y, m);
          const evs = (byMonth[k] || []).slice().sort((a, b) => (a.day || 'zz').localeCompare(b.day || 'zz'));
          const daysIn = new Date(y, m + 1, 0).getDate();
          const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // hétfő-kezdés
          const marked = new Set(evs.filter((e) => e.day).map((e) => Number(e.day!.slice(8, 10))));
          return (
            <section className={`cal-month${evs.length ? ' has-ev' : ''}`} key={k}>
              <div className="cal-mh">{y}. {MONTH_NAME[m]}</div>
              <div className="cal-days">
                {WDAY.map((w, i) => <span key={`w${i}`} className="wd">{w}</span>)}
                {Array.from({ length: firstDow }, (_, i) => <span key={`p${i}`} />)}
                {Array.from({ length: daysIn }, (_, i) => {
                  const d = i + 1;
                  const dk = `${k}-${String(d).padStart(2, '0')}`;
                  return (
                    <span key={d} className={`dd${marked.has(d) ? ' ev' : ''}${dk === todayKey ? ' today' : ''}`}>{d}</span>
                  );
                })}
              </div>
              {evs.length > 0 && (
                <div className="cal-evs">
                  {evs.map((e) => (
                    <button key={e.id} className="cal-ev" onClick={() => onEdit(e.id)} title={e.when + (e.place ? ` · ${e.place}` : '')}>
                      <span className="d">{e.day ? Number(e.day.slice(8, 10)) + '.' : '~'}</span>
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
