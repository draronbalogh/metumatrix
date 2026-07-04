'use client';

import { useEffect, useState } from 'react';
import { AgendaEvent, AgendaTask, STATUS_LABEL, STATUS_ORDER, TaskStatus } from '@/data/agenda';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

// ---- Feladat ----

interface TaskProps {
  task: AgendaTask;
  isNew: boolean;
  onSave: (t: AgendaTask) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskModal({ task, isNew, onSave, onDelete, onClose }: TaskProps) {
  const [d, setD] = useState(() => ({
    title: task.title, summary: task.summary, ideas: task.ideas.join('\n'),
    status: task.status as string, owner: task.owner ?? '', due: task.due ?? '',
  }));
  useEsc(onClose);
  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!d.title.trim()) return;
    onSave({
      ...task,
      title: d.title.trim(),
      summary: d.summary.trim(),
      ideas: d.ideas.split('\n').map((s) => s.trim()).filter(Boolean),
      status: d.status as TaskStatus,
      owner: d.owner.trim() || null,
      due: d.due.trim() || null,
    });
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{isNew ? 'Új feladat' : 'Feladat szerkesztése'}</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="field full">
            <label>Feladat neve</label>
            <input autoFocus value={d.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="field">
            <label>Állapot</label>
            <select value={d.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Felelős</label>
            <input value={d.owner} onChange={(e) => set('owner', e.target.value)} placeholder="pl. Tamás" />
          </div>
          <div className="field full">
            <label>Határidő / időzítés</label>
            <input value={d.due} onChange={(e) => set('due', e.target.value)} placeholder="pl. szeptemberre" />
          </div>
          <div className="field full">
            <label>Rövid összefoglaló — a kártyán ez látszik</label>
            <textarea rows={2} value={d.summary} onChange={(e) => set('summary', e.target.value)} placeholder="miről szól a feladat" />
          </div>
          <div className="field full">
            <label>Ötletek / teendők — soronként egy</label>
            <textarea rows={6} value={d.ideas} onChange={(e) => set('ideas', e.target.value)} placeholder={'első lépés\nmásodik lépés'} />
          </div>
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

// ---- Esemény ----

interface EventProps {
  event: AgendaEvent;
  isNew: boolean;
  onSave: (e: AgendaEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EventModal({ event, isNew, onSave, onDelete, onClose }: EventProps) {
  const [d, setD] = useState(() => ({
    title: event.title, when: event.when, sort: event.sort ?? '',
    note: event.note ?? '', place: event.place ?? '', owner: event.owner ?? '',
  }));
  useEsc(onClose);
  const set = (k: keyof typeof d, v: string) => setD((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!d.title.trim()) return;
    onSave({
      ...event,
      title: d.title.trim(),
      when: d.when.trim() || 'időpont egyeztetés alatt',
      sort: d.sort.trim() || null,
      note: d.note.trim() || null,
      place: d.place.trim() || null,
      owner: d.owner.trim() || null,
    });
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{isNew ? 'Új esemény' : 'Esemény szerkesztése'}</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="field full">
            <label>Esemény neve</label>
            <input autoFocus value={d.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="field">
            <label>Mikor — szabad szöveg</label>
            <input value={d.when} onChange={(e) => set('when', e.target.value)} placeholder="pl. szeptember vagy október eleje" />
          </div>
          <div className="field">
            <label>Rendezési hónap</label>
            <input type="month" value={d.sort} onChange={(e) => set('sort', e.target.value)} title="Ez alapján rendeződik a lista; üresen a végére kerül" />
          </div>
          <div className="field">
            <label>Helyszín</label>
            <input value={d.place} onChange={(e) => set('place', e.target.value)} placeholder="pl. Linz" />
          </div>
          <div className="field">
            <label>Felelős</label>
            <input value={d.owner} onChange={(e) => set('owner', e.target.value)} />
          </div>
          <div className="field full">
            <label>Leírás</label>
            <textarea rows={3} value={d.note} onChange={(e) => set('note', e.target.value)} placeholder="mire kell készülni, mi kapcsolódik hozzá" />
          </div>
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

// ---- Bevezető szöveg ----

interface IntroProps {
  intro: string;
  onSave: (s: string) => void;
  onClose: () => void;
}

export function IntroModal({ intro, onSave, onClose }: IntroProps) {
  const [v, setV] = useState(intro);
  useEsc(onClose);
  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>Bevezető szöveg</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
          <div className="field full">
            <label>A Feladatok oldal tetején megjelenő szöveg</label>
            <textarea autoFocus rows={7} value={v} onChange={(e) => setV(e.target.value)} />
          </div>
        </form>
        <div className="mfoot">
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={() => onSave(v)}>Mentés</button>
        </div>
      </div>
    </div>
  );
}
