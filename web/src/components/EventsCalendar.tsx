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
  const m = 7 + i;
  MONTHS.push({ y: 2026 + Math.floor(m / 12), m: m % 12 });
}

// esemény-színpaletta — egymás mellett futó időszakok jól elkülönülnek
const EV_COLORS = ['#d7144b', '#2f6fe0', '#17935f', '#7b3fe4', '#e08b00', '#0e9aa7', '#c2185b', '#5d7a12', '#b3541e', '#4b5bd7', '#8e24aa', '#00796b'];

const mkey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
const parseYMD = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));

interface DayHit { id: string; color: string; featured?: boolean; tip: string; }
interface MonthRow { e: AgendaEvent; color: string; label: string; long: boolean; }

// ennél hosszabb tartomány = háttér-időszak: NEM fest napokat, csak a listában jelenik meg
const LONG_DAYS = 21;

export default function EventsCalendar({ events, onEdit }: Props) {
  // stabil színkiosztás: a dátumozott események kezdőnap szerint sorban kapják a paletta színeit
  const dated = events.filter((e) => e.day).slice().sort((a, b) => (a.day as string).localeCompare(b.day as string) || a.id.localeCompare(b.id));
  const colorOf: Record<string, string> = {};
  dated.forEach((e, i) => { colorOf[e.id] = EV_COLORS[i % EV_COLORS.length]; });

  // naponkénti találatok + havi sorok (az áthúzódó események MINDEN érintett hónapban listázva)
  const dayHits: Record<string, Record<number, DayHit[]>> = {};
  const monthRows: Record<string, MonthRow[]> = {};
  dated.forEach((e) => {
    const start = e.day as string;
    const end = e.dayEnd && e.dayEnd > start ? e.dayEnd : start;
    const lenDays = Math.round((parseYMD(end).getTime() - parseYMD(start).getTime()) / 86400000) + 1;
    const isLong = lenDays > LONG_DAYS;
    const cur = parseYMD(start);
    const endD = parseYMD(end);
    let guard = 0;
    let curMonth = '';
    let segStart = 0;
    while (cur <= endD && guard < 400) {
      const k = mkey(cur.getFullYear(), cur.getMonth());
      const day = cur.getDate();
      // hosszú háttér-időszak nem fest napokat — csak a listában szerepel
      if (!isLong) ((dayHits[k] ||= {})[day] ||= []).push({ id: e.id, color: colorOf[e.id], featured: e.featured, tip: `${e.title} · ${e.when}${e.place ? ` · ${e.place}` : ''}` });
      if (k !== curMonth) {
        curMonth = k; segStart = day;
        (monthRows[k] ||= []).push({ e, color: colorOf[e.id], label: '', long: isLong });
      }
      const rows = monthRows[k];
      const row = rows[rows.length - 1];
      const contBefore = start.slice(0, 7) !== k;
      const segEnd = day;
      row.label = (contBefore ? '…' : '') + (segStart === segEnd ? `${segStart}.` : `${segStart}–${segEnd}.`) + (end.slice(0, 7) > k ? '→' : '');
      cur.setDate(day + 1);
      guard++;
    }
  });

  // dátum nélküli, de hónapra sorolt (sort) események az adott hónap listájába, szín nélkül
  const fuzzyByMonth: Record<string, AgendaEvent[]> = {};
  const undated: AgendaEvent[] = [];
  events.forEach((e) => {
    if (e.day) return;
    if (e.sort) (fuzzyByMonth[e.sort] ||= []).push(e);
    else undated.push(e);
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="cal">
      <div className="cal-grid">
        {MONTHS.map(({ y, m }) => {
          const k = mkey(y, m);
          const rows = monthRows[k] || [];
          const fuzzy = fuzzyByMonth[k] || [];
          const daysIn = new Date(y, m + 1, 0).getDate();
          const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
          const hits = dayHits[k] || {};
          return (
            <section className={`cal-month${rows.length + fuzzy.length ? ' has-ev' : ''}`} key={k}>
              <div className="cal-mh">{y}. {MONTH_NAME[m]}</div>
              <div className="cal-days">
                {WDAY.map((w, i) => <span key={`w${i}`} className="wd">{w}</span>)}
                {Array.from({ length: firstDow }, (_, i) => <span key={`p${i}`} />)}
                {Array.from({ length: daysIn }, (_, i) => {
                  const d = i + 1;
                  const dk = `${k}-${String(d).padStart(2, '0')}`;
                  const h = hits[d] || [];
                  const hasFeat = h.some((x) => x.featured);
                  return (
                    <span key={d} className={`dd${dk === todayKey ? ' today' : ''}${hasFeat ? ' has-feat' : ''}`}>
                      <b>{d}</b>
                      <span className="bars">
                        {/* a színcsík interaktív: hoverre kiemelés + azonnali tooltip, kattintásra
                            ugyanúgy a szerkesztő nyílik, mint a hónap alatti soroknál */}
                        {h.slice(0, 4).map((x, ix) => (
                          <button key={ix} type="button" className={`cal-bar${x.featured ? ' ft' : ''}`}
                            data-tip={x.tip} aria-label={x.tip} style={{ background: x.color }}
                            onMouseEnter={(ev) => {
                              // a tooltip a képernyő szélén nem középre, hanem befelé igazítva nyílik
                              const b = ev.currentTarget.getBoundingClientRect();
                              ev.currentTarget.classList.toggle('tip-left', b.left < 130);
                              ev.currentTarget.classList.toggle('tip-right', window.innerWidth - b.right < 130);
                            }}
                            onClick={(ev) => { ev.stopPropagation(); onEdit(x.id); }} />
                        ))}
                        {h.length > 4 && <em>+</em>}
                      </span>
                    </span>
                  );
                })}
              </div>
              {(rows.length > 0 || fuzzy.length > 0) && (
                <div className="cal-evs">
                  {rows.map((r) => (
                    <button key={r.e.id} className={`cal-ev${r.long ? ' is-long' : ''}${r.e.featured ? ' is-feat' : ''}`} onClick={() => onEdit(r.e.id)} title={(r.long ? 'Hosszabb időszak (a napokon nem jelölve) · ' : '') + r.e.when + (r.e.place ? ` · ${r.e.place}` : '')}>
                      <span className={`cal-dot${r.long ? ' ring' : ''}`} style={r.long ? { borderColor: r.color } : { background: r.color }} />
                      <span className="d">{r.label}</span>
                      <span className="t">{r.e.featured ? '★ ' : ''}{r.e.title}</span>
                    </button>
                  ))}
                  {fuzzy.map((e) => (
                    <button key={e.id} className="cal-ev fuzzy" onClick={() => onEdit(e.id)} title={e.when + (e.place ? ` · ${e.place}` : '')}>
                      <span className="cal-dot hollow" />
                      <span className="d">~</span>
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
