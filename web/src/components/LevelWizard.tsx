'use client';

import { useMemo, useRef, useState } from 'react';
import { Agenda, AgendaEvent, Letter, LetterRecipient, emptyEvent, fmtEventWhen } from '@/data/agenda';
import { PeopleDB } from '@/data/people';
import { resolveRecipients, letterPresets, suggestSendMode } from '@/lib/recipients';
import { matchTemplates, TemplateMatch } from '@/lib/topics';
import { editHeaders } from '@/lib/editkey';

// LEVELEK TITKÁRNŐ (kimenő): diktált szándékból sablon-alapú, Áron-hangú VÉGLEGES levél,
// feladat/esemény-szinkronban, opcionális Google Meet-tel. A kész levél a Posta küldés-
// előtti (kimenő) listájába kerül. A szöveget a /api/compose (helyi claude) írja, az
// adatot (esemény, Meet) az app hozza létre. A rephrase-wizard testvére, de itt Áron
// KEZDEMÉNYEZ (nincs bejövő levél).

interface Props {
  open: boolean;
  onClose: () => void;
  db: PeopleDB;
  teacherNames: string[];
  agenda: Agenda;
  onSaveLetter: (l: Letter) => void;      // upsert a letters[]-be (outbox)
  onSaveEvent: (e: AgendaEvent) => void;  // upsert az events[]-be (tentative)
}

type Step = 'intent' | 'assemble' | 'final';
interface Slot { day: string; start: string; end: string }

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// releváns feladatok/események rövidlistája a compose kontextushoz (kulcsszó + résztvevő)
function relevantContext(agenda: Agenda, intent: string, recipients: LetterRecipient[]): { title: string; lines: string[] }[] {
  const words = [...new Set(norm(intent).split(/[^a-z0-9]+/).filter((w) => w.length >= 4))];
  const names = new Set(recipients.map((r) => r.name));
  const score = (hay: string, people: string[]): number => {
    const h = norm(hay);
    let s = words.filter((w) => h.includes(w)).length;
    if (people.some((p) => names.has(p))) s += 2;
    return s;
  };
  const cs: { title: string; lines: string[]; s: number }[] = [];
  agenda.tasks.forEach((t) => {
    const s = score(`${t.title} ${t.summary}`, [t.owner ?? '', ...t.people]);
    if (s > 0) cs.push({ title: `Feladat: ${t.title}`, lines: [t.summary, t.dueDate ? `Határidő: ${t.dueDate}` : ''].filter(Boolean), s });
  });
  agenda.events.forEach((e) => {
    const s = score(`${e.title} ${e.note ?? ''}`, [e.owner ?? '', ...e.people]);
    if (s > 0) cs.push({ title: `Esemény: ${e.title}`, lines: [e.when ? `Időpont: ${e.when}` : '', e.place ? `Helyszín: ${e.place}` : ''].filter(Boolean), s });
  });
  return cs.sort((a, b) => b.s - a.s).slice(0, 3).map(({ title, lines }) => ({ title, lines }));
}

const slotLabel = (s: Slot): string => {
  if (!s.day) return '';
  const d = `${s.day.slice(0, 4)}. ${Number(s.day.slice(5, 7))}. ${Number(s.day.slice(8, 10))}.`;
  return `${d}${s.start ? ` ${s.start}` : ''}${s.end ? `-${s.end}` : ''}`;
};

export default function LevelWizard({ open, onClose, db, teacherNames, agenda, onSaveLetter, onSaveEvent }: Props) {
  const [mode, setMode] = useState<'voice' | 'write' | null>(null);
  const [step, setStep] = useState<Step>('intent');
  const [intent, setIntent] = useState('');
  // címzettek
  const [namesInput, setNamesInput] = useState('');
  const [recipients, setRecipients] = useState<LetterRecipient[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<'personal' | 'bcc'>('personal');
  // sablonok
  const [chosenTemplateId, setChosenTemplateId] = useState<string | null>(null);
  // időpont-szervezés
  const [meetingOn, setMeetingOn] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [slots, setSlots] = useState<Slot[]>([{ day: '', start: '', end: '' }]);
  const [place, setPlace] = useState('');
  const [sendGoogleInvite, setSendGoogleInvite] = useState(false);
  const [meetLink, setMeetLink] = useState('');
  const [googleEventId, setGoogleEventId] = useState('');
  const [eventId, setEventId] = useState('');
  const [meetBusy, setMeetBusy] = useState(false);
  const [meetMsg, setMeetMsg] = useState<string | null>(null);
  // végleges levél
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [qa, setQa] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const speakSeq = useRef(0);

  const candidates = useMemo<TemplateMatch[]>(() => (intent.trim() ? matchTemplates(intent, 3) : []), [intent]);
  const presets = useMemo(() => letterPresets(db, teacherNames), [db, teacherNames]);

  if (!open) return null;

  const speak = (txt: string) => {
    if (mode !== 'voice' || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const seq = ++speakSeq.current;
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'hu-HU'; u.rate = 1.5;
    const hu = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hu'));
    if (hu) u.voice = hu;
    u.onend = () => { if (seq !== speakSeq.current) return; };
    synth.cancel(); synth.speak(u);
  };

  const reset = () => {
    setMode(null); setStep('intent'); setIntent('');
    setNamesInput(''); setRecipients([]); setUnresolved([]); setSendMode('personal');
    setChosenTemplateId(null);
    setMeetingOn(false); setEvTitle(''); setSlots([{ day: '', start: '', end: '' }]); setPlace('');
    setSendGoogleInvite(false); setMeetLink(''); setGoogleEventId(''); setEventId(''); setMeetMsg(null);
    setSubject(''); setBody(''); setPendingQ(null); setQa(''); setErr(null);
  };
  const close = () => { reset(); onClose(); };

  const pickMode = (m: 'voice' | 'write') => {
    setMode(m);
    try { localStorage.setItem('md-titkar-mode', m); } catch { /* ignore */ }
    if (m === 'voice') speak('Mondd el, mit szeretnél, kinek és miről írjak levelet.');
  };

  // címzett-feloldás a diktált nevekből
  const addNames = () => {
    const names = namesInput.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    const { resolved, unresolved: miss } = resolveRecipients(db, teacherNames, names);
    mergeRecipients(resolved);
    setUnresolved((u) => [...new Set([...u, ...miss])]);
    setNamesInput('');
  };
  const addPreset = (names: string[]) => mergeRecipients(resolveRecipients(db, teacherNames, names).resolved);
  const mergeRecipients = (add: LetterRecipient[]) => {
    setRecipients((cur) => {
      const seen = new Set(cur.map((r) => r.email.toLowerCase()));
      const next = [...cur];
      add.forEach((r) => { if (!seen.has(r.email.toLowerCase())) { seen.add(r.email.toLowerCase()); next.push(r); } });
      setSendMode(suggestSendMode(next));
      return next;
    });
  };
  const removeRecipient = (email: string) => setRecipients((cur) => {
    const next = cur.filter((r) => r.email !== email);
    setSendMode(suggestSendMode(next));
    return next;
  });

  const setSlot = (i: number, patch: Partial<Slot>) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addSlot = () => setSlots((s) => (s.length >= 3 ? s : [...s, { day: '', start: '', end: '' }]));
  const removeSlot = (i: number) => setSlots((s) => (s.length <= 1 ? s : s.filter((_, j) => j !== i)));

  // ELŐZETES esemény + Meet: /api/meet create (tentative), majd az esemény az agendába
  const createTentative = async () => {
    const filled = slots.filter((s) => s.day && s.start);
    if (!filled.length) { setMeetMsg('Adj meg legalább egy időpontot (nap + kezdés).'); return; }
    const first = filled[0];
    const title = evTitle.trim() || intent.trim().split('\n')[0].slice(0, 60) || 'METU egyeztetés';
    setMeetBusy(true); setMeetMsg(null);
    const eid = eventId || `e-${Date.now().toString(36)}`;
    let link = ''; let gid = '';
    try {
      const startIso = `${first.day}T${first.start}:00`;
      const endIso = `${first.day}T${(first.end || first.start)}:00`;
      const res = await fetch('/api/meet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          action: 'create', summary: title, startIso, endIso,
          location: place || undefined, attendees: recipients.map((r) => r.email),
          sendInvite: sendGoogleInvite, tentative: true,
          description: `METU Media Design egyeztetés. Javasolt időpontok:\n${filled.map(slotLabel).join('\n')}`,
        }),
      });
      const j = await res.json() as { ok: boolean; unconfigured?: boolean; meetLink?: string; googleEventId?: string; error?: string };
      if (j.unconfigured) setMeetMsg('A Google Meet még nincs beállítva - az esemény link nélkül jön létre, a link a beállítás után pótolható.');
      else if (!j.ok) setMeetMsg(`Meet hiba: ${j.error ?? 'ismeretlen'} - az esemény link nélkül jön létre.`);
      else { link = j.meetLink ?? ''; gid = j.googleEventId ?? ''; setMeetMsg(link ? 'Meet-link létrejött.' : 'Az esemény létrejött (link nélkül).'); }
    } catch {
      setMeetMsg('A Meet-szolgáltatás nem elérhető - az esemény link nélkül jön létre.');
    }
    // az app naptárába a tentative esemény (a link akkor is bekerül, ha van)
    const ev: AgendaEvent = {
      ...emptyEvent(), id: eid, title,
      when: `${fmtEventWhen(first.day, null, first.day.slice(0, 7), first.start)} (egyeztetés alatt)`,
      sort: first.day.slice(0, 7), day: first.day, place: place || null,
      people: recipients.map((r) => r.name),
      googleEventId: gid || null, meetLink: link || null, mstatus: 'tentative',
    };
    onSaveEvent(ev);
    setEventId(eid); setMeetLink(link); setGoogleEventId(gid);
    setMeetBusy(false);
  };

  // VÉGLEGES levél: /api/compose (kétfázisú tisztázó kérdéssel)
  const compose = async (answer?: string | null) => {
    if (!intent.trim() || busy) return;
    if (!recipients.length) { setErr('Adj meg legalább egy címzettet.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          instruction: intent,
          templates: candidates,
          recipients, sendMode,
          cardContext: relevantContext(agenda, intent, recipients),
          meeting: meetingOn ? { slots: slots.filter((s) => s.day).map(slotLabel), place: place || null, meetLink: meetLink || null } : null,
          askAllowed: answer === undefined && !pendingQ,
          question: answer !== undefined ? pendingQ : null,
          questionAnswer: answer === undefined ? null : answer,
        }),
      });
      const j = await res.json() as { ok: boolean; subject?: string; body?: string; question?: string; chosenTemplateId?: string | null; error?: string };
      if (!j.ok) throw new Error(j.error || `hiba (${res.status})`);
      if (j.question) { setPendingQ(j.question); setQa(''); speak(`Kérdésem van: ${j.question}`); return; }
      if (!j.body) throw new Error('üres levél érkezett');
      setSubject(j.subject ?? 'Levél'); setBody(j.body);
      if (j.chosenTemplateId) setChosenTemplateId(j.chosenTemplateId);
      setPendingQ(null); setQa(''); setStep('final');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  // KÉSZ -> Posta: kimenő levél az agendába (outbox)
  const finish = () => {
    if (!body.trim() || !recipients.length) return;
    const letter: Letter = {
      id: `l-${Date.now().toString(36)}`, createdAt: new Date().toISOString(),
      targetType: meetingOn && eventId ? 'event' : null,
      targetId: meetingOn && eventId ? eventId : null,
      subject: subject || 'Levél', body,
      names: recipients.map((r) => r.name),
      status: 'outbox', dir: 'out', recipients, sendMode,
      sendGoogleInvite, scheduledFor: null,
      templateId: chosenTemplateId ?? undefined,
      meetLink: meetLink || undefined,
    };
    onSaveLetter(letter);
    close();
  };

  const st = { card: 'var(--card)', line: 'var(--line)', muted: 'var(--muted)', ink: 'var(--ink)', hot: 'var(--hot)', brand: 'var(--brand)' };

  return (
    <div className="ovl" onMouseDown={close}>
      <div className="modal modal--wide" onMouseDown={(e) => e.stopPropagation()}>
        <h3>🗣 Titkárnő - új levél
          <button type="button" className="btn" style={{ position: 'absolute', right: 16, top: 12 }} onClick={close}>✕</button>
        </h3>
        <div className="f" style={{ padding: '16px 22px', display: 'block' }}>
          {/* MÓD-VÁLASZTÓ */}
          {!mode ? (
            <div style={{ display: 'grid', gap: 14, placeItems: 'center', padding: '30px 0' }}>
              <p style={{ color: st.muted, margin: 0 }}>Hogyan mondod el, mit szeretnél?</p>
              <div style={{ display: 'flex', gap: 14 }}>
                <button type="button" className="btn btn--ink" style={{ fontSize: '1.05rem', padding: '16px 26px' }} onClick={() => pickMode('voice')}>🔊 Hang mód</button>
                <button type="button" className="btn btn--ink" style={{ fontSize: '1.05rem', padding: '16px 26px' }} onClick={() => pickMode('write')}>✍ Írás mód</button>
              </div>
            </div>
          ) : (
            <>
              {/* lépés-jelző */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: '.8rem', color: st.muted }}>
                <span style={{ fontWeight: step === 'intent' ? 700 : 400, color: step === 'intent' ? st.hot : st.muted }}>1. Szándék</span>
                <span>›</span>
                <span style={{ fontWeight: step === 'assemble' ? 700 : 400, color: step === 'assemble' ? st.hot : st.muted }}>2. Címzettek + sablon</span>
                <span>›</span>
                <span style={{ fontWeight: step === 'final' ? 700 : 400, color: step === 'final' ? st.hot : st.muted }}>3. Végleges levél</span>
              </div>

              {/* 1. SZÁNDÉK */}
              {step === 'intent' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ fontWeight: 600 }}>Mit szeretnél? (kulcsszavakban, kinek és miről)</label>
                  <textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={5} autoFocus
                    placeholder="pl. időpontot kérek az oktatóktól a félévindító értekezletre, 3 javaslat, Infopark"
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${st.line}`, background: 'var(--paper, #fff)', color: st.ink, font: 'inherit' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn--ink" disabled={!intent.trim()} onClick={() => setStep('assemble')}>Tovább ›</button>
                  </div>
                </div>
              )}

              {/* 2. ÖSSZEÁLLÍTÁS */}
              {step === 'assemble' && (
                <div style={{ display: 'grid', gap: 18 }}>
                  {/* címzettek */}
                  <section style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontWeight: 600 }}>Címzettek</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={namesInput} onChange={(e) => setNamesInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNames(); } }}
                        placeholder="nevek vesszővel (pl. Kovács Ajda, Berkes Bálint)"
                        style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${st.line}`, font: 'inherit', color: st.ink, background: 'var(--paper, #fff)' }} />
                      <button type="button" className="btn" onClick={addNames}>+ Hozzáad</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {presets.map((p) => (
                        <button type="button" key={p.id} className="crx" title={`${p.count} fő`} onClick={() => addPreset(p.names)}>{p.label} ({p.count})</button>
                      ))}
                    </div>
                    {recipients.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {recipients.map((r) => (
                          <span key={r.email} className="crx is-on" style={{ cursor: 'default' }}>
                            {r.name} <button type="button" onClick={() => removeRecipient(r.email)} style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer', marginLeft: 4 }} title="Törlés">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                    {unresolved.length > 0 && (
                      <p style={{ color: st.hot, fontSize: '.82rem', margin: 0 }}>Nincs a névjegyzékben (kihagyva): {unresolved.join(', ')}</p>
                    )}
                    {recipients.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '.85rem' }}>
                        <span style={{ color: st.muted }}>Küldés:</span>
                        <button type="button" className={`crx${sendMode === 'personal' ? ' is-on' : ''}`} onClick={() => setSendMode('personal')}>Személyre szabott</button>
                        <button type="button" className={`crx${sendMode === 'bcc' ? ' is-on' : ''}`} onClick={() => setSendMode('bcc')}>Közös (BCC)</button>
                        {sendMode === 'personal' && recipients.length > 6 && <span style={{ color: st.hot }}>Sok címzett - a BCC gyorsabb lehet.</span>}
                      </div>
                    )}
                  </section>

                  {/* sablon-jelöltek */}
                  <section style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontWeight: 600 }}>Illeszkedő sablon (a titkárnő ebből épít)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {candidates.length === 0 && <span style={{ color: st.muted, fontSize: '.85rem' }}>Írj be szándékot az 1. lépésben a javaslatokhoz.</span>}
                      {candidates.map((t) => (
                        <button type="button" key={t.id} className={`crx${(chosenTemplateId ?? candidates[0]?.id) === t.id ? ' is-on' : ''}`}
                          title={t.sampleSubject} onClick={() => setChosenTemplateId(t.id)}>{t.label}</button>
                      ))}
                    </div>
                  </section>

                  {/* időpont-szervezés */}
                  <section style={{ display: 'grid', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <input type="checkbox" checked={meetingOn} onChange={(e) => setMeetingOn(e.target.checked)} /> Időpontot szervezek (Google Meet)
                    </label>
                    {meetingOn && (
                      <div style={{ display: 'grid', gap: 8, padding: 10, border: `1px solid ${st.line}`, borderRadius: 10 }}>
                        <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Az esemény rövid címe (pl. Félévindító értekezlet)"
                          style={{ padding: 8, borderRadius: 8, border: `1px solid ${st.line}`, font: 'inherit', color: st.ink, background: 'var(--paper, #fff)' }} />
                        {slots.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ color: st.muted, fontSize: '.8rem', width: 60 }}>{i + 1}. javaslat</span>
                            <input type="date" value={s.day} onChange={(e) => setSlot(i, { day: e.target.value })} style={{ font: 'inherit' }} />
                            <input type="time" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value })} style={{ font: 'inherit' }} />
                            <span>-</span>
                            <input type="time" value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} style={{ font: 'inherit' }} />
                            {slots.length > 1 && <button type="button" className="btn" onClick={() => removeSlot(i)}>✕</button>}
                          </div>
                        ))}
                        {slots.length < 3 && <button type="button" className="btn" style={{ justifySelf: 'start' }} onClick={addSlot}>+ Időpont-javaslat</button>}
                        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Helyszín (pl. Infopark D, vagy online)"
                          style={{ padding: 8, borderRadius: 8, border: `1px solid ${st.line}`, font: 'inherit', color: st.ink, background: 'var(--paper, #fff)' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', color: st.muted }}>
                          <input type="checkbox" checked={sendGoogleInvite} onChange={(e) => setSendGoogleInvite(e.target.checked)} /> A Google is küldjön naptár-meghívót (.ics)
                        </label>
                        <button type="button" className="btn btn--ink" disabled={meetBusy || !recipients.length} onClick={createTentative}>
                          {meetBusy ? 'Létrehozás…' : '📅 Előzetes esemény + Meet-link'}
                        </button>
                        {meetLink && <p style={{ margin: 0, fontSize: '.85rem' }}>Meet: <a href={meetLink} target="_blank" rel="noopener noreferrer">{meetLink}</a></p>}
                        {meetMsg && <p style={{ margin: 0, fontSize: '.82rem', color: st.muted }}>{meetMsg}</p>}
                      </div>
                    )}
                  </section>

                  {err && <p style={{ color: st.hot, margin: 0 }}>{err}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" className="btn" onClick={() => setStep('intent')}>‹ Vissza</button>
                    <button type="button" className="btn btn--ink" disabled={busy || !recipients.length} onClick={() => compose()}>
                      {busy ? 'Fogalmazás…' : '✍ Megfogalmazom ›'}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. VÉGLEGES LEVÉL */}
              {step === 'final' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  {pendingQ ? (
                    <div style={{ display: 'grid', gap: 8, padding: 12, border: `1px solid ${st.hot}`, borderRadius: 10 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>A titkárnő kérdez: {pendingQ}</p>
                      <input value={qa} onChange={(e) => setQa(e.target.value)} autoFocus placeholder="Rövid válasz (üresen: nem tudom)"
                        style={{ padding: 10, borderRadius: 8, border: `1px solid ${st.line}`, font: 'inherit', color: st.ink, background: 'var(--paper, #fff)' }} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn" disabled={busy} onClick={() => compose(null)}>Nem tudom</button>
                        <button type="button" className="btn btn--ink" disabled={busy} onClick={() => compose(qa)}>Válaszolok ›</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label style={{ fontWeight: 600 }}>Tárgy</label>
                      <input value={subject} onChange={(e) => setSubject(e.target.value)}
                        style={{ padding: 10, borderRadius: 8, border: `1px solid ${st.line}`, font: 'inherit', color: st.ink, background: 'var(--paper, #fff)' }} />
                      <label style={{ fontWeight: 600 }}>A levél (szerkeszthető)</label>
                      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12}
                        style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${st.line}`, font: 'inherit', color: st.ink, background: 'var(--paper, #fff)' }} />
                      <div style={{ fontSize: '.82rem', color: st.muted }}>
                        {recipients.length} címzett · {sendMode === 'personal' ? 'személyre szabott' : 'közös BCC'}
                        {meetingOn && eventId ? ` · esemény létrehozva${meetLink ? ' + Meet-link' : ''}` : ' · körlevél (nincs kártya)'}
                      </div>
                      {err && <p style={{ color: st.hot, margin: 0 }}>{err}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" className="btn" onClick={() => setStep('assemble')}>‹ Vissza</button>
                        <button type="button" className="btn btn--ink" disabled={!body.trim()} onClick={finish}>✅ Kész, a Postába</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
