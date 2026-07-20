'use client';
// 🖨 Havi eredmény-riport a dékáni körnek (Kiss Melinda + Pálfi Szabolcs).
// A hónap szakos eseményeiből (Outlook-tükrök és függő egyeztetések NÉLKÜL) a
// Titkárnő (helyi claude, /api/rephrase) fogalmaz: top 3 eredmény, majd a többi
// "- " jellel, egy-egy mondattal. A szöveg másolható és kimenő levélként a Postázóba tehető.
import { useMemo, useState } from 'react';
import { Agenda, Letter, fmtDayHu } from '@/data/agenda';
import { editHeaders } from '@/lib/editkey';

const HU_MONTH = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const RECIPIENTS = [
  { name: 'Kiss Melinda', email: 'mkiss@metropolitan.hu', kind: 'I' },
  { name: 'Pálfi Szabolcs', email: 'szpalfi@metropolitan.hu', kind: 'I' },
];

export default function MonthReport({ monthKey, agenda, onClose, onSaveLetter }: {
  monthKey: string; agenda: Agenda; onClose: () => void; onSaveLetter: (l: Letter) => void;
}) {
  const y = monthKey.slice(0, 4);
  const monthName = HU_MONTH[Number(monthKey.slice(5, 7)) - 1] ?? monthKey;
  const subjectDefault = `Média Design szak - havi beszámoló (${y}. ${monthName})`;
  // a hónap bemutatható eseményei: saját szakos tételek, egyeztetés/tükör nélkül
  const lines = useMemo(() => agenda.events
    .filter((e) => (e.day ? e.day.slice(0, 7) === monthKey : e.sort === monthKey))
    .filter((e) => e.extSource !== 'outlook' && e.mstatus !== 'tentative' && !/egyeztet/i.test(e.title))
    .sort((a, b) => (a.day ?? `${monthKey}-99`).localeCompare(b.day ?? `${monthKey}-99`))
    .map((e) => `${e.day ? fmtDayHu(e.day) : 'a hónap folyamán'} - ${e.title}${e.place ? ` (${e.place})` : ''}${e.note ? ` · ${e.note.slice(0, 140)}` : ''}`),
  [agenda.events, monthKey]);
  const fallback = useMemo(() => [
    'Kedves Melinda, kedves Szabolcs!',
    '',
    `Rövid összefoglaló a Média Design szak ${y}. ${monthName} havi eredményeiről:`,
    '',
    ...lines.map((l) => `- ${l}`),
    '',
    'Üdvözlettel:',
    'Balogh Áron',
  ].join('\n'), [lines, y, monthName]);
  const [subject, setSubject] = useState(subjectDefault);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!lines.length) { setMsg('Ebben a hónapban nincs bemutatható szakos esemény.'); return; }
    setBusy(true); setMsg('Titkárnő fogalmaz…');
    try {
      const res = await fetch('/api/rephrase', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          senderName: 'Kiss Melinda és Pálfi Szabolcs (dékáni kör)',
          senderEmail: RECIPIENTS[0].email,
          subject: subjectDefault, gist: null, thread: [], drafts: [], askAllowed: false,
          card: { kind: 'havi eredmény-riport', lines },
          instruction: `Havi mini-riportot írj a dékáni körnek a Média Design szak ${y}. ${monthName} havi eredményeiről, a kártya esemény-listájából. A cél megmutatni, milyen eredményes a szak és a hallgatóink: kiállítás, verseny, előadás, szakmai program, szervezett esemény. Felépítés: rövid, büszke, tényszerű felvezető mondat; utána "Kiemelt eredményeink:" alatt a 3 LEGFONTOSABB esemény "- " jellel, mindegyikhez PONTOSAN EGY lelkes, tényszerű mondat; utána "További szakmai programjaink:" alatt az összes többi esemény ugyanígy "- " jellel és egy-egy mondattal. Személyes egyeztetést, adminisztratív tételt NE szerepeltess. Ne találj ki eseményt, csak a listából dolgozz. Zárás: egy mondat arról, hogy kérdés esetén szívesen adunk részleteket.`,
        }),
      });
      const j = await res.json() as { ok?: boolean; subject?: string; body?: string; error?: string };
      if (j.ok && j.body) { setBody(j.body); if (j.subject) setSubject(j.subject); setMsg('✓ Kész - nézd át, szerkeszthető.'); }
      else { setBody(fallback); setMsg(`A Titkárnő most nem elérhető (${j.error ?? 'hiba'}) - determinisztikus lista töltve.`); }
    } catch { setBody(fallback); setMsg('A Titkárnő most nem elérhető - determinisztikus lista töltve.'); }
    setBusy(false);
  };
  const toOutbox = () => {
    if (!body.trim()) return;
    onSaveLetter({
      id: `l-${Date.now().toString(36)}`, createdAt: new Date().toISOString(),
      targetType: null, targetId: null,
      subject: subject.trim() || subjectDefault, body: body.trim(),
      names: RECIPIENTS.map((r) => r.name), recipients: RECIPIENTS,
      status: 'outbox', dir: 'out', sendMode: 'personal', scheduledFor: null,
    });
    setMsg('✓ A Posta Kimenő listájában - ott véglegesítheted és küldheted.');
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--tabs">
        <h3>🖨 Havi riport - {y}. {monthName}</h3>
        <div className="f" style={{ display: 'grid', gap: 10 }}>
          <div className="field full">
            <label>A hónap bemutatható eseményei ({lines.length}) - ebből dolgozik a Titkárnő</label>
            {lines.length === 0
              ? <div className="se-empty">Nincs bemutatható szakos esemény ebben a hónapban.</div>
              : <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.88rem' }}>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
          </div>
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field full">
            <label>A levél - címzettek: {RECIPIENTS.map((r) => r.name).join(', ')}</label>
            <textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder={'Nyomd meg a „Titkárnő megfogalmazása" gombot, vagy írd kézzel.'} style={{ font: 'inherit', width: '100%' }} />
          </div>
          {msg && <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--muted)' }}>{msg}</p>}
        </div>
        <div className="mfoot">
          <button className="btn btn--ink" disabled={busy || !lines.length} onClick={generate}>{busy ? '⏳ Fogalmaz…' : '🗣 Titkárnő megfogalmazása'}</button>
          <button className="btn" disabled={!body.trim()} onClick={() => { void navigator.clipboard?.writeText(`${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 2500); }}>{copied ? '✓ Másolva' : '⧉ Másolás'}</button>
          <button className="btn" disabled={!body.trim()} onClick={toOutbox}>✉ Küldésre a Postába</button>
          <span className="sp" />
          <button className="btn" onClick={onClose}>✕ Bezárás</button>
        </div>
      </div>
    </div>
  );
}
