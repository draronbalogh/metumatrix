'use client';

import { useState } from 'react';

// Helyszín-gyorskitöltő: az esemény vagy a METU-n van, vagy külső helyszínen.
// METU: "METU, Infopark D épület, 212, 225" épül a chipekből (több terem is választható).
// Külső helyszín: a chipek eltűnnek, az egyedi cím a szöveges mezőbe írható.
export const PLACE_BUILDINGS = ['D épület', 'I épület'];
export const PLACE_ROOMS = ['212', '225', '236', '203', '207', 'nagy előadó'];
const METU_PREFIX = 'METU, Infopark';

export default function PlaceQuickPick({ value, onPick }: { value?: string; onPick: (place: string) => void }) {
  const [mode, setMode] = useState<'metu' | 'kulso'>(() => (!value || value.startsWith('METU') ? 'metu' : 'kulso'));
  const [b, setB] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);

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
      <button type="button" className={`chip${mode === 'kulso' ? ' is-on' : ''}`}
        onClick={() => { setMode('kulso'); if (value && value.startsWith('METU')) onPick(''); }}>Külső helyszín</button>
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
