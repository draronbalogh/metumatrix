'use client';

import { useState } from 'react';

// Egyetemi helyszín-gyorskitöltő: épület + terem chipek.
// Külső helyszínnél a szöveges mezőbe szabadon írható az egyedi cím.
export const PLACE_BUILDINGS = ['D épület', 'I épület'];
export const PLACE_ROOMS = ['212', '225', '236', '203', '207', 'nagy előadó'];

export function composePlace(building: string, room: string): string {
  if (!building) return room === 'nagy előadó' ? 'Nagy előadó' : room;
  if (!room) return building;
  return room === 'nagy előadó' ? `${building}, nagy előadó` : `${building} ${room}`;
}

export default function PlaceQuickPick({ onPick }: { onPick: (place: string) => void }) {
  const [b, setB] = useState('');
  const [r, setR] = useState('');
  const apply = (nb: string, nr: string) => {
    setB(nb); setR(nr);
    const v = composePlace(nb, nr);
    if (v) onPick(v);
  };
  return (
    <div className="place-quick">
      {PLACE_BUILDINGS.map((x) => (
        <button key={x} type="button" className={`chip${b === x ? ' is-on' : ''}`} onClick={() => apply(b === x ? '' : x, r)}>{x}</button>
      ))}
      <span className="pq-sep" />
      {PLACE_ROOMS.map((x) => (
        <button key={x} type="button" className={`chip${r === x ? ' is-on' : ''}`} onClick={() => apply(b, r === x ? '' : x)}>{x}</button>
      ))}
    </div>
  );
}
