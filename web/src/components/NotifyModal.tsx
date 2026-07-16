'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter, fmtDueHu } from '@/data/agenda';
import { PeopleDB, PersonKind, KIND_LABEL, emailOf, buildFooter, buildRoster, formerTeacherNames, teacherStatusNames, studentOrganizerNames, studentStatusNames, studentCohorts, cohortNames, SIGNATURE_SEPARATOR } from '@/data/people';
import { buildLetter, rerollLetter, greetingFor, isKnownGreeting, LETTER_KINDS, LetterKind, MeetingMode, MeetingPlan } from '@/lib/letters';
import GrowArea from './GrowArea';
import PlaceQuickPick from './PlaceQuickPick';
import { ModalTabs, TabDef } from './AgendaModals';
import { editHeaders } from '@/lib/editkey';
import { TOPIC_TEMPLATES, TOPIC_GROUPS, TopicTemplate, autoFill, fmtDay, paraphrase, normText, LINK_STOP } from '@/lib/topics';

export interface NotifyTarget {
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
  names: string[]; // előre kijelölt címzettek (a tétel felelőse + résztvevői)
  steps?: string[]; // a kártya (ill. eseménynél a kötött feladatok) lépései — választhatóan a levélbe
  source?: { name: string; email: string; subject?: string | null } | null; // a kiváltó email feladója
  topicId?: string | null; // a Levelek nézetből indított levél előtöltött témasablonja
  preload?: { subject: string; body: string; names: string[]; letterId?: string } | null; // mentett levél megnyitása kész tartalommal
}

interface Props {
  target: NotifyTarget;
  teacherNames: string[];
  db: PeopleDB;
  letters: Letter[];                    // a tételhez mentett levelek
  onSaveLetter: (l: Letter) => void;
  onDeleteLetter: (id: string) => void;
  onLetterStatus?: (id: string, status: 'draft' | 'sent') => void; // vázlat/kiküldve váltás
  onPlaceChange?: (place: string) => void; // esemény helyszínének visszamentése az eseményre
  onSourceChange?: (s: { name: string; email: string; subject?: string | null } | null) => void; // feladó visszamentése a kártyára
  onClose: () => void;
  inline?: boolean; // a Levelek nézetbe beágyazva (nem modálként) fut ugyanez a szerkesztő
  topicReq?: { t: TopicTemplate; n: number } | null;  // kívülről kért sablon-betöltés
  letterReq?: { l: Letter; n: number } | null;        // kívülről kért mentett-levél betöltés
  ctxEvents?: AgendaEvent[]; // kártya nélküli levélnél: kapcsolható események (dátum/helyszín forrás)
  ctxTasks?: AgendaTask[];   // kártya nélküli levélnél: kapcsolható feladatok (határidő forrás)
  topicLinks?: Record<string, string>; // rögzített sablon→naptár kapcsolatok (UID szerint, 100% determinisztikus)
  onLinkTopic?: (topicId: string, sel: string | null) => void; // kapcsolat rögzítése / törlése
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
// ékezet-független névszűréshez — a sablon-egyeztetéssel közös helper (topics.ts)
const norm = normText;

// Levél-készítő: sablonból generált szöveg + 3 numerikus másolás-gomb (Outlookba illesztéshez).
// A küldés (Brevo/SMTP) opcionális — csak akkor jelenik meg, ha a szerveren be van állítva.
export default function NotifyModal({ target, teacherNames, db, letters, onSaveLetter, onDeleteLetter, onLetterStatus, onPlaceChange, onSourceChange, onClose, inline, topicReq, letterReq, ctxEvents, ctxTasks, topicLinks, onLinkTopic }: Props) {
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
  // multistep fülek: Címzettek → Tartalom → Szöveg és küldés → Mentett levelek;
  // beágyazva (Levelek nézet) a Szöveg fül a kiindulás, mert oda töltődik a sablon
  const [tab, setTab] = useState(inline ? 'text' : 'to');

  // Kártya nélküli (önálló) levélnél is legyen honnan adatot húzni: a naptár
  // eseményei / feladatai közül kapcsolható egy tétel, és a dátum, helyszín,
  // határidő onnan töltődik. Sablon-betöltéskor névegyezés alapján automatikusan
  // hozzá is kapcsoljuk az egyértelmű találatot (pl. Educatio sablon → Educatio esemény).
  const [ctxSel, setCtxSel] = useState('');
  const effEvent = useMemo(() => (ctxSel.startsWith('e:') ? (ctxEvents ?? []).find((e) => e.id === ctxSel.slice(2)) ?? null : null), [ctxSel, ctxEvents]);
  const effTask = useMemo(() => (ctxSel.startsWith('t:') ? (ctxTasks ?? []).find((t) => t.id === ctxSel.slice(2)) ?? null : null), [ctxSel, ctxTasks]);
  const lastTopicRef = useRef<TopicTemplate | null>(null); // az utoljára betöltött sablon (újratöltéshez)
  const loadedLetterRef = useRef<string | null>(null); // a betöltött mentett levél id-je — küldéskor ezt jelöljük kiküldöttre
  const [linkSuggestion, setLinkSuggestion] = useState<{ sel: string; title: string } | null>(null); // névegyezéses JAVASLAT — csak gombbal rögzül
  const [activeTopic, setActiveTopic] = useState<TopicTemplate | null>(null); // ugyanez a felületnek
  const typedRef = useRef(false); // írt-e bele kézzel — csak akkor kérdezünk rá a felülírásra

  // témasablon alkalmazása: minden ismert adat automatikusan kitöltődik — a kártya
  // vagy a kapcsolt esemény/feladat adatai (cím, időpont, helyszín, határidő), a
  // tanév/félév/hónap a mai dátumból, a megszólítás pedig a kiválasztott
  // címzettekhez igazodik. A kész vázlatot más sablon csak rákérdezés után írja felül.
  const applyTopic = (t: TopicTemplate) => {
    let ev = target.event ?? effEvent;
    let tk = target.task ?? effTask;
    // 1) rögzített (UID-alapú) kapcsolat: ha korábban már összekötötted, az a biztos forrás
    let evStored = false;
    if (!ev && !tk) {
      const stored = topicLinks?.[t.id];
      if (stored?.startsWith('e:')) ev = (ctxEvents ?? []).find((e) => e.id === stored.slice(2)) ?? null;
      else if (stored?.startsWith('t:')) tk = (ctxTasks ?? []).find((x) => x.id === stored.slice(2)) ?? null;
      if (ev) { setCtxSel(`e:${ev.id}`); evStored = true; }
      else if (tk) { setCtxSel(`t:${tk.id}`); evStored = true; }
    }
    // 2) névegyezés: SOHA nem kapcsol magától — csak javaslatot tesz, amit egy
    // gombnyomás rögzít (UID szerint); enélkül a sablon kapcsolat nélkül töltődik
    let suggestion: { sel: string; title: string } | null = null;
    if (!ev && !tk) {
      const toks = [...t.id.split('-'), ...t.label.split(/[^\wáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+/)].map(norm).filter((w) => w.length >= 6 && !LINK_STOP.has(w));
      const evs = (ctxEvents ?? []).filter((e) => toks.some((w) => norm(e.title).includes(w)));
      const tks = (ctxTasks ?? []).filter((x) => toks.some((w) => norm(x.title).includes(w)));
      if (evs.length === 1) suggestion = { sel: `e:${evs[0].id}`, title: evs[0].title };
      else if (evs.length === 0 && tks.length === 1) suggestion = { sel: `t:${tks[0].id}`, title: tks[0].title };
    }
    setLinkSuggestion(suggestion);
    // feladathoz kötött levélnél a feladat SZÜLŐ-eseményéből jön az időpont és a helyszín
    if (!ev && tk?.eventId) ev = (ctxEvents ?? []).find((e) => e.id === tk.eventId) ?? null;
    const ctx = {
      title: (target.task ? tk?.title : ev?.title || tk?.title) || '',
      when: ev ? (ev.when || fmtDay(ev.day)) : undefined,
      place: target.event ? (place || target.event.place) : ev?.place,
      due: tk ? (fmtDueHu(tk.dueDate) || tk.due) : undefined,
    };
    lastTopicRef.current = t;
    setActiveTopic(t);
    typedRef.current = false;
    // a sablonok többsége SZÓ SZERINTI [dátum]/[helyszín]/[határidő] mezőt tartalmaz
    // (nem ctx-hivatkozást) — ezeket itt töltjük ki a kapcsolt tétel adataival,
    // különben a kapcsolás láthatóan "nem csinál semmit"
    const fillCtx = (s: string) => {
      let out = s;
      if (ctx.when) out = out.split('[dátum]').join(ctx.when).split('[időpont]').join(ctx.when).split('[dátum, időpont]').join(ctx.when);
      else if (ctx.due) out = out.split('[dátum]').join(ctx.due);
      if (ctx.place) out = out.split('[helyszín]').join(ctx.place);
      if (ctx.due) out = out.split('[határidő]').join(ctx.due);
      return out;
    };
    setSubject(fillCtx(autoFill(t.subject(ctx))));
    let txt = fillCtx(autoFill(t.body(ctx)));
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
    const tipp = !linked && !target.event && !target.task && ((ctxEvents?.length ?? 0) + (ctxTasks?.length ?? 0)) > 0
      ? (suggestion ? ` Javaslat: kapcsolható a(z) „${suggestion.title}" tételhez — a választó alatt egy gombbal rögzítheted.` : ' Nincs naptári találat: fent, a Kapcsolt naptári tételnél húzhatod be a dátumokat.') : '';
    setResult(`✓ Sablon betöltve: ${t.label}.${linked && !target.event && !target.task ? ` Kapcsolt naptári tétel: ${linked.title}${evStored ? ' (rögzített kapcsolat)' : ''}.` : ''}${tipp} Csak a maradék [szögletes] mezőt töltsd ki.`);
  };

  // ha a kapcsolt tétel változik (másikat választasz, vagy a naptárban átírják a
  // dátumát/helyszínét), a levél adatai frissülnek:
  // - érintetlen sablonnál a sablont újratöltjük a friss adatokkal;
  // - kézzel írt/módosított szövegnél SOHA nem írjuk felül a levelet, hanem csak a
  //   [szögletes] mezőket töltjük ki a kapcsolt tétel adataival (dátum, helyszín, határidő)
  const ctxDataKey = `${ctxSel}|${effEvent?.title ?? ''}|${effEvent?.when ?? ''}|${effEvent?.day ?? ''}|${effEvent?.place ?? ''}|${effTask?.title ?? ''}|${effTask?.due ?? ''}|${effTask?.dueDate ?? ''}`;
  const ctxKeyRef = useRef(ctxDataKey);
  useEffect(() => {
    if (ctxKeyRef.current === ctxDataKey) return;
    ctxKeyRef.current = ctxDataKey;
    const linked = effEvent ?? effTask;
    if (!linked) return;
    if (lastTopicRef.current && !typedRef.current) { applyTopic(lastTopicRef.current); return; }
    const ev = effEvent ?? ((effTask?.eventId ? (ctxEvents ?? []).find((e) => e.id === effTask.eventId) : null) ?? null);
    const when = ev ? (ev.when || fmtDay(ev.day)) : '';
    const placeVal = ev?.place ?? '';
    const dueVal = effTask ? (fmtDueHu(effTask.dueDate) || effTask.due || '') : '';
    const fill = (s: string) => {
      let out = s;
      if (when) out = out.split('[dátum]').join(when).split('[időpont]').join(when).split('[dátum, időpont]').join(when);
      if (placeVal) out = out.split('[helyszín]').join(placeVal);
      if (dueVal) out = out.split('[határidő]').join(dueVal);
      if (effEvent) out = out.split('[esemény]').join(effEvent.title);
      return out;
    };
    const nb = fill(body);
    const ns = fill(subject);
    if (nb !== body || ns !== subject) {
      setBody(nb); setSubject(ns); setBodyDirty(true);
      setResult(`✓ Kapcsolt tétel: ${linked.title} — a [dátum] / [helyszín] / [határidő] mezők kitöltve a naptári adatokkal.`);
    } else {
      setResult(`✓ Kapcsolt tétel: ${linked.title}. (Nem volt kitölthető [szögletes] mező a szövegben.)`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxDataKey]);

  // KITÖLTŐ-PANEL: a levélben maradt [szögletes] mezők listája — a jobb oldali kis
  // inputokba írt érték a tárgy ÉS a törzs MINDEN azonos mezőjébe beíródik
  const fillTokens = useMemo(() => {
    const re = /\[([^[\]\n]{1,40})\]/g;
    const found: string[] = [];
    for (const src of [subject, body]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) { if (!found.includes(m[0])) found.push(m[0]); }
    }
    return found;
  }, [subject, body]);
  const [fillVals, setFillVals] = useState<Record<string, string>>({});
  const applyFill = (tok: string) => {
    const v = (fillVals[tok] ?? '').trim();
    if (!v) return;
    setSubject((s) => s.split(tok).join(v));
    setBody((b) => b.split(tok).join(v));
    setBodyDirty(true);
    typedRef.current = true;
    setFillVals((f) => { const n = { ...f }; delete n[tok]; return n; });
  };

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
    lastTopicRef.current = null; // a hangnem-motorra váltás kilép a témasablon-módból
    setActiveTopic(null);
    typedRef.current = false;
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
  // státusz-szintű szűrés a névsorban (főállású / óraadó / h-szervező stb.)
  const [statusFilter, setStatusFilter] = useState('');
  const statusSets = useMemo<Record<string, Set<string>>>(() => ({
    'T:főállású': new Set(teacherStatusNames(db, 'főállású')),
    'T:óraadó': new Set(teacherStatusNames(db, 'óraadó')),
    'T:volt/külsős': new Set(formerTeacherNames(teacherNames, db)),
    'H:szervező': new Set(studentStatusNames(db, 'szervező')),
    'H:nagykövet': new Set(studentStatusNames(db, 'nagykövet')),
    'H:képviselő': new Set(studentStatusNames(db, 'képviselő')),
    'H:demonstrátor': new Set(studentStatusNames(db, 'demonstrátor')),
    ...Object.fromEntries(studentCohorts(db).map((c) => [`H:${c}`, new Set(cohortNames(db, c))])),
  }), [teacherNames, db]);

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
      loadedLetterRef.current = target.preload.letterId ?? null;
      setTab('text'); // kész tartalommal a szöveg-fül a lényeg
      return;
    }
    if (!target.topicId) return;
    const t = TOPIC_TEMPLATES.find((x) => x.id === target.topicId);
    if (t) { applyTopic(t); setTab('text'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!topicReq) return;
    if (typedRef.current && !confirm('A kézi módosításaid elvesznek. Betöltsem az új sablont?')) return;
    applyTopic(topicReq.t);
    setTab('text');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicReq]);
  useEffect(() => {
    if (letterReq) { loadLetter(letterReq.l); setTab('text'); }
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
      status: 'draft',
    });
    setResult('✓ Levél elmentve vázlatként, lent a listában');
  };

  const loadLetter = (l: Letter) => {
    setSubject(l.subject); setBody(l.body); setSelected(l.names.filter((n) => !n.includes('@'))); setAdhoc(l.names.filter((n) => n.includes('@')));
    setBodyDirty(true); // a betöltött (kész) levelet a sablon-chipek ne írhassák felül rákérdezés nélkül
    lastTopicRef.current = null; // kész levél: a kapcsolt tétel változása ne írja át
    setActiveTopic(null);
    typedRef.current = true;
    loadedLetterRef.current = l.id; // küldéskor ezt jelöljük kiküldöttre
    setTab('text');
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
      if (j.ok) {
        // a küldés automatikusan bekerül a levél-történetbe kiküldöttként:
        // betöltött mentett levélnél átjelöljük, különben új bejegyzés készül
        if (loadedLetterRef.current && onLetterStatus) {
          onLetterStatus(loadedLetterRef.current, 'sent');
        } else {
          const id = `l-${Date.now().toString(36)}`;
          onSaveLetter({ id, createdAt: new Date().toISOString(), targetType: target.targetType, targetId: target.targetId, subject: subject.trim(), body, names: [...selected, ...adhoc], status: 'sent' });
          loadedLetterRef.current = id;
        }
        setResult(`✓ Elküldve ${j.sent} címzettnek — a levél kiküldöttként mentve.`);
      } else setResult(`Hiba: ${j.error || 'küldés sikertelen'}`);
    } catch (e) { setResult(`Hiba: ${String(e)}`); }
    setSending(false);
  };

  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');

  // ugyanaz a szerkesztő fut modálként (feladat/esemény ✉) és beágyazva (Levelek nézet);
  // a tartalom füleken oszlik el, felül állandó összegző sorral
  const NM_TABS: TabDef[] = [
    { id: 'to', label: 'Címzettek', cls: 'c-blue' },
    { id: 'about', label: 'Tartalom', cls: 'c-yellow' },
    { id: 'text', label: 'Szöveg és küldés', cls: 'c-green' },
    { id: 'saved', label: `Mentett (${letters.length})`, cls: 'c-purple' },
  ];
  const kindLabel = LETTER_KINDS.find((k) => k.id === kind)?.label ?? '';
  const content = (
    <>
        {/* az összegző chipsor megszűnt (felhasználói kérés: csak helyet foglalt);
            a hiányzó email-címekre a Címzettek fül maga figyelmeztet */}
        <ModalTabs tabs={NM_TABS} active={tab} onPick={setTab} />
        <div className="pm-body nm-body">
          {tab === 'to' && (<>
          <div className="f-sec c-blue">1 · Kinek megy a levél?</div>
          <div className="field full">
            <label>A levél feladója (neki egy gombbal válaszolhatsz)</label>
            {src ? (
              <div className="nm-groups">
                <span className="chip is-on" title={src.email}>✉ {src.name || src.email}</span>
                <button type="button" className="chip" title="Csak a feladó lesz a címzett, és Válasz-sablon készül (Re: az eredeti tárggyal)"
                  onClick={() => { setSelected([]); setAdhoc([src.email]); if (confirmIfDirty()) { regenerate('valasz'); setTab('text'); } }}>↩ Válasz a feladónak</button>
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
                  onClick={() => { if (!src) return; setSelected([]); setAdhoc([src.email]); if (confirmIfDirty()) { regenerate('valasz'); setTab('text'); } }}>↩ A feladónak</button>
                <button type="button" className="crx c-blue" title="A kártya felelőse és résztvevői"
                  onClick={() => { setSelected([...new Set(target.names)]); setAdhoc([]); }}>Résztvevők</button>
                {([
                  { label: 'Aktuális oktatók', names: teacherNames, hint: 'A tantervben szereplő jelenlegi oktatói kar' },
                  { label: 'Főállású oktatók', names: teacherStatusNames(db, 'főállású'), hint: 'A Névjegyzékben főállásúra címkézett oktatók' },
                  { label: 'Óraadók', names: teacherStatusNames(db, 'óraadó'), hint: 'A Névjegyzékben óraadóra címkézett oktatók' },
                  { label: 'Volt / külsős oktatók', names: formerTeacherNames(teacherNames, db), hint: 'A Névjegyzékben volt/külsősre címkézett oktató-kontaktok' },
                  { label: 'Minden hallgató', names: db.students.map((p) => p.name), hint: 'A teljes hallgatói lista' },
                  { label: 'Hallgatói szervezők (mind)', names: studentOrganizerNames(db), hint: 'Szervező + nagykövet + képviselő státuszú hallgatók együtt' },
                  { label: 'H · szervezők', names: studentStatusNames(db, 'szervező'), hint: 'Szervező státuszú hallgatók' },
                  { label: 'H · nagykövetek', names: studentStatusNames(db, 'nagykövet'), hint: 'Nagykövet státuszú hallgatók' },
                  { label: 'H · képviselők', names: studentStatusNames(db, 'képviselő'), hint: 'Képviselő státuszú hallgatók' },
                  { label: 'H · demonstrátorok', names: studentStatusNames(db, 'demonstrátor'), hint: 'Demonstrátor státuszú hallgatók' },
                  ...studentCohorts(db).map((c) => ({ label: `${c} évf.`, names: cohortNames(db, c), hint: `A(z) ${c} évfolyam hallgatói` })),
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
                    onClick={() => { setStatusFilter(''); setKindFilter((v) => (v === k ? '' : k)); }}>
                    <span className={`pb ${k.toLowerCase()}`}>{k}</span>{KIND_LABEL[k]}
                  </button>
                ))}
                {Object.keys(statusSets).map((id) => (
                  <button key={id} type="button" aria-pressed={statusFilter === id}
                    className={`chip${statusFilter === id ? ' is-on' : ''}`} disabled={!statusSets[id].size}
                    title={statusSets[id].size ? `${statusSets[id].size} név` : 'Még senki nincs ilyen státuszra címkézve a Névjegyzékben'}
                    onClick={() => { setKindFilter(''); setStatusFilter((v) => (v === id ? '' : id)); }}>
                    <span className={`pb ${id[0].toLowerCase()}`}>{id[0]}</span>{id.slice(2)}
                  </button>
                ))}
              </div>
            </div>
            {/* a kiválasztottak MINDIG látszanak; a teljes névfal csak keresésre / megnyitott listára */}
            <div className="pp-selrow">
              <span className="pp-selcount">{selected.length + adhoc.length || 'Nincs'} címzett</span>
              {adhoc.map((e) => (
                <button key={e} type="button" className="chip is-on pp-selchip" title="Egyedi email-címzett — kattints a levételhez" onClick={() => setAdhoc((a) => a.filter((x) => x !== e))}>@ {e}<span className="pp-x">✕</span></button>
              ))}
              {selected.map((n) => {
                const k = roster.find((r) => r.name === n)?.kind ?? null;
                return (
                  <button key={n} type="button" className="chip is-on pp-selchip" title="Kattints az eltávolításhoz" onClick={() => toggle(n)}>
                    {k && <span className={`pb ${k.toLowerCase()}`}>{k}</span>}{n}<span className="pp-x">✕</span>
                  </button>
                );
              })}
            </div>
            <input className="nm-search" value={rq} onChange={(e) => setRq(e.target.value)} placeholder="Keress névre a hozzáadáshoz…" />
            {kindFilter || statusFilter || rq.trim() ? (
              <div className="cat-picker pp-picker pp-scroll">
                {roster
                  .filter((r) => (!kindFilter || r.kind === kindFilter)
                    && (!statusFilter || statusSets[statusFilter]?.has(r.name))
                    && (!rq.trim() || norm(r.name).includes(norm(rq))))
                  .map((r) => {
                    const on = selected.includes(r.name);
                    const has = !!emailOf(db, r.name);
                    return (
                      <button key={`${r.kind}-${r.name}`} type="button" aria-pressed={on} className={`chip${on ? ' is-on' : ''}${on && !has ? ' nm-noemail' : ''}`}
                        title={has ? (emailOf(db, r.name) as string) : 'nincs email-cím, a Névjegyzékben add meg'}
                        onClick={() => { if (!on && rq.trim()) setRq(''); toggle(r.name); }}>
                        <span className={`pb ${r.kind.toLowerCase()}`}>{r.kind}</span>{r.name}{on && !has ? ' ⚠' : ''}
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="pp-nohit">A teljes névfal nem jelenik meg magától — keress névre, vagy nyisd meg fent az egyik listát (Tanár, Hallgató, státusz…).</div>
            )}
            {missing.length > 0 && <div className="nm-missing">⚠ Nincs email-címük (kimaradnak): {missing.join(', ')}. A ☎ Névjegyzékben pótolható.</div>}
          </div>
          </>)}
          {tab === 'about' && (<>
          <div className="f-sec c-green">2 · Miről szóljon?</div>
          {!target.event && !target.task && ((ctxEvents?.length ?? 0) + (ctxTasks?.length ?? 0)) > 0 && (
            <div className="field full">
              <label>Kapcsolt naptári tétel (a dátum, helyszín, határidő innen töltődik a sablonba)</label>
              <select value={ctxSel} onChange={(e) => { setCtxSel(e.target.value); if (activeTopic) onLinkTopic?.(activeTopic.id, e.target.value || null); }}>
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
                      <option key={t.id} value={`t:${t.id}`}>{t.title}{t.due || t.dueDate ? ` · ${fmtDueHu(t.dueDate) || t.due}` : ''}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {linkSuggestion && !ctxSel && (
                <div className="nm-groups">
                  <button type="button" className="chip" title="A javasolt naptári tétel rögzítése ehhez a sablonhoz (azonosító szerint, véglegesen)"
                    onClick={() => { setCtxSel(linkSuggestion.sel); if (activeTopic) onLinkTopic?.(activeTopic.id, linkSuggestion.sel); setLinkSuggestion(null); }}>
                    ⚲ Javaslat: {linkSuggestion.title} — kapcsolás
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="field full">
            <label>Sablon (ugyanarra újra koppintva új megfogalmazás)</label>
            <div className="chipradio">
              {LETTER_KINDS.map((k) => (
                <button type="button" key={k.id} aria-pressed={kind === k.id} className={`crx c-blue${kind === k.id ? ' is-on' : ''}`} onClick={() => { if (confirmIfDirty()) { regenerate(k.id); setTab('text'); } }}>{k.label}</button>
              ))}
            </div>
          </div>
          <div className="field full">
            <label>Vagy témasablon a tavalyi leveleid mintáiból (a [szögletes] mezőket töltsd ki)</label>
            <select value={activeTopic?.id ?? ''} onChange={(e) => {
              const t = TOPIC_TEMPLATES.find((x) => x.id === e.target.value);
              if (!t) return;
              if (typedRef.current && !confirm('A kézi módosításaid elvesznek. Betöltsem az új sablont?')) return;
              applyTopic(t);
              setTab('text');
            }}>
              <option value="">{activeTopic ? 'Sablon nélkül (hangnem-motor)' : 'Válassz témasablont…'}</option>
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
          </>)}
          {tab === 'text' && (<>
          <div className="f-sec">3 · A levél szövege és küldése</div>
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="nm-msgrow">
            <div className="nm-side">
              {/* kitöltő-panel: a levélben maradt [szögletes] mezők kis inputokkal tölthetők */}
              {fillTokens.length > 0 && (
                <div className="field full nm-fill">
                  <label>Kitöltendő mezők ({fillTokens.length}) — Enter vagy ✓: mindenhova beíródik</label>
                  {fillTokens.map((tok) => (
                    <div key={tok} className="nm-fillrow">
                      <span className="t" title={tok}>{tok.slice(1, -1)}</span>
                      <input value={fillVals[tok] ?? ''} placeholder="érték…"
                        onChange={(e) => setFillVals((f) => ({ ...f, [tok]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyFill(tok); } }} />
                      <button type="button" className="btn nm-fillgo" disabled={!(fillVals[tok] ?? '').trim()}
                        title="Beírás a levél minden azonos mezőjébe" onClick={() => applyFill(tok)}>✓</button>
                    </div>
                  ))}
                </div>
              )}
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
                          <button key={t.id} type="button" className={`nm-titem${activeTopic?.id === t.id ? ' is-on' : ''}`} title={`Tárgy: ${t.subject({ title: '', when: null, place: null, due: null })}`}
                            onClick={() => { if (typedRef.current && !confirm('A kézi módosításaid elvesznek. Betöltsem az új sablont?')) return; applyTopic(t); }}>{t.label}</button>
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
                <button type="button" className="nm-reroll-big"
                  title={activeTopic ? `A betöltött témasablon (${activeTopic.label}) újratöltése friss adatokkal — a kézi módosításokra rákérdez` : 'Teljes újrafogalmazás: tárgy + minden mondat újragenerálódik, az adatok (időpont, helyszín) maradnak'}
                  onClick={() => {
                    if (activeTopic) {
                      if (typedRef.current && !confirm('A kézi módosításaid elvesznek. Újratöltsem a témasablont?')) return;
                      applyTopic(activeTopic);
                    } else if (confirmIfDirty()) regenerate(kind);
                  }}>{activeTopic ? '↻ Sablon újratöltése' : '🎲 Átfogalmaz'}</button>
                <button type="button" className="nm-bodytoggle" title="Csak a megszólítást és az elköszönést cseréli, a törzsszöveg marad" onClick={() => setBody((b) => rerollLetter(b))}>↺ Megszólítás és zárás</button>
                <button type="button" className="nm-bodytoggle" title="A tartalom és minden adat változatlan marad, csak néhány fordulat megfogalmazása cserélődik; az egyes/többes szám nem sérül"
                  onClick={() => {
                    const idx = body.indexOf(SIGNATURE_SEPARATOR);
                    const head = idx >= 0 ? body.slice(0, idx) : body;
                    const tail = idx >= 0 ? body.slice(idx) : '';
                    const r = paraphrase(head);
                    if (!r.changed) { setResult('Ebben a szövegben most nincs cserélhető fordulat.'); return; }
                    setBody(r.text + tail);
                    setBodyDirty(true);
                    setResult(`✓ ${r.changed} fordulat átfogalmazva; a tartalom és az adatok változatlanok.`);
                  }}>≈ Finom átfogalmazás</button>
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
          </>)}
          {tab === 'saved' && (
            <div className="field full">
              <label>Mentett levelek ehhez a tételhez ({letters.length})</label>
              {letters.length === 0 && <div className="pp-nohit">Még nincs mentett levél — a kész vázlatot a 💾 gombbal mentheted el.</div>}
              <div className="nm-letters">
                {letters.map((l) => {
                  const st = l.status ?? 'draft';
                  return (
                    <div key={l.id} className="nm-letter">
                      <button className="nm-letter-load" onClick={() => loadLetter(l)} title="Betöltés">
                        <span className="s">{l.subject}</span>
                        <span className="d">{fmtDate(l.createdAt)} · {l.names.length} címzett</span>
                      </button>
                      {onLetterStatus && (
                        <button type="button" className={`mt-lst ${st}`}
                          title={st === 'sent' ? 'Kiküldve — kattints, ha mégis vázlat' : 'Vázlat — kattints, ha már kiküldted (pl. Outlookból)'}
                          onClick={() => onLetterStatus(l.id, st === 'sent' ? 'draft' : 'sent')}>
                          {st === 'sent' ? '✓ Kiküldve' : '✎ Vázlat'}
                        </button>
                      )}
                      <button className="btn btn--danger pm-del" title="Levél törlése" onClick={() => onDeleteLetter(l.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {result && <div aria-live="polite" className={`nm-result${result.startsWith('✓') ? ' ok' : ' err'}`}>{result}</div>}
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
      <div className="modal modal--wide modal--tabs" role="dialog" aria-modal="true" aria-label="Levél készítése">
        <h3>✉ Levél készítése{target.event ? ` · ${target.event.title}` : target.task ? ` · ${target.task.title}` : ''}</h3>
        {content}
      </div>
    </div>
  );
}
