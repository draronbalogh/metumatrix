'use client';
// Meet-idopont blokk a Posta VALASZ-szerkesztojehez (editDraft). Mod + tobb javasolt idopont
// (kozos MeetSlots) + "Meet-link keszitese" (createMeet -> tentativ Google-esemeny + link) +
// "Beszuras a levelbe" (meetingText hozzafuzese a valasz szovegehez). A linket a hivo a
// kartyara is felteszi (onLink). Ugyanaz a keszlet, mint a postazoban/wizardban.
import { useState } from 'react';
import { MeetSlot, MeetingMode } from '@/lib/letters';
import { createMeet, meetingText } from '@/lib/meet';
import { editHeaders } from '@/lib/editkey';
import MeetSlots from './MeetSlots';

interface Props {
  title: string;                       // a Google-esemeny cime (a valasz targya)
  recipientEmail?: string | null;      // a valasz cimzettje (a felado) - Meet-resztvevo
  onInsert: (text: string) => void;    // a meeting-szoveg hozzafuzese a valaszhoz
  onLink?: (link: string) => void;     // a link felkerul a kartyara is
  onCreated?: (info: { link: string; googleEventId: string; day: string; start: string; end: string }) => void; // sikeres letrehozas: tukor-esemeny a sajat naptarba
}

export default function ReplyMeet({ title, recipientEmail, onInsert, onLink, onCreated }: Props) {
  const [mode, setMode] = useState<MeetingMode | 'nincs'>('nincs');
  const [slots, setSlots] = useState<MeetSlot[]>([{ day: '', start: '', end: '' }]);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const make = async () => {
    if (slots.every((s) => !s.day || !s.start)) { setMsg('Adj meg legalább egy időpontot (nap + kezdés).'); return; }
    setBusy(true); setMsg(null);
    const r = await createMeet({
      title: title || 'METU egyeztetés', slots,
      attendees: recipientEmail ? [recipientEmail] : [], sendInvite: false, headers: editHeaders(),
    });
    if (r.unconfigured) setMsg('A Google Meet nincs beállítva - a linket kézzel is beillesztheted (▶ Google Meet ↗).');
    else if (r.error) setMsg(`Meet hiba: ${r.error}`);
    else {
      setLink(r.link); onLink?.(r.link);
      const first = slots.filter((s) => s.day && s.start)[0];
      if (first) onCreated?.({ link: r.link, googleEventId: r.googleEventId, day: first.day, start: first.start ?? '', end: first.end ?? '' });
      setMsg(r.link ? '✓ Meet-link kész (a naptáradba is bekerült egyeztetés alatti eseményként).' : 'Kész (link nélkül).');
    }
    setBusy(false);
  };

  const insert = () => { if (mode !== 'nincs') onInsert(meetingText(mode, slots, link)); };

  return (
    <div style={{ display: 'grid', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: 10, marginTop: 8 }}>
      <label style={{ fontWeight: 600 }}>📅 Google Meet időpont(ok) a válaszba
        <a className="nm-bodytoggle nm-meetlink" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8 }}
          title="Új Google Meet indítása új lapon - a létrejött linket másold be ide">▶ Google Meet ↗</a>
      </label>
      <div className="chipradio">
        {([['nincs', 'Nincs'], ['online', 'Online'], ['szemelyes', 'Személyes'], ['hibrid', 'Hibrid']] as const).map(([id, l]) => (
          <button type="button" key={id} aria-pressed={mode === id} className={`crx c-green${mode === id ? ' is-on' : ''}`} onClick={() => setMode(id)}>{l}</button>
        ))}
      </div>
      {mode !== 'nincs' && (
        <>
          <MeetSlots slots={slots} onSlots={setSlots}
            link={mode !== 'szemelyes' ? link : undefined}
            onLink={mode !== 'szemelyes' ? setLink : undefined} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mode !== 'szemelyes' && (
              <button type="button" className="btn btn--ink" disabled={busy} onClick={make}>{busy ? 'Létrehozás…' : '🔗 Meet-link készítése'}</button>
            )}
            <button type="button" className="btn" onClick={insert} title="A javasolt időpontok (és a link) hozzáfűzése a válasz szövegéhez">⬇ Beszúrás a levélbe</button>
          </div>
          {msg && <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--muted)' }}>{msg}</p>}
        </>
      )}
    </div>
  );
}
