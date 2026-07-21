'use client';
// Kozos tobb-idopontos Meet-szerkeszto: N idopont-sor (nap + kezdes + veg) "+ Idopont"
// gombbal (korlat nelkul, maxSlots-ig) es soronkenti torlessel. Opcionalisan helyszin- es
// kezi Meet-link-mezot is mutat. A "Meet-link keszitese" gombot es az uzeneteket a HOST
// teszi ele (mert a wizard kartyat is ment, a postazo csak a linket a levelbe) - itt csak a
// visszatero, minden helyen azonos slot-lista el. Hasznalja: NotifyModal, LevelWizard.
import React from 'react';
import { MeetSlot } from '@/lib/letters';

const box: React.CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid var(--line)', font: 'inherit', color: 'var(--ink)', background: 'var(--paper, #fff)' };

interface Props {
  slots: MeetSlot[];
  onSlots: (s: MeetSlot[]) => void;
  place?: string;
  onPlace?: (p: string) => void;   // ha megadva: helyszin-mezot mutat
  link?: string;
  onLink?: (v: string) => void;    // ha megadva: kezi link-mezot mutat (kezi beillesztes)
  maxSlots?: number;               // default 8
}

export default function MeetSlots({ slots, onSlots, place = '', onPlace, link = '', onLink, maxSlots = 8 }: Props) {
  const setSlot = (i: number, patch: Partial<MeetSlot>) => onSlots(slots.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addSlot = () => { if (slots.length < maxSlots) onSlots([...slots, { day: '', start: '', end: '' }]); };
  const removeSlot = (i: number) => { if (slots.length > 1) onSlots(slots.filter((_, j) => j !== i)); };
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {slots.map((s, i) => (
        <div key={i} className="ms-row" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--muted)', fontSize: '.8rem', width: 62 }}>{i + 1}. időpont</span>
          <input type="date" value={s.day} onChange={(e) => setSlot(i, { day: e.target.value })} style={{ font: 'inherit' }} />
          <input type="time" value={s.start ?? ''} onChange={(e) => setSlot(i, { start: e.target.value })} style={{ font: 'inherit' }} title="Kezdés" />
          <span aria-hidden>-</span>
          <input type="time" value={s.end ?? ''} onChange={(e) => setSlot(i, { end: e.target.value })} style={{ font: 'inherit' }} title="Vége" />
          {slots.length > 1 && <button type="button" className="btn" onClick={() => removeSlot(i)} title="Időpont törlése">✕</button>}
        </div>
      ))}
      {slots.length < maxSlots && <button type="button" className="btn" style={{ justifySelf: 'start' }} onClick={addSlot}>+ Időpont</button>}
      {onPlace && <input value={place} onChange={(e) => onPlace(e.target.value)} placeholder="Helyszín (pl. Infopark D, vagy online)" style={box} />}
      {onLink && <input value={link} onChange={(e) => onLink(e.target.value)} placeholder="Meet-link (kézzel is beilleszthető)" style={box} />}
    </div>
  );
}
