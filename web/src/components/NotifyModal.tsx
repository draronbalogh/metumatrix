'use client';

import { useEffect, useMemo, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter } from '@/data/agenda';
import { PeopleDB, emailOf, buildFooter } from '@/data/people';
import { standingGroupNames, StandingGroup } from '@/lib/recipients';
import { buildLetter, rerollLetter, LETTER_KINDS, LetterKind, MeetingMode, MeetingPlan } from '@/lib/letters';
import GrowArea from './GrowArea';
import PlaceQuickPick from './PlaceQuickPick';

export interface NotifyTarget {
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
  names: string[]; // előre kijelölt címzettek (a tétel felelőse + résztvevői)
  steps?: string[]; // a kártya (ill. eseménynél a kötött feladatok) lépései — választhatóan a levélbe
}

interface Props {
  target: NotifyTarget;
  teacherNames: string[];
  db: PeopleDB;
  letters: Letter[];                    // a tételhez mentett levelek
  onSaveLetter: (l: Letter) => void;
  onDeleteLetter: (id: string) => void;
  onPlaceChange?: (place: string) => void; // esemény helyszínének visszamentése az eseményre
  onClose: () => void;
}

const STANDING: { id: StandingGroup; label: string }[] = [
  { id: 'minden-tanar', label: 'Minden tanár' },
  { id: 'minden-hallgato', label: 'Minden hallgató' },
  { id: 'mindenki', label: 'Mindenki' },
];

// Sorozat-küldésnél időt spórol: az utolsó sablon és az aláírás-állapot megjegyzése.
const UI_KEY = 'mm-letter-ui';
const loadUi = (): { kind: LetterKind; sigOn: boolean } => {
  try {
    if (typeof window !== 'undefined') {
      const j = JSON.parse(localStorage.getItem(UI_KEY) || '{}') as { kind?: string; sigOn?: boolean };
      const k = LETTER_KINDS.some((x) => x.id === j.kind) ? (j.kind as LetterKind) : 'felkeres';
      return { kind: k, sigOn: j.sigOn !== false };
    }
  } catch { /* privát mód */ }
  return { kind: 'felkeres', sigOn: true };
};
const saveUi = (kind: LetterKind, sigOn: boolean): void => {
  try { localStorage.setItem(UI_KEY, JSON.stringify({ kind, sigOn })); } catch { /* privát mód */ }
};
// ékezet-független névszűréshez
const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Levél-készítő: sablonból generált szöveg + 3 numerikus másolás-gomb (Outlookba illesztéshez).
// A küldés (Brevo/SMTP) opcionális — csak akkor jelenik meg, ha a szerveren be van állítva.
export default function NotifyModal({ target, teacherNames, db, letters, onSaveLetter, onDeleteLetter, onPlaceChange, onClose }: Props) {
  const ui0 = useMemo(loadUi, []);
  const [kind, setKind] = useState<LetterKind>(ui0.kind);
  const [sigOn, setSigOn] = useState(ui0.sigOn); // hivatalos aláírás a levélben (a link-blokk mindig ott van)
  const initial = useMemo(() => buildLetter(ui0.kind, { type: target.targetType, event: target.event, task: target.task }, buildFooter(db, ui0.sigOn), []), [target, db, ui0]);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [place, setPlace] = useState(target.event?.place ?? '');
  const [bodyDirty, setBodyDirty] = useState(false);
  const [selSteps, setSelSteps] = useState<string[]>([]); // a levélbe kerülő lépések (üres = nincs lista)
  // meeting-javaslat a levélben: nincs / online / személyes / hibrid + időpont + link
  const [meetMode, setMeetMode] = useState<MeetingMode | 'nincs'>('nincs');
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [selected, setSelected] = useState<string[]>(() => [...new Set(target.names)]);
  const [recipOpen, setRecipOpen] = useState(false); // a teljes névsor/csoportok csak kérésre nyílnak ki
  const [rq, setRq] = useState(''); // névszűrő a névsorhoz
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    fetch('/api/notify').then((r) => r.json()).then((j) => setConfigured(!!j.configured)).catch(() => setConfigured(false));
  }, []);

  const regenerate = (k: LetterKind, placeOverride?: string, sigOverride?: boolean, stepsOverride?: string[], meetOverride?: MeetingPlan | null) => {
    setKind(k);
    saveUi(k, sigOverride ?? sigOn);
    const p = (placeOverride ?? place).trim();
    const ev = target.event ? { ...target.event, place: p || null } : target.event;
    const meet = meetOverride !== undefined ? meetOverride
      : (meetMode === 'nincs' ? null : { mode: meetMode, date: meetDate, time: meetTime, link: meetLink });
    const gen = buildLetter(k, { type: target.targetType, event: ev, task: target.task }, buildFooter(db, sigOverride ?? sigOn), stepsOverride ?? selSteps, meet);
    setSubject(gen.subject);
    setBody(gen.body);
    setBodyDirty(false);
  };

  // meeting-beállítás változása: ha a levél nincs kézzel átírva, azonnal újragenerálunk
  const applyMeet = (mode: MeetingMode | 'nincs', date: string, time: string, link: string) => {
    setMeetMode(mode); setMeetDate(date); setMeetTime(time); setMeetLink(link);
    if (!bodyDirty) regenerate(kind, undefined, undefined, undefined, mode === 'nincs' ? null : { mode, date, time, link });
  };

  // kézi szerkesztés védelme: felülírás előtt rákérdezünk
  const confirmIfDirty = () => !bodyDirty || confirm('A kézi módosításaid elvesznek. Újrafogalmazzam a levelet?');

  // lépés-választás: a kijelölt lépések számozott listaként kerülnek a levélbe
  const allSteps = target.steps ?? [];
  const setSteps = (next: string[]) => {
    setSelSteps(next);
    if (!bodyDirty) regenerate(kind, undefined, undefined, next);
  };
  const toggleStep = (s: string) =>
    setSteps(selSteps.includes(s) ? selSteps.filter((x) => x !== s) : allSteps.filter((x) => selSteps.includes(x) || x === s));

  // aláírás ki/be: a levél láblécét cseréljük, a törzs (és a kézi szerkesztés) marad
  const toggleSig = () => {
    const next = !sigOn;
    setSigOn(next);
    saveUi(kind, next);
    const oldF = buildFooter(db, sigOn);
    const newF = buildFooter(db, next);
    setBody((b) => {
      if (b.endsWith(oldF)) return b.slice(0, b.length - oldF.length) + newF;
      if (!bodyDirty) { regenerate(kind, undefined, next); return b; }
      return b;
    });
  };

  // helyszín beállítása (chipről vagy kézzel): az eseményre is visszamentjük,
  // és ha a levél még nincs kézzel átírva, azonnal újrageneráljuk vele
  const applyPlace = (v: string, regen: boolean) => {
    setPlace(v);
    onPlaceChange?.(v);
    if (regen && !bodyDirty) regenerate(kind, v);
  };

  const toggle = (name: string) => setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  const addGroup = (g: StandingGroup) => setSelected((s) => [...new Set([...s, ...standingGroupNames(g, teacherNames, db)])]);
  const addCustom = (members: string[]) => setSelected((s) => [...new Set([...s, ...members])]);

  // teljes névsor az egyéni hozzáadáshoz: tanárok (a tantervből) + hallgatók (a törzsből)
  const roster = useMemo(() => [
    ...teacherNames.map((name) => ({ name, kind: 'T' as const })),
    ...db.students.map((s) => ({ name: s.name, kind: 'H' as const })),
  ], [teacherNames, db.students]);

  const { emails, missing } = useMemo(() => {
    const em: string[] = []; const mi: string[] = []; const seen = new Set<string>();
    selected.forEach((n) => {
      const e = emailOf(db, n);
      if (e) { if (!seen.has(e)) { seen.add(e); em.push(e); } } else mi.push(n);
    });
    return { emails: em, missing: mi };
  }, [selected, db]);

  // Robusztus másolás: a Clipboard API csak HTTPS/localhost alatt él — sima HTTP-n
  // (pl. Tailscale IP-ről) a rejtett-textarea + execCommand tartalék útvonal másol.
  const copyText = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* tovább a tartalékra */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };
  const copy = (text: string, label: string) => {
    copyText(text).then((ok) => {
      if (ok) setResult(`✓ ${label} a vágólapon, illeszd be az Outlookba`);
      else setResult('Nem sikerült a másolás. Nyisd ki a szöveget és jelöld ki kézzel.');
    });
  };

  const saveLetter = () => {
    onSaveLetter({
      id: `l-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      targetType: target.targetType,
      targetId: target.targetId,
      subject, body, names: selected,
    });
    setResult('✓ Levél elmentve, lent a listában');
  };

  const loadLetter = (l: Letter) => {
    setSubject(l.subject); setBody(l.body); setSelected(l.names);
    setBodyDirty(true); // a betöltött (kész) levelet a sablon-chipek ne írhassák felül rákérdezés nélkül
    setResult('✓ Mentett levél betöltve.');
  };

  const send = async () => {
    if (!emails.length || !subject.trim()) return;
    setSending(true); setResult(null);
    try {
      const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))}</div>`;
      const r = await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), text: body, html, bcc: emails }),
      });
      const j = await r.json();
      if (j.ok) setResult(`✓ Elküldve ${j.sent} címzettnek.`);
      else setResult(`Hiba: ${j.error || 'küldés sikertelen'}`);
    } catch (e) { setResult(`Hiba: ${String(e)}`); }
    setSending(false);
  };

  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Levél készítése">
        <h3>✉ Levél készítése{target.event ? ` · ${target.event.title}` : target.task ? ` · ${target.task.title}` : ''}</h3>
        <div className="pm-body nm-body">
          <div className="field full">
            <label>Sablon (ugyanarra újra koppintva új megfogalmazás)</label>
            <div className="chipradio">
              {LETTER_KINDS.map((k) => (
                <button type="button" key={k.id} aria-pressed={kind === k.id} className={`crx c-blue${kind === k.id ? ' is-on' : ''}`} onClick={() => { if (confirmIfDirty()) regenerate(k.id); }}>{k.label}</button>
              ))}
            </div>
          </div>
          {target.event && (
            <div className="field full">
              <label>Helyszín (a levélbe és az eseményre is bekerül)</label>
              <input value={place} onChange={(e) => applyPlace(e.target.value, false)} onBlur={() => { if (!bodyDirty) regenerate(kind); }} placeholder="pl. METU, Infopark D épület, 212 vagy külső cím" />
              <PlaceQuickPick value={place} onPick={(v) => applyPlace(v, true)} />
            </div>
          )}
          <div className="field full">
            <label>Címzettek: {selected.length} név · {emails.length} email{missing.length ? ` · ${missing.length} címe hiányzik` : ''}
              <button type="button" className="nm-bodytoggle" onClick={() => setRecipOpen((v) => !v)}>{recipOpen ? '▲ kész' : '± címzettek szerkesztése'}</button>
            </label>
            <div className="cat-picker pp-picker nm-recips">
              {selected.length === 0 && <span className="nm-empty">Nincs címzett. Koppints a „± címzettek szerkesztése” gombra.</span>}
              {selected.map((n) => {
                const has = !!emailOf(db, n);
                return (
                  <button key={n} type="button" className={`chip is-on${has ? '' : ' nm-noemail'}`} title={has ? emailOf(db, n) as string : 'nincs email-cím, a Névjegyzékben add meg'}
                    onClick={() => toggle(n)}>{n}{has ? '' : ' ⚠'}</button>
                );
              })}
            </div>
            {missing.length > 0 && <div className="nm-missing">⚠ Nincs email-címük (kimaradnak): {missing.join(', ')}. A ☎ Névjegyzékben pótolható.</div>}
          </div>
          {recipOpen && (
            <div className="field full">
              <label>Csoportok gyors hozzáadása</label>
              <div className="nm-groups">
                {STANDING.map((g) => <button key={g.id} type="button" className="chip" onClick={() => addGroup(g.id)}>+ {g.label}</button>)}
                <button type="button" className="chip chip--danger" title="Minden címzett törlése egy lépésben" onClick={() => setSelected([])}>✕ Senki</button>
                {db.groups.map((g) => <button key={g.name} type="button" className="chip" title={g.members.join(', ')} onClick={() => addCustom(g.members)}>+ {g.name}</button>)}
              </div>
            </div>
          )}
          {recipOpen && (
            <div className="field full">
              <label>Névsor (T tanár, H hallgató, többet is választhatsz)</label>
              <input className="nm-search" value={rq} onChange={(e) => setRq(e.target.value)} placeholder="Szűrés névre…" />
              <div className="cat-picker pp-picker">
                {roster.filter((r) => !rq.trim() || norm(r.name).includes(norm(rq))).map((r) => {
                  const on = selected.includes(r.name);
                  const has = !!emailOf(db, r.name);
                  return (
                    <button key={r.name} type="button" aria-pressed={on} className={`chip${on ? ' is-on' : ''}${on && !has ? ' nm-noemail' : ''}`}
                      title={has ? (emailOf(db, r.name) as string) : 'nincs email-cím, a Névjegyzékben add meg'}
                      onClick={() => toggle(r.name)}>
                      <span className={`pb ${r.kind === 'T' ? 't' : 'h'}`}>{r.kind}</span>{r.name}{on && !has ? ' ⚠' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="field full">
            <label>Meeting-javaslat a levélben
              <a className="nm-bodytoggle nm-meetlink" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"
                title="Új Google Meet indítása új lapon — a létrejött linket másold be ide">▶ Google Meet ↗</a>
            </label>
            <div className="chipradio">
              {([['nincs', 'Nincs'], ['online', 'Online'], ['szemelyes', 'Személyes'], ['hibrid', 'Hibrid']] as const).map(([id, label]) => (
                <button type="button" key={id} aria-pressed={meetMode === id} className={`crx c-green${meetMode === id ? ' is-on' : ''}`}
                  onClick={() => applyMeet(id, meetDate, meetTime, meetLink)}>{label}</button>
              ))}
            </div>
            {meetMode !== 'nincs' && (
              <div className="nm-meetrow">
                <input type="date" value={meetDate} onChange={(e) => applyMeet(meetMode, e.target.value, meetTime, meetLink)} title="A meeting napja" />
                <input type="time" value={meetTime} onChange={(e) => applyMeet(meetMode, meetDate, e.target.value, meetLink)} title="A meeting időpontja" />
                {meetMode !== 'szemelyes' && (
                  <input className="nm-meeturl" value={meetLink} placeholder="Meet-link (üresen hagyva a levélben kitöltendő hely marad)"
                    onChange={(e) => applyMeet(meetMode, meetDate, meetTime, e.target.value)} />
                )}
              </div>
            )}
          </div>
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="nm-msgrow">
            {allSteps.length > 0 && (
              <div className="field full nm-steps">
                <label>Miről szóljon a levél? ({selSteps.length ? `${selSteps.length} lépés kiválasztva` : 'nincs lépés a levélben'})</label>
                <div className="cat-picker pp-picker">
                  <button type="button" className="chip" onClick={() => setSteps(allSteps)}>✓ Mind</button>
                  <button type="button" className="chip" onClick={() => setSteps([])}>✕ Egyik sem</button>
                  {allSteps.map((s, i) => (
                    <button type="button" key={i} className={`chip${selSteps.includes(s) ? ' is-on' : ''}`} title={s} onClick={() => toggleStep(s)}>
                      {s.length > 48 ? s.slice(0, 48) + '…' : s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="field full nm-msg">
              <label>Üzenet</label>
              <div className="nm-tools">
                <button type="button" className="nm-reroll-big" title="Teljes újrafogalmazás: tárgy + minden mondat újragenerálódik, az adatok (időpont, helyszín) maradnak"
                  onClick={() => { if (confirmIfDirty()) regenerate(kind); }}>🎲 Átfogalmaz</button>
                <button type="button" className="nm-bodytoggle" title="Csak a megszólítást és az elköszönést cseréli, a törzsszöveg marad" onClick={() => setBody((b) => rerollLetter(b))}>↺ Megszólítás és zárás</button>
                <button type="button" aria-pressed={sigOn} className={`nm-bodytoggle${sigOn ? '' : ' nm-off'}`} title="A hivatalos aláírás ki-be kapcsolása; a szakos linkek mindig a levél alján maradnak" onClick={toggleSig}>✒ Aláírás: {sigOn ? 'be' : 'ki'}</button>
                <button type="button" className="nm-bodytoggle" onClick={() => setBodyOpen((v) => !v)}>{bodyOpen ? '▲ elrejtés' : '▼ szerkesztés'}</button>
              </div>
              {bodyOpen ? (
                <GrowArea minRows={8} autoFocus value={body} onChange={(e) => { setBody(e.target.value); setBodyDirty(true); }} />
              ) : (
                <button type="button" className="nm-preview" onClick={() => setBodyOpen(true)} title="Kattints a szerkesztéshez">
                  <span className="nm-preview-text">{body}</span>
                  <span className="more">✎ koppints a szövegre a szerkesztéshez · a 3. gombbal másolható</span>
                </button>
              )}
            </div>
          </div>
          <div className="nm-copyrow big">
            <button className="btn nm-copy" disabled={!emails.length} onClick={() => copy(emails.join('; '), 'Címzettek')}><b>1</b> ⧉ Címzettek ({emails.length})</button>
            <button className="btn nm-copy" disabled={!subject.trim()} onClick={() => copy(subject.trim(), 'Tárgy')}><b>2</b> ⧉ Tárgy</button>
            <button className="btn nm-copy" disabled={!body.trim()} onClick={() => copy(body, 'Üzenet')}><b>3</b> ⧉ Üzenet</button>
            <a className="btn nm-copy nm-outlook" target="_blank" rel="noopener noreferrer"
              href={emails.length
                ? `https://outlook.office.com/mail/deeplink/compose?bcc=${encodeURIComponent(emails.join(';'))}&subject=${encodeURIComponent(subject.trim())}`
                : 'https://outlook.cloud.microsoft/mail/'}
              title={emails.length
                ? 'Új Outlook-levél előtöltve: a címzettek (titkos másolatban) és a tárgy már benne vannak, csak a szöveget illeszd be a 3-as gombbal'
                : 'Az Office 365 Outlook webmail megnyitása új lapon'}>
              {emails.length ? `✉ Outlook: új levél előtöltve (${emails.length} címzett) ↗` : '✉ Outlook megnyitása ↗'}
            </a>
          </div>
          {result && <div aria-live="polite" className={`nm-result${result.startsWith('✓') ? ' ok' : ' err'}`}>{result}</div>}
          {letters.length > 0 && (
            <div className="field full">
              <label>Mentett levelek ehhez a tételhez</label>
              <div className="nm-letters">
                {letters.map((l) => (
                  <div key={l.id} className="nm-letter">
                    <button className="nm-letter-load" onClick={() => loadLetter(l)} title="Betöltés">
                      <span className="s">{l.subject}</span>
                      <span className="d">{fmtDate(l.createdAt)} · {l.names.length} címzett</span>
                    </button>
                    <button className="btn btn--danger pm-del" title="Levél törlése" onClick={() => onDeleteLetter(l.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mfoot">
          <button className={`btn${configured ? '' : ' btn--ink'}`} onClick={saveLetter} disabled={!subject.trim()}>💾 Levél mentése</button>
          <span className="sp" />
          <button className="btn" onClick={onClose}>Bezárás</button>
          {configured && (
            <button className="btn btn--ink" disabled={sending || !emails.length || !subject.trim()}
              title="Küldés a beállított email-szolgáltatón át (BCC)" onClick={send}>
              {sending ? 'Küldés…' : `✉ Küldés (${emails.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
