'use client';
// Függő Meet-időpontok véglegesítője: a javasolt slotok chipekként, a választott lesz
// az esemény időpontja, a többi javaslat eltűnik (meetSlots törlődik, mstatus confirmed).
// Két hoszt: a részletező (AgendaDrawer) és a Posta válasz-szerkesztője.
import { AgendaEvent, AgendaMeetSlot, fmtDayHu } from '@/data/agenda';

export default function SlotConfirm({ event, onConfirm }: { event: AgendaEvent; onConfirm: (slot: AgendaMeetSlot) => void }) {
  const slots = event.meetSlots ?? [];
  if (event.mstatus !== 'tentative' || !slots.length) return null;
  return (
    <div className="slotconfirm">
      <span className="sc-h">✔ Időpont véglegesítése - melyik legyen?</span>
      {slots.map((s, i) => (
        <button key={i} type="button" className="chip" title="Ez lesz az esemény végleges időpontja"
          onClick={() => onConfirm(s)}>{fmtDayHu(s.day)}{s.start ? ` ${s.start}` : ''}{s.end && s.end !== s.start ? `-${s.end}` : ''}</button>
      ))}
    </div>
  );
}
