'use client';
// 🖨 Havi eredmény-riport a dékáni körnek (Kiss Melinda + Pálfi Szabolcs).
// CÉL: megmutatni, milyen fontos szakmai-kulturális munka folyik a szakon - ezért
// CSAK eredmény jellegű tétel megy a levélbe (kiállítás, verseny, előadás, workshop...).
// Az admin/üzemeltetési tételek (Neptun-leállás, szünet, határidő, vizsgaidőszak stb.)
// alapból KIPIPÁLATLANOK, és minden tétel kézzel ki-be kapcsolható a listában.
// A kiválasztottakból a Titkárnő (helyi claude, /api/rephrase) fogalmaz: top 3 + a többi,
// "- " jellel, egy-egy mondattal. Másolható és kimenő levélként a Postázóba tehető.
import { useMemo, useState } from 'react';
import { Agenda, Letter, fmtDayHu } from '@/data/agenda';
import { editHeaders } from '@/lib/editkey';

const HU_MONTH = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const RECIPIENTS = [
  { name: 'Kiss Melinda', email: 'mkiss@metropolitan.hu', kind: 'I' },
  { name: 'Pálfi Szabolcs', email: 'szpalfi@metropolitan.hu', kind: 'I' },
];
// admin/üzemeltetés/tanügyi menetrend - NEM eredmény, alapból nincs a riportban
const ADMIN_RX = /neptun|leállás|karbantart|szünet|adminisztr|határidő|regisztrác|beiratkoz|vizsgaidőszak|szorgalmi|pótfelvétel|jegybeírás|órarend|értekezlet|megbeszélés|fogadóóra/i;

interface Item { id: string; label: string; admin: boolean }

export default function MonthReport({ monthKey, agenda, onClose, onSaveLetter }: {
  monthKey: string; agenda: Agenda; onClose: () => void; onSaveLetter: (l: Letter) => void;
}) {
  const y = monthKey.slice(0, 4);
  const monthName = HU_MONTH[Number(monthKey.slice(5, 7)) - 1] ?? monthKey;
  const subjectDefault = `Média Design szak - havi beszámoló (${y}. ${monthName})`;
  // a hónap tételei: szakos események (tükör/függő egyeztetés nélkül) + a hónap
  // FELADATAI teljesüléstől függetlenül (kész / folyamatban / teendő jelöléssel)
  const items = useMemo<Item[]>(() => {
    const evs: Item[] = agenda.events
      .filter((e) => (e.day ? e.day.slice(0, 7) === monthKey : e.sort === monthKey))
      .filter((e) => e.extSource !== 'outlook' && e.mstatus !== 'tentative' && !/egyeztet/i.test(e.title))
      .sort((a, b) => (a.day ?? `${monthKey}-99`).localeCompare(b.day ?? `${monthKey}-99`))
      .map((e) => ({
        id: `e:${e.id}`,
        label: `${e.day ? fmtDayHu(e.day) : 'a hónap folyamán'} - ${e.title}${e.place ? ` (${e.place})` : ''}${e.note ? ` · ${e.note.slice(0, 140)}` : ''}`,
        admin: ADMIN_RX.test(`${e.title} ${e.note ?? ''}`),
      }));
    const STATUS_TAG = { done: 'kész', doing: 'folyamatban', todo: 'teendő' } as const;
    const tks: Item[] = agenda.tasks
      .filter((t) => t.dueDate && t.dueDate.slice(0, 7) === monthKey)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .map((t) => ({
        id: `t:${t.id}`,
        label: `${t.dueDate && t.dueDate.length >= 10 ? fmtDayHu(t.dueDate) : 'a hónapban'} - ${t.title} [${STATUS_TAG[t.status]}]${t.summary ? ` · ${t.summary.slice(0, 120)}` : ''}`,
        admin: ADMIN_RX.test(`${t.title} ${t.summary}`),
      }));
    return [...evs, ...tks];
  }, [agenda.events, agenda.tasks, monthKey]);
  // kezdő kijelölés: minden NEM-admin tétel bepipálva
  const [off, setOff] = useState<Set<string>>(() => new Set(items.filter((i) => i.admin).map((i) => i.id)));
  const toggle = (id: string) => setOff((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = items.filter((i) => !off.has(i.id));
  const fallback = useMemo(() => [
    'Kedves Melinda, kedves Szabi!',
    '',
    `Küldöm a havi riportunkat a Média Designról (${y}. ${monthName}):`,
    '',
    ...chosen.map((i) => `- ${i.label}`),
    '',
    'Üdvözlettel:',
    'Balogh Áron',
  ].join('\n'), [chosen, y, monthName]);
  const [subject, setSubject] = useState(subjectDefault);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!chosen.length) { setMsg('Nincs bepipált tétel - jelölj ki legalább egyet.'); return; }
    setBusy(true); setMsg('Titkárnő fogalmaz…');
    try {
      const res = await fetch('/api/rephrase', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          senderName: 'Kiss Melinda és Pálfi Szabolcs (dékáni kör)',
          senderEmail: RECIPIENTS[0].email,
          subject: subjectDefault, gist: null, thread: [], drafts: [], askAllowed: false,
          card: { kind: 'havi eredmény-riport', lines: chosen.map((i) => i.label) },
          instruction: `Havi mini-riportot írj a dékáni körnek a Média Design szak ${y}. ${monthName} havi EREDMÉNYEIRŐL, a kártya listájából. A lista eseményeket ÉS feladatokat is tartalmaz; a feladatoknál [kész]/[folyamatban]/[teendő] jelölés mutatja az állapotot - a kész tételeket eredményként, a folyamatban/teendő tételeket "ezen dolgozunk éppen" jelleggel, pozitívan említsd (a jelölést magát ne írd bele a levélbe). A cél bebizonyítani, milyen fontos szakmai és kulturális munka folyik a szakon, és milyen eredményesek a hallgatóink: kiállítás, verseny, előadás, workshop, fesztivál-részvétel, szervezett szakmai program. Felépítés PONTOSAN így: megszólítás "Kedves Melinda, kedves Szabi!"; utána EGYETLEN rövid, közvetlen mondat: "Küldöm a havi riportunkat a Média Designról." (vagy nagyon hasonló) - SEMMI hosszabb felvezetés; utána "Kiemelt eredményeink:" alatt a 3 LEGFONTOSABB tétel "- " jellel, mindegyikhez PONTOSAN EGY lelkes, tényszerű mondat, ami az eredményt és a hallgatói/szakmai értéket emeli ki; utána "További szakmai programjaink:" alatt az összes többi tétel ugyanígy "- " jellel és egy-egy mondattal. KIZÁRÓLAG a listából dolgozz, ne találj ki semmit, adminisztratív tételt ne szerepeltess. Zárás: rövid üdvözlés, semmi több.`,
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
            <label>Mi kerüljön a riportba? ({chosen.length}/{items.length} kijelölve) - az admin jellegű tételek alapból kimaradnak, pipával teszed be/ki őket</label>
            {items.length === 0
              ? <div className="se-empty">Nincs szakos esemény ebben a hónapban.</div>
              : (
                <div className="mr-list">
                  {items.map((i) => (
                    <label key={i.id} className={`mr-item${off.has(i.id) ? ' is-off' : ''}`}>
                      <input type="checkbox" checked={!off.has(i.id)} onChange={() => toggle(i.id)} />
                      <span>{i.label}{i.admin ? <em className="adm"> · admin jellegű</em> : null}</span>
                    </label>
                  ))}
                </div>
              )}
          </div>
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field full">
            <label>A levél - címzettek: {RECIPIENTS.map((r) => r.name).join(', ')}</label>
            <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder={'Pipáld ki a listát, majd „Titkárnő megfogalmazása" - vagy írd kézzel.'} style={{ font: 'inherit', width: '100%' }} />
          </div>
          {msg && <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--muted)' }}>{msg}</p>}
        </div>
        <div className="mfoot">
          <button className="btn btn--ink" disabled={busy || !chosen.length} onClick={generate}>{busy ? '⏳ Fogalmaz…' : '🗣 Titkárnő megfogalmazása'}</button>
          <button className="btn" disabled={!body.trim()} onClick={() => { void navigator.clipboard?.writeText(`${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 2500); }}>{copied ? '✓ Másolva' : '⧉ Másolás'}</button>
          <button className="btn" disabled={!body.trim()} onClick={toOutbox}>✉ Küldésre a Postába</button>
          <span className="sp" />
          <button className="btn" onClick={onClose}>✕ Bezárás</button>
        </div>
      </div>
    </div>
  );
}
