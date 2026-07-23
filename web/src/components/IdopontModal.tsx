'use client';
// 📅 IDŐPONT KÜLDÉSE - a KÖZPONTI, egy mozdulatos időpont-egyeztető (2026-07-21).
// EGY űrlap: kinek + miről + mikor + hol (személyes/online/hibrid), KÉT móddal (2026-07-22):
// 📌 FIX IDŐPONT (foglalás): egy időpont, confirmed esemény, Google-naptármeghívó (.ics) a
//    résztvevőknek + meghívó-hangú levél ("bejegyeztem, itt a link, csatlakozzatok").
// 🕐 TÖBB JAVASLAT (egyeztetés): tentative esemény, halvány naptár-csíkok, egyeztető levél
//    ("melyik időpont felel meg?") - Google-meghívó NEM megy, csak a véglegesítés után.
// CSUPA meglévő alkatrészből: RecipientPicker, MeetSlots, lib/meet, lib/meetingLetter.
import { useEffect, useMemo, useRef, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter, emptyEvent, emptyTask, fmtEventWhen } from '@/data/agenda';
import { normTitle } from '@/lib/normalize';
import { PeopleDB, buildRoster, emailOf } from '@/data/people';
import { MeetSlot, MeetingMode } from '@/lib/letters';
import { createMeet, slotLabel } from '@/lib/meet';
import { composeMeetingLetter } from '@/lib/meetingLetter';
import { editHeaders } from '@/lib/editkey';
import RecipientPicker from './RecipientPicker';
import MeetSlots from './MeetSlots';
import { PLACE_ONLINE } from './PlaceQuickPick';

export interface IdopontSeed {
  taskId?: string | null;   // meglévő feladatról nyitva: ehhez kapcsolódik az esemény
  linkedTitle?: string;     // a kapcsolt kártya címe - CSAK kijelzésre (a téma NEM töltődik elő!)
  topic?: string;           // előtöltött téma - kártyáról nyitva SZÁNDÉKOSAN üres (2026-07-22:
                            // a kártya belső jegyzetei/címe ne folyjanak bele a meghívóba)
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
  // 📌 fix (foglalás) vagy 🕐 javaslat-kör - mindkettő egyenrangú, beszélgetés-függő.
  // Fix módban TÖBB alkalom is adható: mindegyik külön bejegyzett esemény + Google-meghívó,
  // de EGY közös levél megy róluk ("gyere, amelyik belefér") - 2026-07-22 user-példa (értekezlet).
  const [fixed, setFixed] = useState(true);
  const [desc, setDesc] = useState(''); // 1 mondatos leírás: levélbe + esemény-jegyzetbe (Google-ba SOHA)
  const [extra, setExtra] = useState(''); // szabad kérés a levélbe (pl. "ha egyik sem jó, kérj alternatív időpontot")
  const [slots, setSlots] = useState<MeetSlot[]>([{ day: '', start: '', end: '' }]);
  const [place, setPlace] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // név -> Névjegyzék-kategória (T/H/I/...) - a Titkárnő megszólítása ebből tudja a szerepeket
  const rosterKind = useMemo(() => {
    const m = new Map<string, string>();
    buildRoster(teacherNames, db).forEach((r) => { if (!m.has(r.name)) m.set(r.name, r.kind); });
    return m;
  }, [teacherNames, db]);
  // nevek -> email (Névjegyzék) + egyedi címek; akinek nincs email-je, kimarad
  const recipients = [
    ...selected.map((n) => ({ name: n, email: emailOf(db, n) ?? '', kind: rosterKind.get(n) ?? 'nev' })).filter((r) => !!r.email),
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
    setBusy(true); onBusy?.(fixed ? '📌 Foglalás összeállítása…' : '📅 Időpont-egyeztetés összeállítása…');
    try {
      const first = filled[0];
      const effPlace = mode === 'online' ? PLACE_ONLINE : (place.trim() || (mode === 'hibrid' ? `${place.trim() || '[helyszín]'} + online` : place.trim() || null));
      // 1) Google-bejegyzés. FIX mód: alkalmanként KÜLÖN confirmed esemény + .ics naptármeghívó
      // a résztvevőknek (user-döntés 2026-07-22: fixnél a Google mindig küld meghívót),
      // személyesnél Meet-link nélkül. JAVASLAT mód: EGY tentative esemény, meghívó NÉLKÜL -
      // azt majd a véglegesítés küldi.
      let link = ''; let gid = '';
      const made: { slot: MeetSlot; gid: string; link: string }[] = [];
      if (fixed) {
        let unconfigured = false;
        for (let i = 0; i < filled.length; i++) {
          const s = filled[i];
          if (unconfigured) { made.push({ slot: s, gid: '', link: '' }); continue; }
          setMsg(filled.length > 1 ? `Naptár-bejegyzés és Google-meghívó készítése (${i + 1}/${filled.length})…` : 'Naptár-bejegyzés és Google-meghívó készítése…');
          const r = await createMeet({
            title: topic.trim(), slots: [s], place: effPlace,
            attendees: recipients.map((x) => x.email), sendInvite: true, fixed: true,
            noMeet: mode === 'szemelyes', headers: editHeaders(),
          });
          if (r.unconfigured) { unconfigured = true; setMsg('⚠ A Google-naptár nincs beállítva (OAuth token) - a Google-meghívó NEM megy ki, a meghívást egyedül a levél viszi.'); }
          else if (r.error) setMsg(`⚠ ${slotLabel(s)}: Google-bejegyzés nem készült (${r.error}) - a meghívást a levél viszi.`);
          made.push({ slot: s, gid: r.googleEventId, link: r.link });
        }
        link = made[0]?.link ?? ''; gid = made[0]?.gid ?? '';
      } else if (mode !== 'szemelyes') {
        setMsg('Meet-link készítése…');
        const r = await createMeet({
          title: topic.trim(), slots, place: effPlace,
          attendees: recipients.map((x) => x.email), sendInvite: false, fixed: false,
          headers: editHeaders(),
        });
        if (r.unconfigured) setMsg('⚠ A Google-naptár nincs beállítva (OAuth token) - a levél Meet-link NÉLKÜL megy, a linket utólag pótolhatod a kártyáról.');
        else if (r.error) setMsg(`⚠ Meet-link nem készült (${r.error}) - az egyeztetés enélkül megy tovább.`);
        link = r.link; gid = r.googleEventId;
      }
      // 2) esemény(ek) a naptárba: fix -> alkalmanként külön confirmed esemény;
      // javaslat -> EGY tentative esemény (függő csíkok)
      const mkEvent = (s: MeetSlot, g: string, l: string): AgendaEvent => ({
        ...emptyEvent(), id: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: topic.trim(),
        when: fixed
          ? fmtEventWhen(s.day, null, s.day.slice(0, 7), s.start ?? null)
          : `${fmtEventWhen(s.day, null, s.day.slice(0, 7), s.start ?? null)} (egyeztetés alatt)`,
        sort: s.day.slice(0, 7), day: s.day, place: typeof effPlace === 'string' ? effPlace : null,
        people: [...selected], mstatus: fixed ? 'confirmed' : 'tentative',
        note: desc.trim() || null,
        googleEventId: g || null, meetLink: l || null,
        meetSlots: !fixed && filled.length > 1 ? filled.map((x) => ({ day: x.day, start: x.start || null, end: x.end || null })) : null,
      });
      const events = fixed ? made.map((m) => mkEvent(m.slot, m.gid, m.link)) : [mkEvent(first, gid, link)];
      events.forEach(onSaveEvent);
      const ev = events[0]; // az elsődleges esemény: ehhez kapcsolódik a kártya és a levél
      // 3) feladatkártya: MEGLÉVŐHÖZ kapcsolás (kártyáról nyitva vagy téma-találatnál),
      // új kártya CSAK akkor, ha az ügynek tényleg nincs még kártyája
      const targetTask = seed.taskId ?? linkTask;
      if (targetTask) {
        onLinkTaskEvent(targetTask, ev.id);
      } else {
        onSaveTask({
          ...emptyTask(), title: topic.trim(), eventId: ev.id,
          dueDate: first.day, people: [...selected],
          summary: fixed
            ? `Bejegyzett időpont${made.length > 1 ? 'ok' : ''}: ${made.map((m) => slotLabel(m.slot)).join(' ; ')} (${recipients.map((r) => r.name).join(', ')}). A meghívó-levél a Posta Kimenőben; a meeting után ide jön a kimenet.`
            : `Időpont-egyeztetés folyamatban (${recipients.map((r) => r.name).join(', ')}). A javasolt időpontok az eseményen; visszaigazolás után a kártyán véglegesíted.`,
        });
      }
      // 4) Titkárnő-levél -> Posta Kimenő (a közös meetingLetter-út, determinisztikus tartalékkal)
      setMsg('🗣 Titkárnő fogalmazza a levelet…');
      onBusy?.(fixed ? '🗣 Titkárnő fogalmazza a meghívó-levelet…' : '🗣 Titkárnő fogalmazza az időpont-egyeztető levelet…');
      const letter = await composeMeetingLetter({
        kind: 'invite', topic: topic.trim(), description: desc.trim() || null,
        mode, slots: fixed ? made.map((m) => m.slot) : filled, fixed,
        place: typeof effPlace === 'string' ? effPlace : null, meetLink: link || null,
        slotLinks: fixed ? made.map((m) => m.link || null) : undefined,
        extraAsk: extra.trim() || null,
        recipients, targetId: ev.id, names: [...selected, ...adhoc],
      });
      onSaveLetter(letter);
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
              <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--ink-2)' }}>▤ Ehhez a kártyához kapcsolódik: <strong>{seed.linkedTitle ?? '(kártya)'}</strong> · a címzettek átjöttek, a témát és a tartalmat te adod (diktálhatod) - a kártya jegyzetei NEM kerülnek a meghívóba.</p>
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
            <label>Rövid leírás (1 mondat) - a levélbe és az esemény jegyzetébe kerül, a Google-naptárba nem</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="pl. átbeszéljük a jövő félév tantárgyi tematikáját" />
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
            <label>Mikor?</label>
            <div className="chipradio" style={{ marginBottom: 6 }}>
              <button type="button" className={`crx${fixed ? ' is-on' : ''}`}
                title="Már megbeszélt, végleges időpont(ok): bejegyzem a naptárba, a Google meghívót küld, a levél meghívó-hangú"
                onClick={() => setFixed(true)}>📌 Fix időpont (foglalás)</button>
              <button type="button" className={`crx${!fixed ? ' is-on' : ''}`}
                title="Még egyeztetünk: több javaslat, halvány naptár-csíkok, a levél megkérdezi, melyik felel meg"
                onClick={() => setFixed(false)}>🕐 Több javaslat (egyeztetés)</button>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '.8rem', color: 'var(--muted)' }}>
              {fixed
                ? 'Minden megadott időpont VÉGLEGES: alkalmanként külön bejegyzett esemény + Google-naptármeghívó, és EGY közös meghívó-levél (több alkalomnál: "gyere, amelyik belefér").'
                : 'Több javaslatot is adhatsz, a naptárban halvány csíkként jelennek meg a visszaigazolásig - végül EGY időpont lesz belőlük.'}
            </p>
            <MeetSlots slots={slots} onSlots={setSlots} />
          </div>
          <div className="field full">
            <label>Megjegyzés a levélbe (opcionális) - a Titkárnő természetesen belefogalmazza</label>
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={'pl. "ha egyik időpont sem jó, kérj alternatív időpontot személyes beszélgetésre"'} />
          </div>
          {fixed && recipients.length > 0 && (
            <div className="field full">
              <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--ink-2)' }}>📨 A Mehet pillanatában a Google naptármeghívót (.ics) küld {filled.length > 1 ? `mind a ${filled.length} alkalomra ` : ''}nekik ({recipients.length}): {recipients.map((r) => r.email).join(', ')}</p>
            </div>
          )}
          {msg && <div className="field full"><p style={{ margin: 0, fontSize: '.88rem', color: msg.startsWith('⚠') ? 'var(--hot)' : 'var(--muted)' }}>{msg}</p></div>}
          <div className="field full">
            <button type="button" className="btn btn--ink ip-go" disabled={busy} onClick={() => { void go(); }}>{busy ? '⏳ Készül…' : '📅 Mehet - levél + naptár + kártya'}</button>
          </div>
        </form>
        <div className="mfoot">
          <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{fixed
            ? `A Mehet után: bejegyzett esemény + Google-meghívó a résztvevőknek${mode !== 'szemelyes' ? ' + Meet-link' : ''} + meghívó-levél a Posta Kimenőbe + feladatkártya - a levél küldése a Postából a te kezedben marad.`
            : `A Mehet után: levél a Posta Kimenőbe + naptár-esemény + feladatkártya${mode !== 'szemelyes' ? ' + Meet-link' : ''} - a küldés a Postából a te kezedben marad.`}</span>
          <span className="sp" />
          <button className="btn" disabled={busy} onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" disabled={busy} onClick={() => { void go(); }}>{busy ? '⏳ Készül…' : '📅 Mehet'}</button>
        </div>
      </div>
    </div>
  );
}
