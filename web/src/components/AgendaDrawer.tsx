'use client';

import type { ReactNode } from 'react';
import { Agenda, AgendaEvent, AgendaMeetSlot, AgendaTask, Letter, PRIORITY_LABEL, STATUS_LABEL, TaskStar, TaskStatus, fmtDayHu, fmtDueHu, nextStarFor, placeIcon, taskSteps, stepsDone, urgencyRank } from '@/data/agenda';
import { PersonKind } from '@/data/people';
import { suggestEventFor } from '@/lib/linkSuggest';
import { PersonChip } from './AgendaView';
import SlotConfirm from './SlotConfirm';

// Feladat / esemény RÉSZLETEZŐ - az „egy kártya mindenhol" elv az agendára:
// a listában csak tömör, 2 soros kártyák vannak, minden részlet ITT nyílik meg.
// A lépések NEM külön listában élnek, hanem a „Ki mit csinál" személy-kártyákon:
// mindenki neve alatt a saját teendői, ott is pipálhatók.

export type AgendaDetailsRef = { kind: 'task'; id: string } | { kind: 'event'; id: string };

interface Props {
  det: AgendaDetailsRef;
  agenda: Agenda;
  letters: Letter[];                       // a tételhez kapcsolt levelek
  kindOf: Record<string, PersonKind>;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;                      // a füles szerkesztő megnyitása
  onOpenTask: (id: string) => void;        // esemény-részletezőből feladatra ugrás
  onOpenEvent: (id: string) => void;       // feladat-részletezőből eseményre ugrás
  onToggleStep: (taskId: string, ix: number) => void;
  onLinkEvent: (taskId: string, eventId: string | null) => void; // feladat ↔ esemény kapcsolás innen is
  onSetDue: (taskId: string, d: string) => void; // az esemény napjának átvétele határidőnek (tengely-szinkron)
  onPerson: (name: string) => void;        // név-szűrő (bezárja a részletezőt a hívó)
  onNotify: () => void;                    // ✉ új levél ehhez a tételhez
  onOpenLetter: (l: Letter) => void;
  onAddTaskFor: (eventId: string) => void;
  emailFor: (name: string) => string | null; // a Névjegyzékből - a Meet-meghívó vendégeihez
  onCreateMeet?: (eventId: string) => void;   // automatikus Google Meet-link (API) az eseményhez
  onConfirmMeet?: (eventId: string) => void;  // időpont-egyeztetés lezárása (tentative -> confirmed)
  meetMsg?: string | null;                     // a Meet-készítés visszajelzése
  onTaskStatus?: (id: string, s: TaskStatus) => void; // kész / folyamatban / újranyitás a részletezőből
  onDelete?: () => void; // a tétel törlése innen (a hívó erősít meg)
  onSetStar?: (id: string, star: TaskStar | null) => void; // kézi ⭐ a részletezőből
  onAddEventFor?: (taskId: string) => void; // új, előtöltött esemény ehhez a feladathoz
  onConfirmMeetSlot?: (eventId: string, slot: AgendaMeetSlot) => void; // a választott javaslat véglegesítése
}

const fmtLetter = (iso: string) => iso.slice(0, 16).replace('T', ' ');

// Google Naptár-esemény előtöltve Meet videohívással (vcon=meet): cím, időpont,
// helyszín, leírás és a résztvevők email-címei már ki vannak töltve, csak menteni kell.
const meetUrl = (e: AgendaEvent, emails: string[]): string => {
  const p = new URLSearchParams({ text: e.title, vcon: 'meet', hl: 'hu' });
  if (e.day) {
    // ha a "when" szövegben van óra:perc, azt vesszük kezdésnek, különben 9:00; hossz 1 óra
    const m = e.when.match(/(\d{1,2})[:.](\d{2})/);
    const h = m ? Math.min(23, parseInt(m[1], 10)) : 9;
    const mi = m ? m[2] : '00';
    const d = e.day.replace(/-/g, '');
    const hh = String(h).padStart(2, '0');
    const he = String(Math.min(23, h + 1)).padStart(2, '0');
    p.set('dates', `${d}T${hh}${mi}00/${d}T${he}${mi}00`);
  }
  if (e.place) p.set('location', e.place);
  if (e.note) p.set('details', e.note);
  if (emails.length > 0) p.set('add', emails.join(','));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&${p.toString()}`;
};

// szakaszfej - a szerkesztő-fülek színvilágával (sárga=alfeladatok, kék=emberek, zöld=levelek)
function Sec({ cls, children }: { cls?: string; children: ReactNode }) {
  return <div className={`dr-sec${cls ? ` ${cls}` : ''}`}>{children}</div>;
}

// egy kiosztott lépés a személy-kártyán - a taskId+ix révén innen is pipálható
interface PStep { taskId: string; taskTitle: string | null; ix: number; text: string; done: boolean; due: string | null }

export default function AgendaDrawer({ det, agenda, letters, kindOf, canEdit, onClose, onEdit, onOpenTask, onOpenEvent, onToggleStep, onLinkEvent, onSetDue, onPerson, onNotify, onOpenLetter, onAddTaskFor, emailFor, onCreateMeet, onConfirmMeet, meetMsg, onTaskStatus, onDelete, onSetStar, onAddEventFor, onConfirmMeetSlot }: Props) {
  const task = det.kind === 'task' ? agenda.tasks.find((t) => t.id === det.id) ?? null : null;
  const event = det.kind === 'event' ? agenda.events.find((e) => e.id === det.id) ?? null : null;
  if (!task && !event) return null;

  const linked = event ? agenda.tasks.filter((t) => t.eventId === event.id) : [];
  const owner = (task?.owner ?? event?.owner) || null;
  const people = task?.people ?? event?.people ?? [];
  const persons = [...(owner ? [owner] : []), ...people.filter((p) => p !== owner)];

  // személy-kártyák: mindenki neve alatt rögtön az Ő lépései - feladatnál a saját steps-ből,
  // eseménynél a kapcsolt feladatokból; a gazdátlan lépéseket a felelős viszi
  const collectSteps = (match: (assignee: string | null) => boolean): PStep[] => {
    const out: PStep[] = [];
    const collect = (t: AgendaTask, withTitle: boolean) => {
      taskSteps(t).forEach((s, ix) => {
        const assignee = s.owner || t.owner || null;
        if (match(assignee)) out.push({ taskId: t.id, taskTitle: withTitle ? t.title : null, ix, text: s.text, done: s.done, due: s.due ?? null });
      });
    };
    if (task) collect(task, false);
    linked.forEach((t) => collect(t, true));
    return out;
  };
  const stepsOf = (name: string) => collectSteps((a) => a === name);
  // se lépés-felelős, se feladat-felelős: ezek külön blokkba kerülnek, hogy ne tűnjenek el
  const unassigned = collectSteps((a) => a === null);
  const allSteps = task ? taskSteps(task) : linked.flatMap(taskSteps);
  const allDone = allSteps.filter((s) => s.done).length;

  const evLinked = task?.eventId ? agenda.events.find((e) => e.id === task.eventId) ?? null : null;
  const evTitle = evLinked?.title ?? null;
  // automatikus esemény-javaslat a címek egyezése alapján, amíg nincs kapcsolat
  const evSugg = task && !task.eventId ? suggestEventFor(`${task.title} ${task.summary}`, agenda.events) : null;
  // tengely-szinkron jelzések: az esemény napja és a feladat határideje ne szakadjon el
  const evDay = evLinked ? evLinked.day ?? evLinked.sort ?? null : null;
  const dueAfterEvent = !!(task?.dueDate && evLinked?.day && task.dueDate.slice(0, 10) > evLinked.day);

  // a személy-kártyák és a kiosztatlan blokk közös lépés-listája - itt is pipálható
  const stepList = (st: PStep[]) => (
    <ul className="dr-person-steps">
      {st.map((s) => (
        <li key={`${s.taskId}-${s.ix}`} className={s.done ? 'is-done' : ''}>
          <button className={`ag-scheck${s.done ? ' is-on' : ''}`} disabled={!canEdit}
            title={s.done ? 'Visszaállítás nyitottra' : 'Kész - pipa'}
            onClick={() => onToggleStep(s.taskId, s.ix)}>{s.done ? '✓' : ''}</button>
          <span className="tx">{s.taskTitle ? <em className="tt">{s.taskTitle}: </em> : null}{s.text}</span>
          {s.due && <span className="du">📅 {fmtDayHu(s.due)}</span>}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="dr-top">
          {task && <div className="dr-eyebrow">Feladat · {PRIORITY_LABEL[task.priority]}{task.category ? ` · ${task.category}` : ''} · {STATUS_LABEL[task.status]}</div>}
          {event && <div className="dr-eyebrow">Esemény{event.featured ? ' · ★ kiemelt' : ''}</div>}
          <h2 className="dr-name">{task?.title ?? event?.title}</h2>
          <div className="dr-actrow">
            {canEdit && task && onTaskStatus && (task.status === 'done'
              ? <button className="btn" title="A feladat újranyitása (vissza teendőre)" onClick={() => onTaskStatus(task.id, 'todo')}>↩ Újranyitás</button>
              : <>
                  <button className="btn btn--ink" title="A feladat teljesítve - a Kész listába kerül" onClick={() => onTaskStatus(task.id, 'done')}>✓ Kész</button>
                  <button className="btn" title={task.status === 'doing' ? 'Vissza teendőre' : 'Megjelölés folyamatban lévőnek'} onClick={() => onTaskStatus(task.id, task.status === 'doing' ? 'todo' : 'doing')}>{task.status === 'doing' ? '⏸ Nem folyamatban' : '▶ Folyamatban'}</button>
                </>)}
            {canEdit && task && task.status !== 'done' && onSetStar && (() => {
              const soon = Date.now() + 7 * 86400000;
              const inBand = urgencyRank(task, soon) < 99;
              return (
                <button className="btn" title={inBand ? 'Kivétel a Legfontosabbak sávból' : 'Kiemelés a Legfontosabbak sávba'}
                  onClick={() => onSetStar(task.id, nextStarFor(task, soon))}>{inBand ? '⭐ Legfontosabb' : '☆ Kiemelés'}</button>
              );
            })()}
            {canEdit && <button className="btn btn--ink" onClick={onEdit}>✎ Szerkesztés</button>}
            {canEdit && onDelete && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
            <button className="btn" onClick={onClose}>✕ Bezárás</button>
          </div>
        </div>
        <div className="dr-scroll">
          {/* ALAP: dátumok, helyszín, kapcsolt esemény, összefoglaló */}
          {task && (
            <>
              <div className="dr-field">
                <h4>Kapcsolt esemény</h4>
                {task.eventId && evLinked ? (
                  <div className="dr-evcard">
                    <button className="dr-evcard-main" onClick={() => onOpenEvent(task.eventId as string)} title="Az esemény részletezőjének megnyitása">
                      <span className="t">▤ {evLinked.title}</span>
                      <span className="m">🕑 {evLinked.day ? fmtDayHu(evLinked.day) : evLinked.when}{evLinked.place ? ` · ${placeIcon(evLinked.place)} ${evLinked.place}` : ''}{evLinked.mstatus === 'tentative' ? ' · egyeztetés alatt' : ''}</span>
                    </button>
                    {evLinked.meetLink && <a className="btn" href={evLinked.meetLink} target="_blank" rel="noopener noreferrer">📹 Meet</a>}
                    <button className="btn" onClick={() => onOpenEvent(task.eventId as string)}>Megnyitás</button>
                    {canEdit && <button className="dr-unlink" title="Kapcsolat bontása" onClick={() => onLinkEvent(task.id, null)}>✕</button>}
                    {canEdit && onConfirmMeetSlot && (
                      <SlotConfirm event={evLinked} onConfirm={(s) => onConfirmMeetSlot(evLinked.id, s)} />
                    )}
                  </div>
                ) : canEdit ? (
                  <div className="dr-evpick">
                    {evSugg && (
                      <button className="chip due-sugg" title="A rendszer a címek egyezése alapján ezt az eseményt javasolja"
                        onClick={() => onLinkEvent(task.id, evSugg.id)}>⚡ Javaslat: ▤ {evSugg.title} - összekapcsolás</button>
                    )}
                    <select value="" onChange={(e) => { if (e.target.value) onLinkEvent(task.id, e.target.value); }}>
                      <option value="">- esemény hozzákapcsolása -</option>
                      {agenda.events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                    {onAddEventFor && (
                      <button className="btn dr-addtask" onClick={() => onAddEventFor(task.id)}>+ Új esemény ehhez a feladathoz</button>
                    )}
                  </div>
                ) : <p className="none">nincs</p>}
              </div>
              <div className="dr-field">
                <h4>Határidő</h4>
                <p className={task.dueDate || task.due ? '' : 'none'}>
                  {task.dueDate ? `📅 ${fmtDueHu(task.dueDate)}` : task.due || 'nincs megadva'}
                </p>
                {canEdit && !task.dueDate && evDay && (
                  <button className="chip due-sugg" title="A kapcsolt esemény napjának átvétele határidőnek"
                    onClick={() => onSetDue(task.id, evDay)}>⚑ Átveszem az esemény idejét: {fmtDueHu(evDay)}</button>
                )}
                {dueAfterEvent && (
                  <p className="dr-warn">⚠ A határidő a kapcsolt esemény napja ({fmtDueHu(evLinked?.day)}) utánra esik.
                    {canEdit && evDay && <button className="dr-link" onClick={() => onSetDue(task.id, evDay)}> Igazítás az eseményhez</button>}
                  </p>
                )}
              </div>
              {task.summary && <div className="dr-field"><h4>Rövid összefoglaló</h4><p>{task.summary}</p></div>}
              {task.source && (
                <div className="dr-field">
                  <h4>Beérkezett levélből</h4>
                  <p>
                    {task.source.name} &lt;{task.source.email}&gt;{task.source.subject ? ` · „${task.source.subject}"` : ''}
                    <span className={`dr-repl${task.source.status === 'replied' || task.source.status === 'noreply' ? ' ok' : ''}`}>{
                      task.source.status === 'replied' ? `✓ megválaszolva${task.source.repliedAt ? ` ${task.source.repliedAt.slice(5, 10).replace('-', '. ')}.` : ''}`
                      : task.source.status === 'noreply' ? '✓ lezárva'
                      : task.source.status === 'snoozed' ? `💤 halasztva${task.source.snoozeUntil ? ` ${task.source.snoozeUntil.slice(5, 10).replace('-', '. ')}-ig` : ''}`
                      : task.source.status === 'waiting' ? '⏳ rájuk várok'
                      : '✉ válaszra vár - a Postában'
                    }</span>
                  </p>
                  {(task.source.thread?.length ?? 0) > 0 && (
                    <div className="dr-thread">
                      {task.source.thread?.map((m, i) => (
                        <div key={i} className={`dr-tmsg ${m.dir}`}>
                          <span className="d">{m.at.slice(5, 10).replace('-', '. ')}.</span>
                          <span className="w" title={m.dir === 'in' ? 'bejövő' : 'a mi válaszunk'}>{m.dir === 'in' ? '⇣' : '⇡'}</span>
                          <span className="f">{m.from}:</span> {m.gist}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {event && (
            <>
              <div className="dr-field">
                <h4>Időpont</h4>
                <p>🕑 {event.day ? `${fmtDayHu(event.day)}${event.dayEnd ? ` – ${fmtDayHu(event.dayEnd)}` : ''} · ` : ''}{event.when}</p>
              </div>
              {event.extSource === 'outlook' && (
                <p className="dr-warn">⛓ Az abalogh@metropolitan.hu Outlook-naptár tükre - a szinkron frissíti, a módosítás az Outlookban történjen. Meet-et saját (nem tükör) eseményhez készíts.</p>
              )}
              {event.place && <div className="dr-field"><h4>Helyszín</h4><p>{placeIcon(event.place)} {event.place}</p></div>}
              {event.note && <div className="dr-field"><h4>Leírás</h4><p>{event.note}</p></div>}
              {event.meetLink && (
                <div className="dr-field">
                  <h4>Google Meet</h4>
                  <p><a href={event.meetLink} target="_blank" rel="noopener noreferrer">📹 Belépés a meetre</a>{event.mstatus === 'tentative' ? ' · egyeztetés alatt' : ''}</p>
                </div>
              )}
              {canEdit && event.extSource !== 'outlook' && (
                <div className="dr-field" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {onCreateMeet && (
                    <button className="btn btn--ink" title="Automatikusan létrehoz egy Google Meet-linket ehhez az eseményhez, és beírja ide (a résztvevők vendégként)"
                      onClick={() => onCreateMeet(event.id)}>{event.meetLink ? '📹 Új Meet-link' : '📹 Meet-link készítése'}</button>
                  )}
                  <button className="btn" title="Kézi: Google Naptár-esemény előtöltve videohívással (a Google-ben mented)"
                    onClick={() => {
                      const emails = [event.owner, ...event.people].filter((n): n is string => !!n).map(emailFor).filter((x): x is string => !!x);
                      window.open(meetUrl(event, [...new Set(emails)]), '_blank', 'noopener');
                    }}>📹 Meet szervezése (kézi)</button>
                  {event.mstatus === 'tentative' && !(event.meetSlots?.length) && onConfirmMeet && (
                    <button className="btn btn--ink" title="Az időpont-egyeztetés lezárása: az esemény véglegessé válik (a dátumot a szerkesztőben állítod, a Google-naptár követi)"
                      onClick={() => onConfirmMeet(event.id)}>✔ Időpont véglegesítése</button>
                  )}
                  {onConfirmMeetSlot && (
                    <SlotConfirm event={event} onConfirm={(s) => onConfirmMeetSlot(event.id, s)} />
                  )}
                  {meetMsg && <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{meetMsg}</span>}
                </div>
              )}
            </>
          )}

          {/* AZ ESEMÉNY FELADATAI - kattintásra a feladat részletezője nyílik */}
          {event && (
            <>
              <Sec cls="c-yellow">Az esemény feladatai · {linked.filter((t) => t.status === 'done').length}/{linked.length}</Sec>
              {linked.length === 0 && <p className="dr-empty">Ehhez az eseményhez még nincs feladat.</p>}
              {linked.map((t) => {
                const st = taskSteps(t);
                return (
                  <div key={t.id} className={`dr-task st-${t.status}`}>
                    {canEdit && onTaskStatus && (
                      <button className={`ag-check${t.status === 'done' ? ' is-on' : ''}`} title={t.status === 'done' ? 'Visszaállítás nyitottra' : 'Kész - pipa'}
                        onClick={() => onTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done')}>{t.status === 'done' ? '✓' : ''}</button>
                    )}
                    <button className="dr-task-open" onClick={() => onOpenTask(t.id)} title="A feladat részletei">
                      <span className="dot" />
                      <span className="t">{t.title}</span>
                      <span className="m">{st.length > 0 ? `☑ ${stepsDone(t)}/${st.length}` : ''}{t.dueDate ? ` · 📅 ${fmtDueHu(t.dueDate)}` : ''}</span>
                    </button>
                  </div>
                );
              })}
              {canEdit && <button className="btn dr-addtask" onClick={() => onAddTaskFor(event.id)}>+ Új feladat ehhez az eseményhez</button>}
            </>
          )}

          {/* KI MIT CSINÁL: személyenként elkülönülő kártya - a név alatt az Ő teendői, itt pipálhatók */}
          <Sec cls="c-blue">Ki mit csinál{allSteps.length > 0 ? ` · ${allDone}/${allSteps.length} lépés kész` : ''}</Sec>
          {persons.length === 0 && unassigned.length === 0 && <p className="dr-empty">Még nincs felelős, résztvevő vagy lépés.</p>}
          {persons.map((name) => {
            const st = stepsOf(name);
            const dn = st.filter((s) => s.done).length;
            return (
              <div key={name} className={`dr-person${name === owner ? ' dr-person--owner' : ''}`}>
                <div className="dr-person-h">
                  <PersonChip name={name} star={name === owner} on={false} kind={kindOf[name]} onClick={() => onPerson(name)} />
                  {name === owner && <span className="dr-person-role">felelős</span>}
                  {st.length > 0 && <span className={`dr-person-count${dn === st.length ? ' ok' : ''}`}>☑ {dn}/{st.length}</span>}
                </div>
                {st.length > 0 ? stepList(st) : <div className="dr-person-none">nincs kiosztott teendője</div>}
              </div>
            );
          })}
          {unassigned.length > 0 && (
            <div className="dr-person dr-person--free">
              <div className="dr-person-h">
                <span className="dr-person-free-t">Kiosztatlan lépések</span>
                <span className="dr-person-count">☑ {unassigned.filter((s) => s.done).length}/{unassigned.length}</span>
              </div>
              {stepList(unassigned)}
              {canEdit && <div className="dr-person-none">a szerkesztőben adhatsz felelőst: ✎ Szerkesztés → Alfeladatok → 👤</div>}
            </div>
          )}

          {/* LEVELEZÉS - csak szerkesztő módban (a Levelek nézet is az) */}
          {canEdit && (
            <>
              <Sec cls="c-green">Levelezés · {letters.length}</Sec>
              {letters.length === 0 && <p className="dr-empty">Ehhez a tételhez még nincs mentett levél.</p>}
              {letters.map((l) => {
                const st = l.status ?? 'draft';
                return (
                  <button key={l.id} className="dr-letter" onClick={() => onOpenLetter(l)} title="Megnyitás a levélíróban">
                    <span className={`dr-lst ${st}`}>{st === 'sent' ? '✓' : '✎'}</span>
                    <span className="t">{l.subject}</span>
                    <span className="m">{fmtLetter(l.createdAt)} · {l.names.length} címzett</span>
                  </button>
                );
              })}
              <button className="btn dr-addtask" onClick={onNotify}>✉ Új levél ehhez a tételhez</button>
            </>
          )}
        </div>
        <div className="dr-foot">
          <button className="btn" onClick={onClose}>✕ Bezárás</button>
          {canEdit && <button className="btn btn--ink" onClick={onEdit}>✎ Szerkesztés</button>}
        </div>
      </aside>
    </>
  );
}
