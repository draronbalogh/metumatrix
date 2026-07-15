'use client';

import type { ReactNode } from 'react';
import { Agenda, AgendaEvent, AgendaTask, Letter, PRIORITY_LABEL, STATUS_LABEL, fmtDayHu, taskSteps, stepsDone } from '@/data/agenda';
import { PersonKind } from '@/data/people';
import { PersonChip, familyName } from './AgendaView';

// Feladat / esemény RÉSZLETEZŐ — az „egy kártya mindenhol" elv az agendára:
// a listában csak tömör, 2 soros kártyák vannak, minden részlet ITT nyílik meg,
// a szerkesztő füleivel azonos szakasz-logikával (alap / alfeladatok / emberek / levelek).

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
  onPerson: (name: string) => void;        // név-szűrő (bezárja a részletezőt a hívó)
  onNotify: () => void;                    // ✉ új levél ehhez a tételhez
  onOpenLetter: (l: Letter) => void;
  onAddTaskFor: (eventId: string) => void;
  emailFor: (name: string) => string | null; // a Névjegyzékből — a Meet-meghívó vendégeihez
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

// szakaszfej — a szerkesztő-fülek színvilágával (sárga=alfeladatok, kék=emberek, zöld=levelek)
function Sec({ cls, children }: { cls?: string; children: ReactNode }) {
  return <div className={`dr-sec${cls ? ` ${cls}` : ''}`}>{children}</div>;
}

export default function AgendaDrawer({ det, agenda, letters, kindOf, canEdit, onClose, onEdit, onOpenTask, onOpenEvent, onToggleStep, onPerson, onNotify, onOpenLetter, onAddTaskFor, emailFor }: Props) {
  const task = det.kind === 'task' ? agenda.tasks.find((t) => t.id === det.id) ?? null : null;
  const event = det.kind === 'event' ? agenda.events.find((e) => e.id === det.id) ?? null : null;
  if (!task && !event) return null;

  const linked = event ? agenda.tasks.filter((t) => t.eventId === event.id) : [];
  const owner = (task?.owner ?? event?.owner) || null;
  const people = task?.people ?? event?.people ?? [];
  const persons = [...(owner ? [owner] : []), ...people.filter((p) => p !== owner)];

  // személy-blokk: mindenki neve alatt rögtön az Ő lépései — feladatnál a saját steps-ből,
  // eseménynél a kapcsolt feladatokból; a gazdátlan lépéseket a felelős viszi
  const stepsOf = (name: string): { taskId: string; taskTitle: string | null; ix: number; text: string; done: boolean; due: string | null }[] => {
    const out: { taskId: string; taskTitle: string | null; ix: number; text: string; done: boolean; due: string | null }[] = [];
    const collect = (t: AgendaTask, withTitle: boolean) => {
      taskSteps(t).forEach((s, ix) => {
        const assignee = s.owner || t.owner || null;
        if (assignee === name) out.push({ taskId: t.id, taskTitle: withTitle ? t.title : null, ix, text: s.text, done: s.done, due: s.due ?? null });
      });
    };
    if (task) collect(task, false);
    linked.forEach((t) => collect(t, true));
    return out;
  };

  const evTitle = task?.eventId ? agenda.events.find((e) => e.id === task.eventId)?.title ?? null : null;

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="dr-top">
          {task && <div className="dr-eyebrow">Feladat · {PRIORITY_LABEL[task.priority]}{task.category ? ` · ${task.category}` : ''} · {STATUS_LABEL[task.status]}</div>}
          {event && <div className="dr-eyebrow">Esemény{event.featured ? ' · ★ kiemelt' : ''}</div>}
          <h2 className="dr-name">{task?.title ?? event?.title}</h2>
          <div className="dr-actrow">
            {canEdit && <button className="btn btn--ink" onClick={onEdit}>✎ Szerkesztés</button>}
            <button className="btn" onClick={onClose}>✕ Bezárás</button>
          </div>
        </div>
        <div className="dr-scroll">
          {/* ALAP: dátumok, helyszín, kapcsolt esemény, összefoglaló */}
          {task && (
            <>
              <div className="dr-field">
                <h4>Határidő</h4>
                <p className={task.dueDate || task.due ? '' : 'none'}>
                  {task.dueDate ? `📅 ${fmtDayHu(task.dueDate)}` : ''}{task.dueDate && task.due ? ' · ' : ''}{task.due || (task.dueDate ? '' : 'nincs megadva')}
                </p>
              </div>
              {evTitle && task.eventId && (
                <div className="dr-field">
                  <h4>Kapcsolt esemény</h4>
                  <p><button className="dr-link" onClick={() => onOpenEvent(task.eventId as string)}>▤ {evTitle}</button></p>
                </div>
              )}
              {task.summary && <div className="dr-field"><h4>Rövid összefoglaló</h4><p>{task.summary}</p></div>}
              {task.source && <div className="dr-field"><h4>Beérkezett levélből</h4><p>{task.source.name} &lt;{task.source.email}&gt;{task.source.subject ? ` · „${task.source.subject}"` : ''}</p></div>}
            </>
          )}
          {event && (
            <>
              <div className="dr-field">
                <h4>Időpont</h4>
                <p>🕑 {event.day ? `${fmtDayHu(event.day)}${event.dayEnd ? ` – ${fmtDayHu(event.dayEnd)}` : ''} · ` : ''}{event.when}</p>
              </div>
              {event.place && <div className="dr-field"><h4>Helyszín</h4><p>📍 {event.place}</p></div>}
              {event.note && <div className="dr-field"><h4>Leírás</h4><p>{event.note}</p></div>}
              {canEdit && (
                <div className="dr-field">
                  <button className="btn" title="Google Meet találkozó szervezése: naptár-esemény előtöltve videohívással, résztvevőkkel"
                    onClick={() => {
                      const emails = [event.owner, ...event.people].filter((n): n is string => !!n).map(emailFor).filter((x): x is string => !!x);
                      window.open(meetUrl(event, [...new Set(emails)]), '_blank', 'noopener');
                    }}>📹 Meet szervezése</button>
                </div>
              )}
            </>
          )}

          {/* ALFELADATOK (feladatnál) — itt pipálhatók */}
          {task && (
            <>
              <Sec cls="c-yellow">Alfeladatok · {stepsDone(task)}/{taskSteps(task).length}</Sec>
              {taskSteps(task).length === 0 && <p className="dr-empty">Nincsenek alfeladatok.</p>}
              {taskSteps(task).length > 0 && (
                <ul className="dr-steps">
                  {taskSteps(task).map((s, ix) => (
                    <li key={ix} className={s.done ? 'is-done' : ''}>
                      <button className={`ag-scheck${s.done ? ' is-on' : ''}`} disabled={!canEdit}
                        title={s.done ? 'Visszaállítás nyitottra' : 'Alfeladat kész — pipa'}
                        onClick={() => onToggleStep(task.id, ix)}>{s.done ? '✓' : ''}</button>
                      <span className="tx">{s.text}</span>
                      {(s.owner || s.due) && (
                        <span className="ag-smeta">{s.owner ? `👤 ${familyName(s.owner)}` : ''}{s.owner && s.due ? ' · ' : ''}{s.due ? `📅 ${fmtDayHu(s.due)}` : ''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* AZ ESEMÉNY FELADATAI — kattintásra a feladat részletezője nyílik */}
          {event && (
            <>
              <Sec cls="c-yellow">Az esemény feladatai · {linked.filter((t) => t.status === 'done').length}/{linked.length}</Sec>
              {linked.length === 0 && <p className="dr-empty">Ehhez az eseményhez még nincs feladat.</p>}
              {linked.map((t) => {
                const st = taskSteps(t);
                return (
                  <button key={t.id} className={`dr-task st-${t.status}`} onClick={() => onOpenTask(t.id)} title="A feladat részletei">
                    <span className="dot" />
                    <span className="t">{t.title}</span>
                    <span className="m">{st.length > 0 ? `☑ ${stepsDone(t)}/${st.length}` : ''}{t.dueDate ? ` · 📅 ${fmtDayHu(t.dueDate)}` : ''}</span>
                  </button>
                );
              })}
              {canEdit && <button className="btn dr-addtask" onClick={() => onAddTaskFor(event.id)}>+ Új feladat ehhez az eseményhez</button>}
            </>
          )}

          {/* EMBEREK: mindenki neve alatt az Ő lépései — egy pillantásra látszik, ki mit visz */}
          <Sec cls="c-blue">Emberek · {persons.length}</Sec>
          {persons.length === 0 && <p className="dr-empty">Még nincs felelős vagy résztvevő.</p>}
          {persons.map((name) => {
            const st = stepsOf(name);
            return (
              <div key={name} className="dr-person">
                <div className="dr-person-h">
                  <PersonChip name={name} star={name === owner} on={false} kind={kindOf[name]} onClick={() => onPerson(name)} />
                  {name === owner && <span className="dr-person-role">felelős</span>}
                </div>
                {st.length > 0 && (
                  <ul className="dr-person-steps">
                    {st.map((s, i) => (
                      <li key={i} className={s.done ? 'is-done' : ''}>
                        <span className="dt">{s.done ? '✓' : '○'}</span>
                        <span className="tx">{s.taskTitle ? `${s.taskTitle}: ` : ''}{s.text}</span>
                        {s.due && <span className="du">📅 {fmtDayHu(s.due)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {st.length === 0 && <div className="dr-person-none">nincs külön lépése</div>}
              </div>
            );
          })}

          {/* LEVELEZÉS — csak szerkesztő módban (a Levelek nézet is az) */}
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
          {canEdit && <button className="btn btn--ink" onClick={onEdit}>✎ Szerkesztés</button>}
          <button className="btn" onClick={onClose}>✕ Bezárás</button>
        </div>
      </aside>
    </>
  );
}
