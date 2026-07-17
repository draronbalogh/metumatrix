'use client';

import { AgendaEvent } from '@/data/agenda';

// feladat-határidő a naptárban: a levél–feladat–naptár tengely miatt a naptár a
// teljes képet mutatja - nap-pontos határidő ⚑-ként a napon + sor a hónap listájában,
// hónap-pontos határidő a hónap listájában "~" jelöléssel
export interface CalDeadline { id: string; title: string; day: string; done: boolean }

interface Props {
  events: AgendaEvent[];
  deadlines: CalDeadline[];
  onEdit: (id: string) => void;
  onTask: (id: string) => void;
}

const MONTH_NAME = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const WDAY = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];

// A naptár-rács a MAI hónaptól (de legkésőbb a tanévkezdő 2026. augusztustól)
// 2027. júliusig fut - az aktuális hónap így sosem eshet ki a rácsból.
const NOW = new Date();
const CAL_START = Math.min(NOW.getFullYear() * 12 + NOW.getMonth(), 2026 * 12 + 7);
const CAL_END = 2027 * 12 + 6; // 2027. július
const MONTHS: { y: number; m: number }[] = [];
for (let i = CAL_START; i <= CAL_END; i++) MONTHS.push({ y: Math.floor(i / 12), m: i % 12 });

// esemény-színpaletta - egymás mellett futó időszakok jól elkülönülnek
const EV_COLORS = ['#d7144b', '#2f6fe0', '#17935f', '#7b3fe4', '#e08b00', '#0e9aa7', '#c2185b', '#5d7a12', '#b3541e', '#4b5bd7', '#8e24aa', '#00796b'];

const mkey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
const parseYMD = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));

interface DayHit { id: string; color: string; featured?: boolean; tip: string; }
interface MonthRow { e: AgendaEvent; color: string; label: string; long: boolean; }

// ennél hosszabb tartomány = háttér-időszak: NEM fest napokat, csak a listában jelenik meg
const LONG_DAYS = 21;

export default function EventsCalendar({ events, deadlines, onEdit, onTask }: Props) {
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
      // hosszú háttér-időszak nem fest napokat - csak a listában szerepel
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

  // feladat-határidők hónaponként: nap-pontosak a napra is kerülnek (⚑), a
  // hónap-pontosak csak a hónap listájába ("~")
  const dlByMonth: Record<string, { id: string; title: string; dayN: number; done: boolean }[]> = {};
  const dlFuzzy: Record<string, CalDeadline[]> = {};
  const dlMarks: Record<string, Record<number, { id: string; tip: string }[]>> = {};
  deadlines.forEach((d) => {
    if (d.day.length >= 10) {
      const k = d.day.slice(0, 7);
      const n = Number(d.day.slice(8, 10));
      (dlByMonth[k] ||= []).push({ id: d.id, title: d.title, dayN: n, done: d.done });
      ((dlMarks[k] ||= {})[n] ||= []).push({ id: d.id, tip: `⚑ határidő: ${d.title}` });
    } else if (d.day.length === 7) {
      (dlFuzzy[d.day] ||= []).push(d);
    }
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
          const dls = (dlByMonth[k] || []).slice().sort((a, b) => a.dayN - b.dayN);
          const dlsFuzzy = dlFuzzy[k] || [];
          const daysIn = new Date(y, m + 1, 0).getDate();
          const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
          const hits = dayHits[k] || {};
          const marks = dlMarks[k] || {};
          return (
            <section className={`cal-month${rows.length + fuzzy.length + dls.length + dlsFuzzy.length ? ' has-ev' : ''}`} key={k}>
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
                        {(marks[d] || []).slice(0, 1).map((x) => (
                          <button key={`dl${x.id}`} type="button" className="cal-flag"
                            data-tip={(marks[d] || []).map((m2) => m2.tip).join(' · ')}
                            aria-label={x.tip}
                            onMouseEnter={(ev) => {
                              // szélső napokon a tooltip befelé igazítva nyílik, ne lógjon ki
                              const b = ev.currentTarget.getBoundingClientRect();
                              ev.currentTarget.classList.toggle('tip-left', b.left < 130);
                              ev.currentTarget.classList.toggle('tip-right', window.innerWidth - b.right < 130);
                            }}
                            onClick={(ev) => { ev.stopPropagation(); onTask(x.id); }}>⚑</button>
                        ))}
                      </span>
                    </span>
                  );
                })}
              </div>
              {(rows.length > 0 || fuzzy.length > 0 || dls.length > 0 || dlsFuzzy.length > 0) && (
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
                  {/* feladat-határidők: kattintásra a FELADAT részletezője nyílik */}
                  {dls.map((d) => (
                    <button key={`dl-${d.id}`} className={`cal-ev dl${d.done ? ' is-done' : ''}`} onClick={() => onTask(d.id)} title="Feladat-határidő - kattintásra a feladat nyílik">
                      <span className="cal-dot flag">⚑</span>
                      <span className="d">{d.dayN}.</span>
                      <span className="t">{d.title}</span>
                    </button>
                  ))}
                  {dlsFuzzy.map((d) => (
                    <button key={`dlf-${d.id}`} className={`cal-ev dl fuzzy${d.done ? ' is-done' : ''}`} onClick={() => onTask(d.id)} title="Hónap-pontosságú feladat-határidő">
                      <span className="cal-dot flag">⚑</span>
                      <span className="d">~</span>
                      <span className="t">{d.title}</span>
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
