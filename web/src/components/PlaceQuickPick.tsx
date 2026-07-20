'use client';

import { useState } from 'react';

// Helyszín-gyorskitöltő: az esemény a METU-n van, online (Google Meet) vagy külső helyszínen.
// METU: "METU, Infopark D épület, 212, 225" épül a chipekből (több terem is választható).
// Online: a helyszín "Online (Google Meet)" - a Meet-linket a mentéskori Google-push adja.
// Külső helyszín: a chipek eltűnnek, az egyedi cím a szöveges mezőbe írható.
export const PLACE_BUILDINGS = ['D épület', 'I épület'];
export const PLACE_ROOMS = ['212', '225', '236', '203', '207', 'nagy előadó'];
export const PLACE_ONLINE = 'Online (Google Meet)';
const METU_PREFIX = 'METU, Infopark';

// meglévő "METU, Infopark D épület, 212, 225" érték visszafejtése a chipek kezdőállapotához
const parseValue = (v?: string): { b: string; rooms: string[] } => {
  if (!v || !v.startsWith('METU')) return { b: '', rooms: [] };
  const b = PLACE_BUILDINGS.find((x) => v.includes(x)) || '';
  const rooms = PLACE_ROOMS.filter((x) =>
    x === 'nagy előadó' ? v.toLowerCase().includes('nagy előadó') : new RegExp(`(^|[ ,])${x}([ ,]|$)`).test(v));
  return { b, rooms };
};

export default function PlaceQuickPick({ value, onPick }: { value?: string; onPick: (place: string) => void }) {
  const [mode, setMode] = useState<'metu' | 'online' | 'kulso'>(() =>
    value?.startsWith('Online') ? 'online' : (!value || value.startsWith('METU') ? 'metu' : 'kulso'));
  const [b, setB] = useState(() => parseValue(value).b);
  const [rooms, setRooms] = useState<string[]>(() => parseValue(value).rooms);

  const emit = (nb: string, nr: string[]) => {
    const head = nb ? `${METU_PREFIX} ${nb}` : METU_PREFIX;
    onPick(nr.length ? `${head}, ${nr.join(', ')}` : head);
  };
  const pickBuilding = (x: string) => {
    const nb = b === x ? '' : x;
    setB(nb); emit(nb, rooms);
  };
  const pickRoom = (x: string) => {
    const nr = rooms.includes(x)
      ? rooms.filter((r) => r !== x)
      : PLACE_ROOMS.filter((r) => rooms.includes(r) || r === x);
    setRooms(nr); emit(b, nr);
  };

  return (
    <div className="place-quick">
      <button type="button" className={`chip${mode === 'metu' ? ' is-on' : ''}`} onClick={() => setMode('metu')}>METU</button>
      <button type="button" className={`chip${mode === 'online' ? ' is-on' : ''}`}
        onClick={() => { setMode('online'); onPick(PLACE_ONLINE); }}>Online (Meet)</button>
      <button type="button" className={`chip${mode === 'kulso' ? ' is-on' : ''}`}
        onClick={() => { setMode('kulso'); if (value && (value.startsWith('METU') || value.startsWith('Online'))) onPick(''); }}>Külső helyszín</button>
      {mode === 'metu' && (
        <>
          <span className="pq-sep" />
          {PLACE_BUILDINGS.map((x) => (
            <button key={x} type="button" className={`chip${b === x ? ' is-on' : ''}`} onClick={() => pickBuilding(x)}>{x}</button>
          ))}
          <span className="pq-sep" />
          {PLACE_ROOMS.map((x) => (
            <button key={x} type="button" className={`chip${rooms.includes(x) ? ' is-on' : ''}`} onClick={() => pickRoom(x)}>{x}</button>
          ))}
        </>
      )}
    </div>
  );
}
