'use client';
// 📅 IDŐPONT KÜLDÉSE - a KÖZPONTI, egy mozdulatos időpont-egyeztető (2026-07-21).
// EGY űrlap: kinek + miről + mikor(ok) + hol (személyes/online/hibrid), és a Mehet gomb
// után MINDENT a rendszer intéz: Meet-link (ha online), tentative esemény a naptárba
// (több javaslatnál halvány "függő" csíkok), kapcsolt feladatkártya (ha nincs, létrejön),
// Titkárnő-levél a Posta Kimenő listájába. CSUPA meglévő alkatrészből: RecipientPicker,
// MeetSlots, lib/meet (createMeet/meetingText/slotLabel), /api/compose, saveEvent/saveLetter.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter, emptyEvent, emptyTask, fmtEventWhen } from '@/data/agenda';
import { normTitle } from '@/lib/normalize';
import { PeopleDB } from '@/data/people';
import { MeetSlot, MeetingMode } from '@/lib/letters';
import { createMeet, meetingText, slotLabel } from '@/lib/meet';
import { emailOf } from '@/data/people';
import { editHeaders } from '@/lib/editkey';
import RecipientPicker from './RecipientPicker';
import MeetSlots from './MeetSlots';
import { PLACE_ONLINE } from './PlaceQuickPick';

export interface IdopontSeed {
  taskId?: string | null;   // meglévő feladatról nyitva: ehhez kapcsolódik az esemény
  topic?: string;           // előtöltött téma (pl. a kártya címe)
  names?: string[];         // előtöltött címzett-nevek
  emails?: string[];        // előtöltött egyedi email-címzettek (pl. a kártya feladója)
}

interface Props {
  seed: IdopontSeed;
  db: PeopleDB;
  teacherNames: string[];
  tasks: Pick<AgendaTask, 'id' | 'title' | 'status'>[]; // meglévő kártyák a téma-egyeztetéshez (egy folyamat = egy kártya!)
  onLinkTaskEvent: (taskId: string, eventId: string | null) => void;
  onSaveEvent: (e: AgendaEvent) => void;
  onSaveTask: (t: AgendaTask) => void;
  onSaveLetter: (l: Letter) => void;
  onBusy?: (msg: string | null) => void;
  onDone: (postaJump: boolean) => void; // siker után: bezárás (+ opcionális ugrás a Postára)
  onClose: () => void;
}

export default function IdopontModal({ seed, db, teacherNames, tasks, onLinkTaskEvent, onSaveEvent, onSaveTask, onSaveLetter, onBusy, onDone, onClose }: Props) {
  const [topic, setTopic] = useState(seed.topic ?? '');
  // EGY FOLYAMAT = EGY KÁRTYA: a téma alapján élőben keressük a meglévő nyitott kártyát;
  // a legjobb találat automatikusan kapcsolódik (láthatóan), új kártya csak enélkül készül
  const [linkTask, setLinkTask] = useState<string | null>(seed.taskId ?? null);
  const touchedLink = useRef(false);
  const matches = useMemo(() => {
    if (seed.taskId || normTitle(topic).length < 4) return [];
    const words = normTitle(topic).split(/\s+/).filter((w) => w.length >= 3);
    if (!words.length) return [];
    return tasks.filter((t) => t.status !== 'done')
      .map((t) => ({ t, sc: words.filter((w) => normTitle(t.title).includes(w)).length }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 3);
  }, [topic, seed.taskId, tasks]);
  useEffect(() => {
    if (seed.taskId || touchedLink.current) return;
    setLinkTask(matches[0]?.t.id ?? null);
  }, [matches, seed.taskId]);
  const [selected, setSelected] = useState<string[]>(seed.names ?? []);
  const [adhoc, setAdhoc] = useState<string[]>(seed.emails ?? []);
  const [mode, setMode] = useState<MeetingMode>('online');
  const [slots, setSlots] = useState<MeetSlot[]>([{ day: '', start: '', end: '' }]);
  const [place, setPlace] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // nevek -> email (Névjegyzék) + egyedi címek; akinek nincs email-je, kimarad
  const recipients = [
    ...selected.map((n) => ({ name: n, email: emailOf(db, n) ?? '', kind: 'nev' })).filter((r) => !!r.email),
    ...adhoc.map((e) => ({ name: e, email: e, kind: 'egyedi' })),
  ];
  // akinek nincs email-címe a Névjegyzékben, az kimarad - ezt LÁTHATÓAN jelezzük
  const unresolved = selected.filter((n) => !emailOf(db, n));
  const filled = slots.filter((s) => s.day && s.start);
  const dayOnly = slots.filter((s) => s.day && !s.start).length;

  const go = async () => {
    if (busy) return;
    // SOHA nem némán: pontosan megmondjuk, mi hiányzik még
    if (!topic.trim()) { setMsg('⚠ Add meg, miről egyeztetnétek (első mező) - ez lesz a levél és az esemény témája.'); return; }
    if (!recipients.length) { setMsg(unresolved.length ? `⚠ A kiválasztottaknak nincs email-címük a Névjegyzékben (${unresolved.join(', ')}) - válassz mást, vagy adj meg egyedi email-címet.` : '⚠ Válassz legalább egy címzettet.'); return; }
    if (!filled.length) { setMsg(dayOnly ? '⚠ Az időponthoz a KEZDÉS ÓRA is kell (a nap mellett) - így tud naptár-bejegyzés és Meet készülni.' : '⚠ Adj meg legalább egy időpontot (nap + kezdés).'); return; }
    setBusy(true); onBusy?.('📅 Időpont-egyeztetés összeállítása…');
    try {
      const first = filled[0];
      const effPlace = mode === 'online' ? PLACE_ONLINE : (place.trim() || (mode === 'hibrid' ? `${place.trim() || '[helyszín]'} + online` : place.trim() || null));
      // 1) Meet-link (online/hibrid) - tentative Google-esemény is születik hozzá
      let link = ''; let gid = '';
      if (mode !== 'szemelyes') {
        setMsg('Meet-link készítése…');
        const r = await createMeet({ title: topic.trim(), slots, place: effPlace, attendees: recipients.map((x) => x.email), sendInvite: false, headers: editHeaders() });
        if (r.unconfigured) setMsg('⚠ A Google-naptár nincs beállítva (OAuth token) - a levél Meet-link NÉLKÜL megy, a linket utólag pótolhatod a kártyáról.');
        else if (r.error) setMsg(`⚠ Meet-link nem készült (${r.error}) - az egyeztetés enélkül megy tovább.`);
        link = r.link; gid = r.googleEventId;
      }
      // 2) tentative esemény a naptárba (több javaslatnál függő csíkok)
      const ev: AgendaEvent = {
        ...emptyEvent(), title: topic.trim(),
        when: `${fmtEventWhen(first.day, null, first.day.slice(0, 7), first.start ?? null)} (egyeztetés alatt)`,
        sort: first.day.slice(0, 7), day: first.day, place: typeof effPlace === 'string' ? effPlace : null,
        people: [...selected], mstatus: 'tentative',
        googleEventId: gid || null, meetLink: link || null,
        meetSlots: filled.length > 1 ? filled.map((s) => ({ day: s.day, start: s.start || null, end: s.end || null })) : null,
      };
      onSaveEvent(ev);
      // 3) feladatkártya: MEGLÉVŐHÖZ kapcsolás (kártyáról nyitva vagy téma-találatnál),
      // új kártya CSAK akkor, ha az ügynek tényleg nincs még kártyája
      const targetTask = seed.taskId ?? linkTask;
      if (targetTask) {
        onLinkTaskEvent(targetTask, ev.id);
      } else {
        onSaveTask({
          ...emptyTask(), title: topic.trim(), eventId: ev.id,
          dueDate: first.day, people: [...selected],
          summary: `Időpont-egyeztetés folyamatban (${recipients.map((r) => r.name).join(', ')}). A javasolt időpontok az eseményen; visszaigazolás után a kártyán véglegesíted.`,
        });
      }
      // 4) Titkárnő-levél -> Posta Kimenő (compose-hiba esetén determinisztikus tartalék)
      setMsg('🗣 Titkárnő fogalmazza a levelet…'); onBusy?.('🗣 Titkárnő fogalmazza az időpont-egyeztető levelet…');
      let subject = `Időpont-egyeztetés: ${topic.trim()}`;
      let body = '';
      try {
        const res = await fetch('/api/compose', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
          body: JSON.stringify({
            instruction: `Rövid, barátságos időpont-egyeztető levelet írj: ${topic.trim()}. A találkozó ${mode === 'szemelyes' ? 'személyes' : mode === 'hibrid' ? 'hibrid (személyes és online is)' : 'online (Google Meet)'}. Kérd, hogy jelezzék, melyik időpont felel meg.`,
            templates: [], recipients, sendMode: recipients.length === 1 ? 'personal' : 'bcc', cardContext: [],
            meeting: { slots: filled.map(slotLabel), place: typeof effPlace === 'string' ? effPlace : null, meetLink: link || null },
            askAllowed: false, question: null, questionAnswer: null,
          }),
        });
        const j = await res.json() as { ok: boolean; subject?: string; body?: string };
        if (j.ok && j.body) { body = j.body; if (j.subject) subject = j.subject; }
      } catch { /* tartalék lentebb */ }
      if (!body) {
        body = `Kedves {keresztnev}!\n\n${topic.trim()} ügyében szeretnék veled egyeztetni.\n\n${meetingText(mode, slots, link)}\n\nÜdvözlettel:\nBalogh Áron`;
      }
      onSaveLetter({
        id: `l-${Date.now().toString(36)}`, createdAt: new Date().toISOString(),
        targetType: 'event', targetId: ev.id,
        subject, body, names: [...selected, ...adhoc], recipients,
        status: 'outbox', dir: 'out', sendMode: recipients.length === 1 ? 'personal' : 'bcc',
        scheduledFor: null, meetLink: link || undefined,
      });
      onBusy?.(null);
      onDone(true);
    } catch (e) {
      setMsg(`⚠ Hiba: ${e instanceof Error ? e.message : String(e)}`);
      onBusy?.(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal modal--idopont">
        <h3>📅 Időpont küldése</h3>
        <form className="f" onSubmit={(e) => e.preventDefault()}>
          <div className="field full">
            <label>Miről egyeztetnétek? - ez lesz az esemény és a levél témája (diktálhatod is)</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="pl. BA3 féléves tematika átbeszélése" />
            {seed.taskId && (
              <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--ink-2)' }}>▤ Ehhez a kártyához kapcsolódik: <strong>{seed.topic}</strong></p>
            )}
            {!seed.taskId && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                {matches.length > 0 && (<>
                  <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--ink-2)' }}>Meglévő kártya ehhez az ügyhöz:</span>
                  {matches.map(({ t }) => (
                    <button key={t.id} type="button" className={`chip${linkTask === t.id ? ' is-on' : ''}`}
                      title={linkTask === t.id ? 'Ehhez a kártyához kapcsolódik - kattints a leválasztáshoz' : 'Ehhez a meglévő kártyához kapcsolom (nem készül új)'}
                      onClick={() => { touchedLink.current = true; setLinkTask((v) => (v === t.id ? null : t.id)); }}>▤ {t.title}</button>
                  ))}
                </>)}
                {/* teljes lista is: bármelyik nyitott kártya kiválasztható, nem csak a javaslatok */}
                <select value={linkTask ?? ''} style={{ maxWidth: '100%' }}
                  onChange={(e) => { touchedLink.current = true; setLinkTask(e.target.value || null); }}>
                  <option value="">- vagy válassz kártyát a teljes listából (üresen: új kártya készül) -</option>
                  {tasks.filter((t) => t.status !== 'done').map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <span style={{ fontSize: '.78rem', color: linkTask ? 'var(--ink-2)' : 'var(--muted)', fontWeight: linkTask ? 700 : 400 }}>{linkTask ? '▤ ehhez kapcsolom, NEM készül új kártya' : 'nincs kijelölve: ÚJ kártya készül'}</span>
              </div>
            )}
          </div>
          <div className="field full">
            <label>Kinek?</label>
            <RecipientPicker teacherNames={teacherNames} db={db} selected={selected} adhoc={adhoc}
              onChange={(s, a) => { setSelected(s); setAdhoc(a); }} />
            {unresolved.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--hot)' }}>Nincs email a Névjegyzékben (kimarad a küldésből): {unresolved.join(', ')}</p>
            )}
          </div>
          <div className="field full">
            <label>Hogyan?</label>
            <div className="chipradio">
              {([['online', '📹 Online (Meet)'], ['szemelyes', '🤝 Személyes'], ['hibrid', '🔀 Hibrid']] as const).map(([id, l]) => (
                <button type="button" key={id} className={`crx${mode === id ? ' is-on' : ''}`} onClick={() => setMode(id)}>{l}</button>
              ))}
            </div>
            {mode !== 'online' && (
              <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Helyszín (pl. METU, Infopark D épület, 212)" style={{ marginTop: 6 }} />
            )}
          </div>
          <div className="field full">
            <label>Mikor? - több javaslatot is adhatsz, a naptárban halvány csíkként jelennek meg a visszaigazolásig</label>
            <MeetSlots slots={slots} onSlots={setSlots} />
          </div>
          {msg && <div className="field full"><p style={{ margin: 0, fontSize: '.88rem', color: msg.startsWith('⚠') ? 'var(--hot)' : 'var(--muted)' }}>{msg}</p></div>}
          <div className="field full">
            <button type="button" className="btn btn--ink ip-go" disabled={busy} onClick={() => { void go(); }}>{busy ? '⏳ Készül…' : '📅 Mehet - levél + naptár + kártya'}</button>
          </div>
        </form>
        <div className="mfoot">
          <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>A Mehet után: levél a Posta Kimenőbe + naptár-esemény + feladatkártya{mode !== 'szemelyes' ? ' + Meet-link' : ''} - a küldés a Postából a te kezedben marad.</span>
          <span className="sp" />
          <button className="btn" disabled={busy} onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" disabled={busy} onClick={() => { void go(); }}>{busy ? '⏳ Készül…' : '📅 Mehet'}</button>
        </div>
      </div>
    </div>
  );
}
