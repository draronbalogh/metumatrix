'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter } from '@/data/agenda';
import { PeopleDB, PersonKind, KIND_LABEL, emailOf, buildFooter, buildRoster, formerTeacherNames, teacherStatusNames, studentOrganizerNames } from '@/data/people';
import { buildLetter, rerollLetter, greetingFor, isKnownGreeting, LETTER_KINDS, LetterKind, MeetingMode, MeetingPlan } from '@/lib/letters';
import GrowArea from './GrowArea';
import PlaceQuickPick from './PlaceQuickPick';
import { editHeaders } from '@/lib/editkey';
import { TOPIC_TEMPLATES, TOPIC_GROUPS, TopicTemplate, autoFill } from '@/lib/topics';

export interface NotifyTarget {
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
  names: string[]; // előre kijelölt címzettek (a tétel felelőse + résztvevői)
  steps?: string[]; // a kártya (ill. eseménynél a kötött feladatok) lépései — választhatóan a levélbe
  source?: { name: string; email: string; subject?: string | null } | null; // a kiváltó email feladója
  topicId?: string | null; // a Levelek nézetből indított levél előtöltött témasablonja
  preload?: { subject: string; body: string; names: string[] } | null; // mentett levél megnyitása kész tartalommal
}

interface Props {
  target: NotifyTarget;
  teacherNames: string[];
  db: PeopleDB;
  letters: Letter[];                    // a tételhez mentett levelek
  onSaveLetter: (l: Letter) => void;
  onDeleteLetter: (id: string) => void;
  onPlaceChange?: (place: string) => void; // esemény helyszínének visszamentése az eseményre
  onSourceChange?: (s: { name: string; email: string; subject?: string | null } | null) => void; // feladó visszamentése a kártyára
  onClose: () => void;
  inline?: boolean; // a Levelek nézetbe beágyazva (nem modálként) fut ugyanez a szerkesztő
  topicReq?: { t: TopicTemplate; n: number } | null;  // kívülről kért sablon-betöltés
  letterReq?: { l: Letter; n: number } | null;        // kívülről kért mentett-levél betöltés
  ctxEvents?: AgendaEvent[]; // kártya nélküli levélnél: kapcsolható események (dátum/helyszín forrás)
  ctxTasks?: AgendaTask[];   // kártya nélküli levélnél: kapcsolható feladatok (határidő forrás)
}


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
export default function NotifyModal({ target, teacherNames, db, letters, onSaveLetter, onDeleteLetter, onPlaceChange, onSourceChange, onClose, inline, topicReq, letterReq, ctxEvents, ctxTasks }: Props) {
  const ui0 = useMemo(loadUi, []);
  const [kind, setKind] = useState<LetterKind>(ui0.kind);
  const [sigOn, setSigOn] = useState(ui0.sigOn); // hivatalos aláírás a levélben (a link-blokk mindig ott van)
  const initial = useMemo(() => buildLetter(ui0.kind, { type: target.targetType, event: target.event, task: target.task, source: target.source }, buildFooter(db, ui0.sigOn), []), [target, db, ui0]);
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
  const [adhoc, setAdhoc] = useState<string[]>([]); // egyedi email-címzettek (pl. a levél feladója)
  const [rq, setRq] = useState(''); // névszűrő a névsorhoz
  // a levél feladója: a kártyáról jön, de itt helyben is megadható (vissza is mentjük a kártyára)
  const [src, setSrc] = useState(target.source ?? null);
  const [srcName, setSrcName] = useState('');
  const [srcEmail, setSrcEmail] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [tq, setTq] = useState(''); // keresés a jobb oldali sablonpanelben

  // Kártya nélküli (önálló) levélnél is legyen honnan adatot húzni: a naptár
  // eseményei / feladatai közül kapcsolható egy tétel, és a dátum, helyszín,
  // határidő onnan töltődik. Sablon-betöltéskor névegyezés alapján automatikusan
  // hozzá is kapcsoljuk az egyértelmű találatot (pl. Educatio sablon → Educatio esemény).
  const [ctxSel, setCtxSel] = useState('');
  const effEvent = useMemo(() => (ctxSel.startsWith('e:') ? (ctxEvents ?? []).find((e) => e.id === ctxSel.slice(2)) ?? null : null), [ctxSel, ctxEvents]);
  const effTask = useMemo(() => (ctxSel.startsWith('t:') ? (ctxTasks ?? []).find((t) => t.id === ctxSel.slice(2)) ?? null : null), [ctxSel, ctxTasks]);
  const lastTopicRef = useRef<TopicTemplate | null>(null); // az utoljára betöltött sablon (újratöltéshez)
  const typedRef = useRef(false); // írt-e bele kézzel — csak akkor kérdezünk rá a felülírásra

  // témasablon alkalmazása: minden ismert adat automatikusan kitöltődik — a kártya
  // vagy a kapcsolt esemény/feladat adatai (cím, időpont, helyszín, határidő), a
  // tanév/félév/hónap a mai dátumból, a megszólítás pedig a kiválasztott
  // címzettekhez igazodik. A kész vázlatot más sablon csak rákérdezés után írja felül.
  const applyTopic = (t: TopicTemplate) => {
    let ev = target.event ?? effEvent;
    let tk = target.task ?? effTask;
    // automatikus hozzárendelés: ha nincs kapcsolt tétel, és a sablon neve
    // egyértelműen egyezik egy naptári eseménnyel / feladattal, azt használjuk
    if (!ev && !tk) {
      const toks = [...t.id.split('-'), ...t.label.split(/[^\wáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+/)].map(norm).filter((w) => w.length >= 6);
      const evs = (ctxEvents ?? []).filter((e) => toks.some((w) => norm(e.title).includes(w)));
      const tks = (ctxTasks ?? []).filter((x) => toks.some((w) => norm(x.title).includes(w)));
      if (evs.length === 1) { ev = evs[0]; setCtxSel(`e:${evs[0].id}`); }
      else if (evs.length === 0 && tks.length === 1) { tk = tks[0]; setCtxSel(`t:${tks[0].id}`); }
    }
    const ctx = {
      title: ev?.title || tk?.title || '',
      when: ev ? (ev.when || ev.day) : undefined,
      place: target.event ? (place || target.event.place) : ev?.place,
      due: tk ? (tk.due || tk.dueDate) : undefined,
    };
    lastTopicRef.current = t;
    typedRef.current = false;
    setSubject(autoFill(t.subject(ctx)));
    let txt = autoFill(t.body(ctx));
    const lines = txt.split('\n');
    const gi = lines.findIndex((l) => l.trim() !== '');
    if (gi >= 0) {
      const tmpl = lines[gi].trim();
      let next = tmpl;
      if (recipient.count === 1 && recipient.name) {
        const given = recipient.name.trim().split(/\s+/).filter((p) => !/^dr\.?$/i.test(p) && !/^habil\.?$/i.test(p)).pop() ?? '[Név]';
        next = `${tmpl.startsWith('Szia') ? 'Szia' : 'Kedves'} ${given}!`;
      } else if (recipient.count > 1 && audience.length) {
        next = greetingFor(audience);
      }
      lines[gi] = next;
      lastGreetRef.current = next; // a címzett-kör későbbi változásakor is cserélhető marad
      txt = lines.join('\n');
    }
    setBody(`${txt}\n\n${buildFooter(db, sigOn)}`);
    setBodyDirty(true);
    const linked = ev ?? tk;
    setResult(`✓ Sablon betöltve: ${t.label}.${linked && !target.event && !target.task ? ` Kapcsolt naptári tétel: ${linked.title}.` : ''} Csak a maradék [szögletes] mezőt töltsd ki.`);
  };

  // ha a kapcsolt tétel változik (másikat választasz, vagy a naptárban átírják a
  // dátumát/helyszínét), a betöltött sablont újratöltjük a friss adatokkal —
  // kézzel szerkesztett szöveget csak rákérdezés után írunk felül
  const ctxDataKey = `${ctxSel}|${effEvent?.title ?? ''}|${effEvent?.when ?? ''}|${effEvent?.day ?? ''}|${effEvent?.place ?? ''}|${effTask?.title ?? ''}|${effTask?.due ?? ''}|${effTask?.dueDate ?? ''}`;
  const ctxKeyRef = useRef(ctxDataKey);
  useEffect(() => {
    if (ctxKeyRef.current === ctxDataKey) return;
    ctxKeyRef.current = ctxDataKey;
    if (!lastTopicRef.current) return;
    if (typedRef.current && !confirm('A kézi módosításaid elvesznek. Újratöltsem a sablont a kapcsolt tétel friss adataival?')) return;
    applyTopic(lastTopicRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxDataKey]);

  // teljes szövegű keresőindex a jobb oldali sablonpanelhez (cím + csoport + tárgy + törzs)
  const topicIndex = useMemo(() => {
    const c0 = { title: '', when: null, place: null, due: null };
    return new Map(TOPIC_TEMPLATES.map((t) => [t.id, norm(`${t.label} ${t.group} ${t.subject(c0)} ${t.body(c0)}`)]));
  }, []);

  useEffect(() => {
    if (inline) return; // beágyazva nincs mit bezárni
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, inline]);

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
    const gen = buildLetter(k, { type: target.targetType, event: ev, task: target.task, source: src }, buildFooter(db, sigOverride ?? sigOn), stepsOverride ?? selSteps, meet, audience, recipient);
    setSubject(gen.subject);
    setBody(gen.body);
    setBodyDirty(false);
    lastGreetRef.current = gen.body.split('\n').find((l) => l.trim())?.trim() ?? '';
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
  const addCustom = (members: string[]) => setSelected((s) => [...new Set([...s, ...members])]);

  // teljes névsor az egyéni hozzáadáshoz: az ÖSSZES állandó lista (tanár, hallgató,
  // intézményi, alumni, piaci) — a badge-szűrővel kategóriára szűkíthető
  const roster = useMemo(() => buildRoster(teacherNames, db), [teacherNames, db]);
  const [kindFilter, setKindFilter] = useState<PersonKind | ''>('');

  // a kiválasztott címzettek összetétele (T/H/I/A/P) — ehhez igazodik a megszólítás.
  // Egy név több listában is szerepelhet (pl. alumnus, aki óraadó is): ha a kiválasztottak
  // MIND lefedhetők egyetlen listával, az a lista dönt (alumni/piaci/intézményi elsőbbséggel).
  const kindSets = useMemo(() => ({
    T: new Set(teacherNames),
    H: new Set(db.students.map((s) => s.name)),
    I: new Set(db.institution.map((s) => s.name)),
    A: new Set(db.alumni.map((s) => s.name)),
    O: new Set(db.opponents.map((s) => s.name)),
    P: new Set(db.market.map((s) => s.name)),
  }), [teacherNames, db]);
  const audience = useMemo<PersonKind[]>(() => {
    if (!selected.length) return [];
    const has = (k: PersonKind, n: string) => kindSets[k].has(n);
    for (const k of ['O', 'A', 'P', 'I', 'H', 'T'] as PersonKind[]) {
      if (selected.every((n) => has(k, n))) return [k];
    }
    if (selected.every((n) => has('T', n) || has('H', n))) return ['T', 'H'];
    const union = (['T', 'H', 'I', 'A', 'O', 'P'] as PersonKind[]).filter((k) => selected.some((n) => has(k, n)));
    return union;
  }, [selected, kindSets]);
  // Címzett-információ a levélgenerátornak: EGY címzettnél név szerinti, egyes számú
  // megszólítás és szöveg; többnél a kör összetétele szerinti többes számú készlet.
  const recipient = useMemo(() => {
    const count = selected.length + adhoc.length;
    return { count, name: count === 1 ? (selected[0] ?? null) : null };
  }, [selected, adhoc]);
  // a címzett-kör változásakor a levél megszólító sora automatikusan átvált
  // (az általunk generált megszólítást cseréljük; a kézzel írtat nem bántjuk)
  const lastGreetRef = useRef('');
  const audienceKey = `${audience.join('')}|${recipient.count}|${recipient.name ?? ''}`;
  useEffect(() => {
    const next = recipient.count === 1
      ? `Kedves ${recipient.name ? recipient.name.trim().split(/\s+/).filter((p) => !/^dr\.?$/i.test(p) && !/^habil\.?$/i.test(p)).pop() : '[Név]'}!`
      : greetingFor(audience.length ? audience : undefined);
    // funkcionális frissítés: mindig az AKTUÁLIS törzsön dolgozunk, így nem írja
    // felül egy ugyanabban a körben történt sablon-betöltés eredményét.
    // A ref KORÁBBI értékét rögzítjük, mert az updater később fut, mint az alábbi átírás.
    const prevGreet = lastGreetRef.current;
    setBody((b) => {
      const lines = b.split('\n');
      const gi = lines.findIndex((l) => l.trim() !== '');
      if (gi < 0) return b;
      const cur = lines[gi].trim();
      if (!isKnownGreeting(cur) && cur !== prevGreet) return b;
      if (cur === next) return b;
      lines[gi] = next;
      return lines.join('\n');
    });
    lastGreetRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceKey]);

  // a Levelek nézetből / sablon-előtöltéssel indított betöltések — a megszólítás-
  // igazító effekt UTÁN futnak, hogy mount-kor az ő eredményük legyen a végső
  useEffect(() => {
    if (target.preload) {
      setSubject(target.preload.subject);
      setBody(target.preload.body);
      setSelected(target.preload.names.filter((n) => !n.includes('@')));
      setAdhoc(target.preload.names.filter((n) => n.includes('@')));
      setBodyDirty(true); // kész levél: sablon / 🎲 csak rákérdezés után írhatja felül
      return;
    }
    if (!target.topicId) return;
    const t = TOPIC_TEMPLATES.find((x) => x.id === target.topicId);
    if (t) applyTopic(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (topicReq && confirmIfDirty()) applyTopic(topicReq.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicReq]);
  useEffect(() => {
    if (letterReq) loadLetter(letterReq.l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterReq]);

  const { emails, missing } = useMemo(() => {
    const em: string[] = []; const mi: string[] = []; const seen = new Set<string>();
    selected.forEach((n) => {
      const e = emailOf(db, n);
      if (e) { if (!seen.has(e)) { seen.add(e); em.push(e); } } else mi.push(n);
    });
    adhoc.forEach((e) => { if (!seen.has(e)) { seen.add(e); em.push(e); } });
    return { emails: em, missing: mi };
  }, [selected, adhoc, db]);

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
      subject, body, names: [...selected, ...adhoc],
    });
    setResult('✓ Levél elmentve, lent a listában');
  };

  const loadLetter = (l: Letter) => {
    setSubject(l.subject); setBody(l.body); setSelected(l.names);
    setBodyDirty(true); // a betöltött (kész) levelet a sablon-chipek ne írhassák felül rákérdezés nélkül
    lastTopicRef.current = null; // kész levél: a kapcsolt tétel változása ne írja át
    typedRef.current = true;
    setResult('✓ Mentett levél betöltve.');
  };

  const send = async () => {
    if (!emails.length || !subject.trim()) return;
    setSending(true); setResult(null);
    try {
      const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))}</div>`;
      const r = await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ subject: subject.trim(), text: body, html, bcc: emails }),
      });
      const j = await r.json();
      if (j.ok) setResult(`✓ Elküldve ${j.sent} címzettnek.`);
      else setResult(`Hiba: ${j.error || 'küldés sikertelen'}`);
    } catch (e) { setResult(`Hiba: ${String(e)}`); }
    setSending(false);
  };

  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');

  // ugyanaz a szerkesztő fut modálként (feladat/esemény ✉) és beágyazva (Levelek nézet)
  const content = (
    <>
        <div className="pm-body nm-body">
          <div className="f-sec c-blue">1 · Kinek megy a levél?</div>
          <div className="field full">
            <label>A levél feladója (neki egy gombbal válaszolhatsz)</label>
            {src ? (
              <div className="nm-groups">
                <span className="chip is-on" title={src.email}>✉ {src.name || src.email}</span>
                <button type="button" className="chip" title="Csak a feladó lesz a címzett, és Válasz-sablon készül (Re: az eredeti tárggyal)"
                  onClick={() => { setSelected([]); setAdhoc([src.email]); if (confirmIfDirty()) regenerate('valasz'); }}>↩ Válasz a feladónak</button>
                <button type="button" className="chip" title="A feladó hozzáadása a mostani címzettekhez"
                  onClick={() => setAdhoc((a) => (a.includes(src.email) ? a : [...a, src.email]))}>+ címzettnek</button>
                <button type="button" className="chip chip--danger" title="Feladó törlése a kártyáról"
                  onClick={() => { setSrc(null); onSourceChange?.(null); }}>✕</button>
              </div>
            ) : (
              <div className="nm-srcrow">
                <input value={srcName} onChange={(e) => setSrcName(e.target.value)} placeholder="Feladó neve (pl. Rizmajer Andrea)" />
                <input type="email" value={srcEmail} onChange={(e) => setSrcEmail(e.target.value)} placeholder="email@cim.hu" />
                <button type="button" className="btn" disabled={!srcEmail.trim()}
                  onClick={() => { const s = { name: srcName.trim(), email: srcEmail.trim() }; setSrc(s); onSourceChange?.(s); }}>✓ Feladó mentése</button>
              </div>
            )}
          </div>
          <div className="field full">
            <label>Címzettek: {selected.length + adhoc.length} címzett · {emails.length} email{missing.length ? ` · ${missing.length} címe hiányzik` : ''}</label>
            <div className="nm-row">
              <span className="nm-hint" title="Egy koppintás lecseréli a teljes címzett-listát">Gyors:</span>
              <div className="chipradio">
                <button type="button" className="crx c-amber" disabled={!src}
                  title={src ? `Válasz a feladónak: ${src.email}` : 'Előbb add meg fent a feladót (név + email), utána egy koppintás a válasz'}
                  onClick={() => { if (!src) return; setSelected([]); setAdhoc([src.email]); if (confirmIfDirty()) regenerate('valasz'); }}>↩ A feladónak</button>
                <button type="button" className="crx c-blue" title="A kártya felelőse és résztvevői"
                  onClick={() => { setSelected([...new Set(target.names)]); setAdhoc([]); }}>Résztvevők</button>
                {([
                  { label: 'Aktuális oktatók', names: teacherNames, hint: 'A tantervben szereplő jelenlegi oktatói kar' },
                  { label: 'Főállású oktatók', names: teacherStatusNames(teacherNames, db, 'főállású'), hint: 'A Névjegyzékben "főállású" státuszúra címkézett aktuális oktatók' },
                  { label: 'Óraadók', names: teacherStatusNames(teacherNames, db, 'óraadó'), hint: 'A Névjegyzékben "óraadó" státuszúra címkézett aktuális oktatók' },
                  { label: 'Volt / külsős oktatók', names: formerTeacherNames(teacherNames, db), hint: 'Oktatói kontaktok, akik az aktuális tantervben már nem szerepelnek' },
                  { label: 'Hallgatói szervezők', names: studentOrganizerNames(db), hint: 'Szervező / nagykövet / képviselő státuszú hallgatók' },
                  { label: 'Minden hallgató', names: db.students.map((p) => p.name), hint: 'A teljes hallgatói lista' },
                  { label: 'Minden intézményi', names: db.institution.map((p) => p.name), hint: 'A teljes intézményi kontaktlista' },
                  { label: 'Minden alumni', names: db.alumni.map((p) => p.name), hint: 'A teljes alumni lista' },
                  { label: 'Minden opponens', names: db.opponents.map((p) => p.name), hint: 'Opponensek és diploma-opponensek' },
                  { label: 'Minden piaci', names: db.market.map((p) => p.name), hint: 'A teljes piaci / külső partnerlista' },
                  { label: 'Mindenki', names: [...teacherNames, ...formerTeacherNames(teacherNames, db), ...db.students.map((p) => p.name), ...db.institution.map((p) => p.name), ...db.alumni.map((p) => p.name), ...db.opponents.map((p) => p.name), ...db.market.map((p) => p.name)], hint: 'Az összes lista együtt' },
                ]).map((p) => {
                  const names = [...new Set(p.names)];
                  return (
                    <button key={p.label} type="button" className="crx c-blue" disabled={!names.length}
                      title={names.length ? `${p.hint}. ${names.length} név — a lista cseréje.` : `${p.hint}. Még üres: a ☎ Névjegyzékben tölthető fel / címkézhető.`}
                      onClick={() => { setSelected(names); setAdhoc([]); }}>
                      {p.label}{names.length ? ` (${names.length})` : ''}
                    </button>
                  );
                })}
                <button type="button" className="crx c-grey" title="Minden címzett törlése" onClick={() => { setSelected([]); setAdhoc([]); }}>✕ Senki</button>
              </div>
            </div>
            {db.groups.length > 0 && (
              <div className="nm-row">
                <span className="nm-hint" title="A csoport tagjait hozzáadja a mostani címzettekhez">Csoport:</span>
                <div className="nm-groups">
                  {db.groups.map((g) => <button key={g.name} type="button" className="chip" title={g.members.join(', ')} onClick={() => addCustom(g.members)}>+ {g.name}</button>)}
                </div>
              </div>
            )}
            <div className="nm-row">
              <span className="nm-hint" title="Koppints a nevekre a hozzáadáshoz / levételhez">Névsor:</span>
              <div className="nm-groups nm-kindrow">
                {(['T', 'H', 'I', 'A', 'O', 'P'] as PersonKind[]).map((k) => (
                  <button key={k} type="button" aria-pressed={kindFilter === k} className={`chip${kindFilter === k ? ' is-on' : ''}`}
                    onClick={() => setKindFilter((v) => (v === k ? '' : k))}>
                    <span className={`pb ${k.toLowerCase()}`}>{k}</span>{KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
            <input className="nm-search" value={rq} onChange={(e) => setRq(e.target.value)} placeholder="Szűrés névre…" />
            <div className="cat-picker pp-picker">
              {adhoc.map((e) => (
                <button key={e} type="button" className="chip is-on" title="Egyedi email-címzett — kattints a levételhez" onClick={() => setAdhoc((a) => a.filter((x) => x !== e))}>@ {e}</button>
              ))}
              {selected.filter((n) => !roster.some((r) => r.name === n)).map((n) => (
                <button key={n} type="button" className="chip is-on" title="Listán kívüli (régi) név — kattints a levételhez" onClick={() => toggle(n)}>{n}</button>
              ))}
              {roster
                .filter((r) => (!kindFilter || r.kind === kindFilter) && (!rq.trim() || norm(r.name).includes(norm(rq))))
                .map((r) => {
                  const on = selected.includes(r.name);
                  const has = !!emailOf(db, r.name);
                  return (
                    <button key={`${r.kind}-${r.name}`} type="button" aria-pressed={on} className={`chip${on ? ' is-on' : ''}${on && !has ? ' nm-noemail' : ''}`}
                      title={has ? (emailOf(db, r.name) as string) : 'nincs email-cím, a Névjegyzékben add meg'}
                      onClick={() => toggle(r.name)}>
                      <span className={`pb ${r.kind.toLowerCase()}`}>{r.kind}</span>{r.name}{on && !has ? ' ⚠' : ''}
                    </button>
                  );
                })}
            </div>
            {missing.length > 0 && <div className="nm-missing">⚠ Nincs email-címük (kimaradnak): {missing.join(', ')}. A ☎ Névjegyzékben pótolható.</div>}
          </div>
          <div className="f-sec c-green">2 · Miről szóljon?</div>
          {!target.event && !target.task && ((ctxEvents?.length ?? 0) + (ctxTasks?.length ?? 0)) > 0 && (
            <div className="field full">
              <label>Kapcsolt naptári tétel (a dátum, helyszín, határidő innen töltődik a sablonba)</label>
              <select value={ctxSel} onChange={(e) => setCtxSel(e.target.value)}>
                <option value="">Nincs kapcsolt tétel (általános levél)</option>
                {(ctxEvents?.length ?? 0) > 0 && (
                  <optgroup label="Események">
                    {(ctxEvents ?? []).map((e) => (
                      <option key={e.id} value={`e:${e.id}`}>{e.title}{e.when || e.day ? ` · ${e.when || e.day}` : ''}{e.place ? ` · ${e.place}` : ''}</option>
                    ))}
                  </optgroup>
                )}
                {(ctxTasks?.length ?? 0) > 0 && (
                  <optgroup label="Feladatok">
                    {(ctxTasks ?? []).map((t) => (
                      <option key={t.id} value={`t:${t.id}`}>{t.title}{t.due || t.dueDate ? ` · ${t.due || t.dueDate}` : ''}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}
          <div className="field full">
            <label>Sablon (ugyanarra újra koppintva új megfogalmazás)</label>
            <div className="chipradio">
              {LETTER_KINDS.map((k) => (
                <button type="button" key={k.id} aria-pressed={kind === k.id} className={`crx c-blue${kind === k.id ? ' is-on' : ''}`} onClick={() => { if (confirmIfDirty()) regenerate(k.id); }}>{k.label}</button>
              ))}
            </div>
          </div>
          <div className="field full">
            <label>Vagy témasablon a tavalyi leveleid mintáiból (a [szögletes] mezőket töltsd ki)</label>
            <select value="" onChange={(e) => {
              const t = TOPIC_TEMPLATES.find((x) => x.id === e.target.value);
              e.target.value = '';
              if (!t || !confirmIfDirty()) return;
              applyTopic(t);
            }}>
              <option value="">Válassz témasablont…</option>
              {TOPIC_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {TOPIC_TEMPLATES.filter((t) => t.group === g).map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {target.event && (
            <div className="field full">
              <label>Helyszín (a levélbe és az eseményre is bekerül)</label>
              <input value={place} onChange={(e) => applyPlace(e.target.value, false)} onBlur={() => { if (!bodyDirty) regenerate(kind); }} placeholder="pl. METU, Infopark D épület, 212 vagy külső cím" />
              <PlaceQuickPick value={place} onPick={(v) => applyPlace(v, true)} />
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
          <div className="f-sec">3 · A levél szövege és küldése</div>
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="nm-msgrow">
            <div className="nm-side">
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
              <aside className="field full nm-topicpanel">
                <label>Témasablonok ({TOPIC_TEMPLATES.length}) — koppints, és betöltődik</label>
                <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Keresés a sablonok között…" />
                <div className="nm-topiclist">
                  {TOPIC_GROUPS.map((g) => {
                    const items = TOPIC_TEMPLATES.filter((t) => t.group === g && (!tq.trim() || (topicIndex.get(t.id) as string).includes(norm(tq))));
                    if (!items.length) return null;
                    return (
                      <div key={g}>
                        <div className="nm-tgh">{g}</div>
                        {items.map((t) => (
                          <button key={t.id} type="button" className="nm-titem" title={`Tárgy: ${t.subject({ title: '', when: null, place: null, due: null })}`}
                            onClick={() => { if (confirmIfDirty()) applyTopic(t); }}>{t.label}</button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
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
                <GrowArea minRows={8} autoFocus value={body} onChange={(e) => { setBody(e.target.value); setBodyDirty(true); typedRef.current = true; }} />
              ) : (
                <button type="button" className="nm-preview" onClick={() => setBodyOpen(true)} title="Kattints a szerkesztéshez">
                  <span className="nm-preview-text">{body}</span>
                  <span className="more">✎ koppints a szövegre a szerkesztéshez · a 3. gombbal másolható</span>
                </button>
              )}
            </div>
          </div>
          <div className="nm-copyrow big">
            <button className="btn nm-copy" disabled={!emails.length} onClick={() => copy(emails.join('; '), 'Címzettek')}><b>1</b> ⧉ Címzettek<span className="nm-cnt"> ({emails.length})</span></button>
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
          {!inline && <button className="btn" onClick={onClose}>Bezárás</button>}
          {configured && (
            <button className="btn btn--ink" disabled={sending || !emails.length || !subject.trim()}
              title="Küldés a beállított email-szolgáltatón át (BCC)" onClick={send}>
              {sending ? 'Küldés…' : `✉ Küldés (${emails.length})`}
            </button>
          )}
        </div>
    </>
  );

  if (inline) return <div className="nm-inline">{content}</div>;
  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Levél készítése">
        <h3>✉ Levél készítése{target.event ? ` · ${target.event.title}` : target.task ? ` · ${target.task.title}` : ''}</h3>
        {content}
      </div>
    </div>
  );
}
