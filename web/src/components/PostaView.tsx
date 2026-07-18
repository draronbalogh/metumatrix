'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Agenda, AgendaSource, Letter, ReplyDraft, ThreadMsg, addDaysYmd, addWorkdaysYmd, draftsStale, dueTs, duePrecise, fmtDayHu, fmtDueHu, nextMondayYmd, tomorrowYmd, withOutEntry } from '@/data/agenda';
import { SenderRule, SENDER_RULE_LABEL } from '@/data/people';
import { parseStyleBank, replyVariants, StyleBank } from '@/lib/replies';
import { editHeaders } from '@/lib/editkey';
import PageHead from './PageHead';

// POSTA: az Outlook-szinkron által rögzített bejövő levelek, állapotgéppel.
// Stabil sávok fix sorrendben (egy kártya pontosan EGY sávban, a többi tulajdonság
// jelvény): Visszatért → Határidős → Válaszra vár → Rájuk várok. A halasztottak
// rejtve (lenyitható), a lezártak külön szekcióban, újranyitással. Minden verdikt
// egy koppintás + visszavonási sáv. A Titkárnő egy TÖBBLÉPÉSES nézet (wizard):
// levelenként egyesével -> felolvasás (böngésző INGYENES speechSynthesis, hu-HU),
// a kurzor magától a válaszmezőbe kerül, oda a felhasználó a nyers döntését írja/
// diktálja (rendszer-szintű diktáló, pl. Wispr Flow), majd a helyi claude a stílus +
// a bot-tervek regisztere szerint VÉGLEGES levelet fogalmaz belőle, végül döntés ->
// következő. A Sorban mód (minden terv lenyitva) változatlan; új feladónál egyszeri
// szabály-döntés (Screener-minta).

interface Row {
  sel: string;               // 't:id' / 'e:id'
  title: string;             // a kapcsolt kártya címe
  src: AgendaSource;
  drafts: ReplyDraft[];      // bot-tervek, vagy gyors tartalék a kártya adataiból
  botMade: boolean;
  dueKey: number | null;     // hatásos határidő (feladat dueDate / kapcsolt esemény napja)
  dueStr: string | null;     // ugyanez kijelezve
  duePrec: boolean;          // nap-pontos-e (csak az mehet a 48 órás sávba)
  eventDay: string | null;   // kapcsolt esemény napja - az „esemény előtt" halasztáshoz
}

interface Props {
  agenda: Agenda;
  footer: string;            // aláírás-blokk a másoláshoz (a levélíró is ezt teszi a levél aljára)
  senderRules: Record<string, SenderRule>;
  onSenderRule: (email: string, rule: SenderRule) => void;
  onReply: (sel: string, draft: ReplyDraft, drafts: ReplyDraft[]) => void;
  onState: (sel: string, patch: Partial<AgendaSource>, label: string) => void;
  undo: { label: string } | null;
  onUndo: () => void;
  onOpenCard: (sel: string) => void;
  onSaveLetter?: (l: Letter) => void;   // a titkárnő végleges levele draftként tárolódik
  onDeleteLetter?: (id: string) => void; // újrafogalmazásnál a régi példány cserélődik
}

const fmtD = (d?: string | null): string => (d && d.length >= 10 ? `${d.slice(5, 7)}. ${Number(d.slice(8, 10))}.` : '');
const ymdTs = (d?: string | null): number | null =>
  d && d.length >= 10 ? new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime() : null;

const DAY = 86400000;

export default function PostaView({ agenda, footer, senderRules, onSenderRule, onReply, onState, undo, onUndo, onOpenCard, onSaveLetter, onDeleteLetter }: Props) {
  const [bank, setBank] = useState<StyleBank | null>(null);
  useEffect(() => {
    fetch('/api/style', { headers: editHeaders() }).then((r) => r.json())
      .then((j) => setBank(parseStyleBank(j?.text ?? null)))
      .catch(() => setBank(parseStyleBank(null)));
  }, []);
  const [open, setOpen] = useState<string | null>(null); // melyik sor tervei vannak lenyitva
  const [copied, setCopied] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [showThread, setShowThread] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);          // Sorban mód: minden terv lenyitva
  const [decide, setDecide] = useState(false);            // Titkárnő-mód: tételenként egy döntés
  const [decideSkip, setDecideSkip] = useState<Set<string>>(new Set());
  // Titkárnő: hang vagy írás mód (null = mód-választó képernyő), lépés-gépezet,
  // a nyers döntés + a belőle megfogalmazott végleges terv tételenként
  const [titkarMode, setTitkarMode] = useState<'voice' | 'write' | null>(null);
  const [lastMode] = useState<string | null>(() => { try { return localStorage.getItem('md-titkar-mode'); } catch { return null; } });
  const [wizStep, setWizStep] = useState<'letter' | 'answer' | 'final'>('letter');
  const [dict, setDict] = useState('');
  const [pendingQ, setPendingQ] = useState<string | null>(null); // a megfogalmazó tisztázó kérdése
  const [qa, setQa] = useState('');                              // a kérdésre adott rövid válasz
  const [gen, setGen] = useState<Record<string, { draft: ReplyDraft; letterId: string | null }>>({});
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProg, setBatchProg] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakKind, setSpeakKind] = useState<'short' | 'full' | null>(null); // melyik gomb szól épp
  useEffect(() => { if (!speaking) setSpeakKind(null); }, [speaking]);
  const speakSeq = useRef(0); // elavult onend-ek kiszűrése (cancel is end-et lő Chrome-ban)
  const taRef = useRef<HTMLTextAreaElement | null>(null); // a wizard válaszmezője - ide fókuszálunk
  useEffect(() => () => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel(); }, []);

  const rows = useMemo<Row[]>(() => {
    const b = bank ?? parseStyleBank(null);
    const out: Row[] = [];
    agenda.tasks.forEach((t) => {
      if (!t.source?.email || t.source.shadow) return;
      const ev = t.eventId ? agenda.events.find((e) => e.id === t.eventId) : null;
      const due = t.dueDate ?? ev?.day ?? null;
      const bot = (t.source.replies ?? []).length > 0;
      out.push({
        sel: `t:${t.id}`, title: t.title, src: t.source, botMade: bot,
        drafts: bot ? (t.source.replies as ReplyDraft[]) : replyVariants(t.source, t, null, b),
        dueKey: dueTs(due), dueStr: due ? fmtDueHu(due) : null, duePrec: duePrecise(due),
        eventDay: ev?.day ?? null,
      });
    });
    agenda.events.forEach((e) => {
      if (!e.source?.email || e.source.shadow) return;
      const due = e.day ?? e.sort ?? null;
      const bot = (e.source.replies ?? []).length > 0;
      out.push({
        sel: `e:${e.id}`, title: e.title, src: e.source, botMade: bot,
        drafts: bot ? (e.source.replies as ReplyDraft[]) : replyVariants(e.source, null, e, b),
        dueKey: dueTs(due), dueStr: due ? fmtDueHu(due) : null, duePrec: duePrecise(due),
        eventDay: e.day ?? null,
      });
    });
    return out;
  }, [agenda, bank]);

  // sáv-besorolás: egy kártya pontosan egy sávban - Visszatért > Határidős > Válaszra vár
  const now = Date.now();
  const lanes = useMemo(() => {
    const st = (r: Row) => r.src.status ?? 'pending';
    const pending = rows.filter((r) => st(r) === 'pending');
    const returned = pending.filter((r) => r.src.returned);
    const rest = pending.filter((r) => !r.src.returned);
    const deadline = rest.filter((r) => r.dueKey !== null && r.dueKey <= now + 7 * DAY)
      .sort((a, b) => (a.dueKey ?? 0) - (b.dueKey ?? 0));
    const deadlineSet = new Set(deadline.map((r) => r.sel));
    const waitKey = (r: Row) => ymdTs(r.src.waitingSince ?? r.src.date) ?? Number.MAX_SAFE_INTEGER;
    const awaiting = rest.filter((r) => !deadlineSet.has(r.sel)).sort((a, b) => waitKey(a) - waitKey(b));
    return {
      returned: returned.sort((a, b) => (b.src.returned ?? '').localeCompare(a.src.returned ?? '')),
      deadline,
      awaiting,
      waiting: rows.filter((r) => st(r) === 'waiting').sort((a, b) => (a.src.followUpAt ?? '').localeCompare(b.src.followUpAt ?? '')),
      snoozed: rows.filter((r) => st(r) === 'snoozed').sort((a, b) => (a.src.snoozeUntil ?? '').localeCompare(b.src.snoozeUntil ?? '')),
      drafted: rows.filter((r) => st(r) === 'drafted').sort((a, b) => (a.src.date ?? '').localeCompare(b.src.date ?? '')),
      closed: rows.filter((r) => st(r) === 'replied' || st(r) === 'noreply')
        .sort((a, b) => (b.src.repliedAt ?? b.src.date ?? '').localeCompare(a.src.repliedAt ?? a.src.date ?? '')),
    };
  }, [rows, now]);

  // kártya-sel → a hozzá mentett LEGUTÓBBI draft levél (a másolható blokk ebből másol)
  const draftBySel = useMemo(() => {
    const m = new Map<string, Letter>();
    (agenda.letters || []).forEach((l) => {
      if (!l.targetType || !l.targetId || (l.status ?? 'draft') !== 'draft') return;
      const key = `${l.targetType === 'task' ? 't' : 'e'}:${l.targetId}`;
      const prev = m.get(key);
      if (!prev || (l.createdAt ?? '') > (prev.createdAt ?? '')) m.set(key, l);
    });
    return m;
  }, [agenda]);
  const draftLetters = useMemo(() => new Set(draftBySel.keys()), [draftBySel]);
  const [showDrafted, setShowDrafted] = useState(true); // a másolható blokk alapból NYITVA (aktív teendő)
  // Outlook-vázlatok készítése a klasszikus Outlookon át (COM), a nem-emelt dev-szerverről
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const pushDrafts = async () => {
    if (pushBusy) return;
    setPushBusy(true); setPushMsg('Vázlatok készítése az Outlookban… (pár másodperc)');
    try {
      const r = await fetch('/api/outlook-drafts', { method: 'POST', headers: editHeaders() });
      const j = await r.json() as { ok: boolean; made: number | null; skipped: number | null; comError: boolean; output?: string };
      if (j.comError) setPushMsg('⚠ A klasszikus Outlook nem elérhető COM-on. Nyisd meg a klasszikus Outlookot (Go to classic Outlook), és próbáld újra.');
      else if (!j.ok) setPushMsg('⚠ A vázlatkészítés hibába futott. Nézd meg az automation/logs/drafts.log fájlt.');
      else setPushMsg(`✓ Kész: ${j.made ?? 0} új piszkozat az Outlook Piszkozatok mappájában${j.skipped ? ` (${j.skipped} már megvolt)` : ''}. Küldés nem történt - nézd át és küldd el az Outlookban, majd itt jelöld „Elküldtem".`);
    } catch {
      setPushMsg('⚠ Nem sikerült elindítani a vázlatkészítést (fut a dev-szerver és a klasszikus Outlook?).');
    } finally { setPushBusy(false); }
  };
  const pendingAll = useMemo(() => [...lanes.returned, ...lanes.deadline, ...lanes.awaiting], [lanes]);
  const urgent = lanes.deadline.filter((r) => r.duePrec && r.dueKey !== null && r.dueKey <= now + 2 * DAY).length;
  // gyűjtő-mód: akihez már van NYERS jegyzet, az kikerül a wizard-sorból (kötegelt megfogalmazásra vár)
  const noted = useMemo(() => pendingAll.filter((r) => (r.src.rawReply ?? '').trim()), [pendingAll]);
  const decideQueue = pendingAll.filter((r) => !decideSkip.has(r.sel) && !(r.src.rawReply ?? '').trim());
  // a wizard aktuális tétele - tételváltáskor minden lépés-állapot nullázódik,
  // és az 1/3 (levél) képernyő jön (ha már van kész terv, egyből a 3/3)
  const curSel = decide ? (decideQueue[0]?.sel ?? null) : null;
  useEffect(() => {
    if (!curSel) return;
    setDict(''); setQa(''); setPendingQ(null); setGenErr(null);
    setWizStep(gen[curSel] ? 'final' : 'letter');
  }, [curSel]); // eslint-disable-line react-hooks/exhaustive-deps
  // a válasz-lépésre érve a kurzor magától a mezőbe kerül (Wispr Flow ide diktál)
  useEffect(() => {
    if (!decide || wizStep !== 'answer') return;
    const id = window.setTimeout(() => taRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [decide, wizStep, curSel]);

  const logChoice = (sel: string, label: string) => {
    fetch('/api/replylog', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
      body: JSON.stringify({ at: new Date().toISOString(), sel, label, action: 'copy' }),
    }).catch(() => { /* a napló nem kritikus */ });
  };

  // a levél zárása („Köszönöm/Üdvözlettel, Áron") már a törzsben van; a titulusos
  // aláírás alapból KI (azt az Outlook adja), csak akkor kerül a végére, ha a footer nem üres
  const withFooter = (b: string): string => (footer.trim() ? `${b}\n\n${footer}` : b);
  const copyDraft = async (key: string, sel: string, d: ReplyDraft) => {
    try {
      await navigator.clipboard.writeText(withFooter(d.body));
      setCopied(key);
      logChoice(sel, d.label);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch { /* http vagy régi böngésző - a levélíróból másolható */ }
  };
  // a másolható blokk: a mentett draft levél törzse a vágólapra
  const copyLetter = async (key: string, l: Letter) => {
    try {
      await navigator.clipboard.writeText(withFooter(l.body));
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch { /* ignore */ }
  };

  // beszéd-réteg (ingyenes böngésző-TTS, hu-HU) - a seq-számláló kiszűri a cancel
  // által kilőtt elavult onend-eket, így a kézi leállítás nem léptet tovább
  const speakText = (txt: string, onDone?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth) { onDone?.(); return; }
    const seq = ++speakSeq.current;
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'hu-HU';
    u.rate = 1.5; // a felhasználó kérése: másfeles tempó
    const hu = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hu'));
    if (hu) u.voice = hu;
    u.onend = () => { if (seq !== speakSeq.current) return; setSpeaking(false); onDone?.(); };
    u.onerror = () => { if (seq !== speakSeq.current) return; setSpeaking(false); onDone?.(); };
    synth.cancel(); synth.speak(u); setSpeaking(true);
  };
  const stopSpeak = () => { speakSeq.current++; window.speechSynthesis?.cancel(); setSpeaking(false); };
  // rövid felolvasás: CSAK a lényeg (feladó, tárgy, összegzés) - a szál külön gombra megy
  const letterText = (r: Row): string => [
    `${r.src.name} levele.`,
    r.src.subject ? `Tárgy: ${r.src.subject}.` : '',
    r.src.gist ? `Összefoglaló: ${r.src.gist}` : 'Ehhez a levélhez még nincs összefoglaló.',
  ].filter(Boolean).join(' ');
  // teljes szál: időrendben az ELSŐ levéltől, a végén az összegzéssel zárva
  const threadText = (r: Row): string => {
    const th = (r.src.thread ?? []).map((m) => `${m.dir === 'in' ? `${m.from} írta` : 'Válaszoltad'}: ${m.gist}.`);
    return [
      `${r.src.name} levélszála, ${th.length} üzenet, időrendben.`,
      ...th,
      r.src.gist ? `Összegzés: ${r.src.gist}` : '',
    ].filter(Boolean).join(' ');
  };
  // HANG mód: a levél-lépésre érve azonnal indul a felolvasás, a végén automatikus
  // továbblépés a válasz-lépésre (a jóváhagyott terv szerint)
  useEffect(() => {
    if (!decide || titkarMode !== 'voice' || wizStep !== 'letter' || !curSel) return;
    const r = decideQueue[0];
    if (!r) return;
    const id = window.setTimeout(() => { setSpeakKind('short'); speakText(letterText(r), () => setWizStep('answer')); }, 250);
    return () => { window.clearTimeout(id); stopSpeak(); };
  }, [decide, titkarMode, wizStep, curSel]); // eslint-disable-line react-hooks/exhaustive-deps

  // a nyers döntésből végleges terv: a /api/rephrase a helyi claude-dal fogalmaz.
  // Kétfázisú: az 1. körben a modell EGY tisztázó kérdést tehet fel (pendingQ),
  // a 2. kör a kérdés + válasz (vagy "nem tudom") birtokában mindig levelet ír.
  const generate = async (r: Row, answer?: string | null) => {
    if (!dict.trim() || genBusy) return;
    setGenBusy(true); setGenErr(null);
    try {
      const res = await fetch('/api/rephrase', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          senderName: r.src.name, senderEmail: r.src.email,
          subject: r.src.subject ?? null, gist: r.src.gist ?? null,
          thread: (r.src.thread ?? []).map((m) => `${m.at.slice(0, 10)} · ${m.dir === 'in' ? 'bejövő' : 'kimenő'} · ${m.from}: ${m.gist}`),
          drafts: r.drafts.map((d) => ({ label: d.label, subject: d.subject, body: d.body })),
          instruction: dict,
          askAllowed: answer === undefined && !pendingQ,
          question: answer !== undefined ? pendingQ : null,
          questionAnswer: answer === undefined ? null : answer,
        }),
      });
      const j = await res.json() as { ok: boolean; subject?: string; body?: string; question?: string; error?: string };
      if (!j.ok) throw new Error(j.error || `hiba (${res.status})`);
      if (j.question) {
        // tisztázó kérdés jött levél helyett - hang módban fel is olvassuk
        setPendingQ(j.question); setQa('');
        if (titkarMode === 'voice') speakText(`Kérdésem van: ${j.question}`);
        return;
      }
      if (!j.body) throw new Error('üres válasz érkezett');
      const draft: ReplyDraft = { label: 'A döntésed szerint', subject: j.subject ?? (r.src.subject ? `Re: ${r.src.subject}` : r.title), body: j.body };
      // tartós mentés: a végleges levél draftként a kártya leveleihez kerül -
      // reload után is megvan; újrafogalmazásnál a korábbi példány cserélődik
      let letterId: string | null = null;
      if (onSaveLetter) {
        const prev = gen[r.sel]?.letterId ?? null;
        letterId = `l-${Date.now().toString(36)}`;
        onSaveLetter({
          id: letterId, createdAt: new Date().toISOString(),
          targetType: r.sel.startsWith('t:') ? 'task' : 'event', targetId: r.sel.slice(2),
          subject: draft.subject, body: draft.body, names: [r.src.name], status: 'draft',
        });
        if (prev && onDeleteLetter) onDeleteLetter(prev);
      }
      setGen((g) => ({ ...g, [r.sel]: { draft, letterId } }));
      setPendingQ(null); setQa('');
      setWizStep('final');
      logChoice(r.sel, 'titkárnő-megfogalmazás');
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : String(e));
    } finally { setGenBusy(false); }
  };

  // GYŰJTŐ-MÓD: a nyers jegyzet mentése + továbblépés (megfogalmazás NÉLKÜL, azonnal).
  // A jegyzetelt kártya kikerül a wizard-sorból; a köteg a végén fogalmazza meg mind.
  const saveNote = (r: Row) => {
    const t = dict.trim();
    if (!t) return;
    onState(r.sel, { rawReply: t }, 'Jegyzet elmentve (kötegre vár)');
    setDict(''); setQa(''); setPendingQ(null);
  };
  // KÖTEGELT MEGFOGALMAZÁS: EGY hívás írja meg az ÖSSZES választ, így a stílusfájl csak
  // egyszer megy fel (nem levelenként). Az eredmények egyenként draftként mentődnek +
  // 'drafted' állapotba kerülnek. Egy várakozás az egész kötegre, nem tételenként.
  const generateAll = async () => {
    if (batchBusy || noted.length === 0) return;
    const items = [...noted];
    setBatchBusy(true); setGenErr(null);
    setBatchProg(`Fogalmazás… (${items.length} levél egyben, kb. fél-egy perc)`);
    try {
      const res = await fetch('/api/rephrase-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          items: items.map((r) => ({
            sel: r.sel, senderName: r.src.name, senderEmail: r.src.email,
            subject: r.src.subject ?? null, gist: r.src.gist ?? null,
            thread: (r.src.thread ?? []).map((m) => `${m.at.slice(0, 10)} · ${m.dir === 'in' ? 'bejövő' : 'kimenő'} · ${m.from}: ${m.gist}`),
            drafts: r.drafts.map((d) => ({ label: d.label, subject: d.subject, body: d.body })),
            instruction: r.src.rawReply,
          })),
        }),
      });
      const j = await res.json() as { ok: boolean; results?: { sel: string; subject: string; body: string }[]; error?: string; quota?: boolean };
      if (!j.ok || !j.results) {
        setBatchProg(`⚠ ${j.error ?? 'A megfogalmazás nem sikerült.'} A jegyzeteid megmaradtak - próbáld újra.`);
        setBatchBusy(false); return;
      }
      const bySel = new Map(items.map((r) => [r.sel, r]));
      let done = 0;
      j.results.forEach((out, i) => {
        const r = bySel.get(out.sel);
        if (!r || !out.body) return;
        const draft: ReplyDraft = { label: 'A döntésed szerint', subject: out.subject || (r.src.subject ? `Re: ${r.src.subject}` : r.title), body: out.body };
        if (onSaveLetter) onSaveLetter({ id: `l-${Date.now().toString(36)}-${i}`, createdAt: new Date().toISOString(), targetType: r.sel.startsWith('t:') ? 'task' : 'event', targetId: r.sel.slice(2), subject: draft.subject, body: draft.body, names: [r.src.name], status: 'draft' });
        onState(r.sel, { status: 'drafted', rawReply: null, returned: null }, 'Megfogalmazva (köteg)');
        logChoice(r.sel, 'titkárnő-köteg');
        done++;
      });
      const missed = items.length - done;
      setBatchProg(`Kész: ${done} megfogalmazva${missed > 0 ? `, ${missed} kimaradt (a jegyzetük megvan, nyomd újra)` : ''}. A „📋 Másolható válaszok" blokkban vannak.`);
    } catch {
      setBatchProg('⚠ Nem sikerült elindítani a megfogalmazást. A jegyzeteid megmaradtak - próbáld újra.');
    } finally { setBatchBusy(false); }
  };

  const nowIso = () => new Date().toISOString();
  const ageDays = (r: Row): number | null => {
    const t = ymdTs(r.src.waitingSince ?? r.src.date);
    return t === null ? null : Math.max(0, Math.floor((now - t) / DAY));
  };

  const renderRow = (r: Row, lane: 'returned' | 'deadline' | 'awaiting' | 'waiting', forceOpen = false) => {
    const isOpen = forceOpen || allOpen || open === r.sel;
    const warn = r.duePrec && r.dueKey !== null && r.dueKey <= now + 2 * DAY;
    const age = lane === 'awaiting' ? ageDays(r) : null;
    const evBefore = r.eventDay && r.eventDay > tomorrowYmd() ? addDaysYmd(r.eventDay, -1) : null;
    const stale = draftsStale(r.src);
    const noRule = !!r.src.email && !senderRules[r.src.email.trim().toLowerCase()];
    const thread = r.src.thread ?? [];
    return (
      <article key={r.sel} className={`po-row${isOpen ? ' is-open' : ''}`}>
        <button type="button" className="po-main" onClick={() => setOpen(isOpen && !forceOpen && !allOpen ? null : r.sel)} title={isOpen ? 'A választervek elrejtése' : 'A megírt választervek megjelenítése ehhez a levélhez'}>
          <span className="d">{fmtD(r.src.date) || '·'}</span>
          <span className="n">{r.src.name}</span>
          <span className="s">„{r.src.subject ?? r.title}"</span>
          {(r.src.cc?.length ?? 0) > 0 && <span className="cc" title={`A válasz a szál minden résztvevőjének megy: ${r.src.cc?.join(', ')}`}>👥 +{r.src.cc?.length}</span>}
          {r.dueStr && <span className={`po-badge${warn ? ' warn' : ''}`} title="A levélből készült feladat határideje">⚑ {r.dueStr}</span>}
          {age !== null && age >= 2 && <span className="po-badge" title={`A feladó ${age} napja vár válaszra`}>{age} napja</span>}
          {stale && <span className="po-badge warn" title="A tervek egy korábbi levélhez készültek - új bejövő érkezett azóta">elavult</span>}
          {draftLetters.has(r.sel) && <span className="po-badge" title="Van mentett kész válasz-vázlat ehhez a levélhez - a kártya Levelezés fülén (és a titkárnő 3/3 lépésén) találod">📝 kész válasz</span>}
          {lane === 'waiting' && r.src.followUpAt && <span className="po-badge" title="Ha eddig nem válaszolnak, a levél visszatér a Postába">követés: {fmtDayHu(r.src.followUpAt)}</span>}
          <span className="x">{isOpen ? 'bezár ▴' : lane === 'waiting' ? 'részletek ▾' : `✉ válaszok ▾`}</span>
        </button>
        {/* MIRE válaszolunk: a bot egy mondatos összefoglalója a levélről */}
        <div className="po-gist">{r.src.gist || 'A levél összefoglalója a következő szinkronnál készül el.'}
          {/* a levélből a szinkron feladat-/eseménykártyát készített - ez nyitja meg */}
          <button type="button" className="po-card"
            title={r.sel.startsWith('t:')
              ? 'A levélből készült FELADAT megnyitása: itt vannak a lépések, a határidő és a jegyzetek'
              : 'A levélhez tartozó ESEMÉNY megnyitása: időpont, helyszín, jegyzetek'}
            onClick={() => onOpenCard(r.sel)}>▤ {r.sel.startsWith('t:') ? 'Feladat' : 'Esemény'}: {r.title}</button>
        </div>
        {isOpen && (
          <div className="po-drafts">
            {thread.length > 0 && (
              <div className="po-thread">
                <button type="button" className="po-thread-h" onClick={() => setShowThread(showThread === r.sel ? null : r.sel)}>🧵 Szál ({thread.length}) {showThread === r.sel ? '▴' : '▾'}</button>
                {showThread === r.sel && thread.map((m: ThreadMsg, i: number) => (
                  <div key={i} className={`po-tmsg ${m.dir}`}>
                    <span className="d">{fmtD(m.at.slice(0, 10)) || m.at.slice(0, 10)}</span>
                    <span className="w" title={m.dir === 'in' ? 'bejövő' : 'a mi válaszunk'}>{m.dir === 'in' ? '⇣' : '⇡'}</span>
                    <span className="f">{m.from}:</span>
                    <span className="g">{m.gist}</span>
                  </div>
                ))}
              </div>
            )}
            {/* kinek megy a válasz - másolás előtt ellenőrizhető */}
            <div className="po-tocc">Címzett: <strong>{r.src.name}</strong> &lt;{r.src.email}&gt;{(r.src.cc?.length ?? 0) > 0 && <> · Másolat: {r.src.cc?.join(', ')}</>}</div>
            {r.src.draftMode === 'ping' && <div className="po-note">Követő tervek: a követési határidőig nem érkezett válasz - az alábbiak udvarias emlékeztetők.</div>}
            {stale && <div className="po-note">⚠ A tervek egy korábbi levélhez készültek, azóta új bejövő érkezett. A következő szinkron frissíti őket - a szál tartalmát ellenőrizd küldés előtt.</div>}
            {!r.botMade && lane !== 'waiting' && <div className="po-note">Gyors tervek a levélből készült feladat adataiból - a személyre szabott terveket a következő szinkron írja meg a levél teljes szövege alapján.</div>}
            {lane !== 'waiting' && r.drafts.map((d, i) => (
              <div key={i} className={`po-draft po-draft--${i}`}>
                <div className="po-draft-h">
                  <span className="l">{d.label}</span>
                  <span className="sp" />
                  <button type="button" className="btn" onClick={() => copyDraft(`${r.sel}-${i}`, r.sel, d)}>{copied === `${r.sel}-${i}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                  <button type="button" className="btn btn--ink" title="Megnyitás a levélíróban: címzettek és tárgy előtöltve, ott küldhető vagy finomítható" onClick={() => onReply(r.sel, d, r.drafts)}>✉ Levélíróba</button>
                </div>
                <div className="po-draft-b">{d.body}</div>
              </div>
            ))}
            {noRule && (
              <div className="po-screen">
                <span className="po-snlbl">Új feladó - szabály egyszer, mostantól érvényes:</span>
                <button type="button" className="btn" title="A leveleire mindig teljes válasz-csomag készül" onClick={() => onSenderRule(r.src.email, 'reply')}>{SENDER_RULE_LABEL.reply}</button>
                <button type="button" className="btn" title="A leveleiből lehet kártya, de nem kerülnek a Postába" onClick={() => { onSenderRule(r.src.email, 'fyi'); onState(r.sel, { status: 'noreply', returned: null }, 'Csak tájékoztat - lezárva'); }}>{SENDER_RULE_LABEL.fyi}</button>
                <button type="button" className="btn" title="A bot a leveleit teljesen átugorja" onClick={() => { onSenderRule(r.src.email, 'ignore'); onState(r.sel, { status: 'noreply', returned: null }, 'Mellőzendő - lezárva'); }}>{SENDER_RULE_LABEL.ignore}</button>
              </div>
            )}
            <div className="po-actrow">
              {lane !== 'waiting' ? (
                <>
                  <button type="button" className="btn" title="Megválaszoltnak jelölés (pl. ha Outlookból már elment a válasz)" onClick={() => { setOpen(null); onState(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'megválaszolva (kézi jelölés)') }, 'Megválaszolva'); }}>✓ Megválaszolva</button>
                  <button type="button" className="btn" title="Megválaszolva + követés: ha 5 munkanapon belül nem jön válasz, a levél visszatér a Postába" onClick={() => { setOpen(null); onState(r.sel, { status: 'waiting', repliedAt: nowIso(), followUpAt: addWorkdaysYmd(5), returned: null, thread: withOutEntry(r.src, 'megválaszolva, követés bekapcsolva') }, 'Megválaszolva + követés'); }}>✓⏳ Válasz + követés</button>
                  <button type="button" className="btn" title="Lezárás válasz nélkül - ha mégis jön új levél a szálban, magától újranyílik" onClick={() => { setOpen(null); onState(r.sel, { status: 'noreply', returned: null }, 'Lezárva (nem kell válasz)'); }}>✕ Nem kell válasz</button>
                  <span className="sp" />
                  <span className="po-snlbl">💤 Halasztás:</span>
                  <button type="button" className="btn" onClick={() => { setOpen(null); onState(r.sel, { status: 'snoozed', snoozeUntil: tomorrowYmd(), returned: null }, 'Halasztva holnapig'); }}>holnap</button>
                  <button type="button" className="btn" onClick={() => { setOpen(null); onState(r.sel, { status: 'snoozed', snoozeUntil: nextMondayYmd(), returned: null }, 'Halasztva hétfőig'); }}>hétfő</button>
                  {evBefore && <button type="button" className="btn" title={`Visszatér ${fmtDayHu(evBefore)} (a kapcsolt esemény előtti nap)`} onClick={() => { setOpen(null); onState(r.sel, { status: 'snoozed', snoozeUntil: evBefore, returned: null }, 'Halasztva az esemény előttig'); }}>esemény előtt</button>}
                </>
              ) : (
                <>
                  <button type="button" className="btn" title="Vissza a válaszra várók közé (pl. mégis nekem kell lépnem)" onClick={() => { setOpen(null); onState(r.sel, { status: 'pending', followUpAt: null }, 'Vissza a Postába'); }}>↩ Vissza a Postába</button>
                  <button type="button" className="btn" title="Lezárás - nem várunk tovább a válaszukra" onClick={() => { setOpen(null); onState(r.sel, { status: 'noreply', followUpAt: null, returned: null }, 'Lezárva'); }}>✕ Lezárás</button>
                </>
              )}
            </div>
          </div>
        )}
      </article>
    );
  };

  const lane = (title: string, hint: string, items: Row[], kind: 'returned' | 'deadline' | 'awaiting' | 'waiting') =>
    items.length > 0 && (
      <section className={`po-lane po-lane--${kind}`} key={kind}>
        <h3 className="po-lane-h"><span className="dot" />{title} <span className="c">{items.length}</span><span className="hint">{hint}</span></h3>
        {items.map((r) => renderRow(r, kind))}
      </section>
    );

  // TITKÁRNŐ-WIZARD: egyszerre EGY levél, lépésről lépésre. A döntés (megválaszolva /
  // halasztás / lezárás) kiveszi a tételt a sorból, így a következő magától előrelép.
  const advance = (sel: string, patch: Partial<AgendaSource>, label: string) => {
    stopSpeak();
    setGen((g) => { const n = { ...g }; delete n[sel]; return n; }); // a mentett Letter megmarad!
    onState(sel, patch, label);
  };
  const skipCur = (sel: string) => { stopSpeak(); setDecideSkip((s) => new Set([...s, sel])); };
  const pickMode = (m: 'voice' | 'write') => {
    try { localStorage.setItem('md-titkar-mode', m); } catch { /* ignore */ }
    if (m === 'write') stopSpeak();
    setTitkarMode(m);
  };

  const renderWizard = () => {
    // 0) mód-választó: két nagy gomb, az utoljára használt kiemelve
    if (titkarMode === null) {
      return (
        <div className="po-modepick">
          <div className="po-modepick-h">Hogyan dolgozzuk fel a leveleket?</div>
          <div className="po-modepick-row">
            <button type="button" className={`po-modebtn${lastMode === 'voice' ? ' is-last' : ''}`} onClick={() => pickMode('voice')}>
              <span className="ic">🔊</span>
              <span className="t">Hang mód</span>
              <span className="d">Felolvasom a levelet, a végén egyből diktálhatod a döntésed.</span>
              {lastMode === 'voice' && <span className="last">legutóbb ezt használtad</span>}
            </button>
            <button type="button" className={`po-modebtn${lastMode === 'write' ? ' is-last' : ''}`} onClick={() => pickMode('write')}>
              <span className="ic">✍</span>
              <span className="t">Írás mód</span>
              <span className="d">Csendes: elolvasod, és begépeled vagy diktálod a döntésed.</span>
              {lastMode === 'write' && <span className="last">legutóbb ezt használtad</span>}
            </button>
          </div>
        </div>
      );
    }
    // köteg-sáv: a gyűjtött jegyzetek + EGY gomb az összes megfogalmazására
    const batchBar = (noted.length > 0 || (batchProg && !batchBusy)) ? (
      <div className="po-batch">
        {noted.length > 0 && <span className="po-batch-c">📝 {noted.length} jegyzet gyűjtve</span>}
        {noted.length > 0 && <button type="button" className="btn btn--ink" disabled={batchBusy} title="Az összes gyűjtött jegyzetet egyben megfogalmazza (annyi fél perc, ahány levél, de nem kell tételenként várnod). Az eredmény a Másolható blokkba kerül." onClick={generateAll}>{batchBusy ? `⏳ ${batchProg ?? 'Fogalmazás…'}` : `✍ Fogalmazd meg mind (${noted.length})`}</button>}
        {batchProg && <span className="po-batch-msg">{batchProg}</span>}
      </div>
    ) : null;

    if (decideQueue.length === 0) {
      return (
        <div className="po-wiz">
          {batchBar}
          <div className="cc-empty"><span>{noted.length > 0 ? 'Minden levelet átnéztél. Most nyomd meg a „✍ Fogalmazd meg mind" gombot fent.' : `Kész! Minden levélről döntöttél${decideSkip.size > 0 ? ` (${decideSkip.size} átugorva)` : ''}. Kiléphetsz a titkárnő-módból.`}</span></div>
        </div>
      );
    }
    const r = decideQueue[0];
    const g = gen[r.sel];
    const step = wizStep === 'final' && !g ? 'answer' : wizStep; // kész terv nélkül nincs 3/3
    const thread = r.src.thread ?? [];
    const evBefore = r.eventDay && r.eventDay > tomorrowYmd() ? addDaysYmd(r.eventDay, -1) : null;
    const stale = draftsStale(r.src);
    const subj = r.src.subject ?? r.title;
    const stepIx = step === 'letter' ? 0 : step === 'answer' ? 1 : 2;
    const header = (
      <>
        <div className="po-wiz-prog">
          <span className="po-wiz-dots">{[0, 1, 2].map((i) => <span key={i} className={`dt${i === stepIx ? ' on' : i < stepIx ? ' done' : ''}`} />)}</span>
          <span className="stepname">{step === 'letter' ? '1/3 · A levél' : step === 'answer' ? '2/3 · A válaszod' : '3/3 · A végleges levél'}</span>
          <span className="sp" />
          <span className="cnt">még <b>{decideQueue.length}</b> levél{decideSkip.size > 0 ? ` (+${decideSkip.size})` : ''}</span>
          <span className="po-modetgl">
            <button type="button" className={titkarMode === 'voice' ? 'is-on' : ''} title="Hang mód: felolvasás + diktálás" onClick={() => pickMode('voice')}>🔊</button>
            <button type="button" className={titkarMode === 'write' ? 'is-on' : ''} title="Írás mód: csendes olvasás + gépelés" onClick={() => pickMode('write')}>✍</button>
          </span>
        </div>
        {batchBar}
      </>
    );
    // a "rejtés/kihagyás" gombok minden lépésen elérhetők
    const closeBtn = <button type="button" className="btn" title="Nem kell rá válasz - lezárás/elrejtés (új levélre magától újranyílik)" onClick={() => advance(r.sel, { status: 'noreply', returned: null }, 'Lezárva (nem kell válasz)')}>✕ Nem kell válasz</button>;
    const skipBtn = <button type="button" className="btn" title="Most kihagyom, a sor végére kerül" onClick={() => skipCur(r.sel)}>↷ Kihagyás</button>;
    const snoozeBtns = (
      <>
        <span className="po-snlbl">💤</span>
        <button type="button" className="btn" onClick={() => advance(r.sel, { status: 'snoozed', snoozeUntil: tomorrowYmd(), returned: null }, 'Halasztva holnapig')}>holnap</button>
        <button type="button" className="btn" onClick={() => advance(r.sel, { status: 'snoozed', snoozeUntil: nextMondayYmd(), returned: null }, 'Halasztva hétfőig')}>hétfő</button>
        {evBefore && <button type="button" className="btn" title={`Visszatér ${fmtDayHu(evBefore)} (a kapcsolt esemény előtti nap)`} onClick={() => advance(r.sel, { status: 'snoozed', snoozeUntil: evBefore, returned: null }, 'Halasztva az esemény előttig')}>esemény előtt</button>}
      </>
    );
    const recap = (
      <button type="button" className="po-wiz-recap" title="Vissza a levélhez (1/3)" onClick={() => { stopSpeak(); setWizStep('letter'); }}>
        ▴ {r.src.name} · „{subj}"
      </button>
    );

    // 1/3 A LEVÉL
    if (step === 'letter') {
      return (
        <div className="po-wiz">
          {header}
          <div className="po-wiz-letter">
            <div className="po-wiz-from">
              <span className="d">{fmtD(r.src.date) || '·'}</span>
              <strong>{r.src.name}</strong>
              {(r.src.cc?.length ?? 0) > 0 && <span className="cc" title={`Másolat: ${r.src.cc?.join(', ')}`}>👥 +{r.src.cc?.length}</span>}
              {r.dueStr && <span className="po-badge" title="A levélből készült feladat határideje">⚑ {r.dueStr}</span>}
              {stale && <span className="po-badge warn" title="A szinkron tervei egy korábbi levélhez készültek">elavult tervek</span>}
            </div>
            <div className="po-wiz-subj">„{subj}"</div>
            <p className="po-wiz-gist">{r.src.gist || 'Ehhez a levélhez még nincs összefoglaló - a következő szinkron írja meg.'}</p>
            {thread.length > 0 && (
              <div className="po-thread po-wiz-thread">
                <button type="button" className="po-thread-h" onClick={() => setShowThread(showThread === r.sel ? null : r.sel)}>🧵 Szál ({thread.length}) {showThread === r.sel ? '▴' : '▾'}</button>
                {showThread === r.sel && thread.map((m: ThreadMsg, i: number) => (
                  <div key={i} className={`po-tmsg ${m.dir}`}>
                    <span className="d">{fmtD(m.at.slice(0, 10)) || m.at.slice(0, 10)}</span>
                    <span className="w">{m.dir === 'in' ? '⇣' : '⇡'}</span>
                    <span className="f">{m.from}:</span>
                    <span className="g">{m.gist}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="po-wiz-toolrow">
              <button type="button" className="btn" title="Rövid felolvasás: feladó, tárgy, összegzés (1.5x tempó)"
                onClick={() => { if (speaking) { stopSpeak(); return; } setSpeakKind('short'); speakText(letterText(r), titkarMode === 'voice' ? () => setWizStep('answer') : undefined); }}>
                {speaking && speakKind === 'short' ? '⏹ Állj' : '🔊 Felolvasás'}
              </button>
              {thread.length > 0 && (
                <button type="button" className="btn" title="A teljes szál felolvasása időrendben, az első levéltől az összegzésig (1.5x tempó)"
                  onClick={() => { if (speaking) { stopSpeak(); return; } setSpeakKind('full'); speakText(threadText(r), titkarMode === 'voice' ? () => setWizStep('answer') : undefined); }}>
                  {speaking && speakKind === 'full' ? '⏹ Állj' : '🧵 Teljes szál felolvasása'}
                </button>
              )}
              <button type="button" className="po-card" title={r.sel.startsWith('t:') ? 'A levélből készült FELADAT megnyitása' : 'A levélhez tartozó ESEMÉNY megnyitása'} onClick={() => onOpenCard(r.sel)}>▤ {r.sel.startsWith('t:') ? 'Feladat' : 'Esemény'}: {r.title}</button>
            </div>
            {titkarMode === 'voice' && speaking && <div className="po-wiz-hint">🔊 Felolvasás megy - a végén magától jön a válasz-lépés. A Tovább gombbal átugorhatod.</div>}
            <div className="po-tocc">Válasz ide: <strong>{r.src.name}</strong> &lt;{r.src.email}&gt;{(r.src.cc?.length ?? 0) > 0 && <> · Másolat: {r.src.cc?.join(', ')}</>}</div>
          </div>
          <div className="po-wiz-foot">
            {closeBtn}{skipBtn}{snoozeBtns}
            <span className="sp" />
            <button type="button" className="btn btn--ink po-wiz-next" onClick={() => { stopSpeak(); setWizStep('answer'); }}>Tovább: a válaszod ▸</button>
          </div>
        </div>
      );
    }

    // 2/3 A VÁLASZOD (nyersen) + esetleges tisztázó kérdés
    if (step === 'answer') {
      return (
        <div className="po-wiz">
          {header}
          {recap}
          <div className="po-wiz-step">
            <div className="po-wiz-hint">Írd vagy diktáld be NYERSEN, mit döntöttél - kapkodva is jó, ez csak vázlat, nem ez megy ki. Mentheted jegyzetként és mehetsz a következőre (a végén EGY gombbal fogalmazom meg mindet), vagy most rögtön megfogalmaztatod.</div>
            <textarea ref={taRef} className="po-dict" rows={5} value={dict} onChange={(e) => setDict(e.target.value)}
              placeholder="pl. jó a szerda, de csak délután; kérdezd meg, hogy online is mehet-e; a határidőt told péntekre…"
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (pendingQ) generate(r, qa.trim() ? qa.trim() : null); else saveNote(r); } }} />
            {pendingQ ? (
              <div className="po-wiz-q">
                <div className="q">❓ {pendingQ}</div>
                <input value={qa} onChange={(e) => setQa(e.target.value)} placeholder="a válaszod röviden… (üresen is hagyhatod)"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generate(r, qa.trim() ? qa.trim() : null); } }} />
                <div className="po-dictbtns">
                  <button type="button" className="btn btn--ink" disabled={genBusy} onClick={() => generate(r, qa.trim() ? qa.trim() : null)}>{genBusy ? '⏳ Fogalmazás… (fél perc)' : '✍ Válasz és megfogalmazás'}</button>
                  <button type="button" className="btn" disabled={genBusy} title="Nem tudom - írja meg a levelet enélkül, óvatos fogalmazással" onClick={() => generate(r, null)}>↷ Kihagyom - írd meg nélküle</button>
                </div>
              </div>
            ) : (
              <div className="po-dictbtns">
                <button type="button" className="btn btn--ink" disabled={!dict.trim()} title="Elmenti a jegyzeted és a következő levélre lép - a megfogalmazás a végén, egyben (Ctrl+Enter)" onClick={() => saveNote(r)}>📝 Jegyzet + következő ▸</button>
                <button type="button" className="btn" disabled={genBusy || !dict.trim()} title="Ezt az egyet most rögtön megfogalmazza (kb. fél perc várakozás)" onClick={() => generate(r)}>{genBusy ? '⏳ Fogalmazás…' : '✍ Most megfogalmazom'}</button>
                {g && <button type="button" className="btn" onClick={() => setWizStep('final')}>▸ A kész tervhez</button>}
              </div>
            )}
            {genErr && <div className="po-note">⚠ {genErr}</div>}
          </div>
          <div className="po-wiz-foot">
            <button type="button" className="btn" onClick={() => { stopSpeak(); setWizStep('letter'); }}>◂ Vissza a levélhez</button>
            {closeBtn}{skipBtn}
          </div>
        </div>
      );
    }

    // 3/3 A VÉGLEGES LEVÉL + döntés
    return (
      <div className="po-wiz">
        {header}
        {recap}
        <div className="po-wiz-step">
          <div className="po-draft po-draft--gen">
            <div className="po-draft-h">
              <span className="l">📝 {g.draft.label}</span>
              <span className="sp" />
              <button type="button" className="btn" onClick={() => copyDraft(`${r.sel}-gen`, r.sel, g.draft)}>{copied === `${r.sel}-gen` ? '✓ Másolva' : '⧉ Másolás'}</button>
              <button type="button" className="btn btn--ink" title="Megnyitás a levélíróban: címzettek és tárgy előtöltve, ott küldhető vagy finomítható" onClick={() => onReply(r.sel, g.draft, r.drafts)}>✉ Levélíróba</button>
            </div>
            <div className="po-draft-b">{g.draft.body}</div>
          </div>
          <div className="po-dictbtns">
            <button type="button" className="btn" title="Vissza a nyers döntéshez - módosítsd, és fogalmazd újra" onClick={() => setWizStep('answer')}>🔁 Újrafogalmazás</button>
          </div>
          <div className="po-wiz-hint">A kész levél a Posta alján a <b>„📋 Másolható válaszok"</b> blokkba kerül. Onnan másolod az Outlookba (küldeni ott kell), és utána zárod le.</div>
        </div>
        <details className="po-wiz-tpl">
          <summary>A szinkron {r.drafts.length} választerve (minta, önmagában is használható)</summary>
          {stale && <div className="po-note">⚠ A tervek egy korábbi levélhez készültek, azóta új bejövő érkezett.</div>}
          {r.drafts.map((d, i) => (
            <div key={i} className={`po-draft po-draft--${i}`}>
              <div className="po-draft-h">
                <span className="l">{d.label}</span>
                <span className="sp" />
                <button type="button" className="btn" onClick={() => copyDraft(`${r.sel}-${i}`, r.sel, d)}>{copied === `${r.sel}-${i}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                <button type="button" className="btn btn--ink" onClick={() => onReply(r.sel, d, r.drafts)}>✉ Levélíróba</button>
              </div>
              <div className="po-draft-b">{d.body}</div>
            </div>
          ))}
        </details>
        <div className="po-wiz-foot">
          <button type="button" className="btn btn--ink" title="A kész levél a Posta alján a Másolható válaszok blokkba kerül (még NEM ment el); onnan másolod az Outlookba, és utána zárod le" onClick={() => advance(r.sel, { status: 'drafted', returned: null }, 'Másolható listába')}>📋 Kész, másolható listába</button>
          <button type="button" className="btn" title="Már el is küldtem (pl. Outlookból) - lezárom és jön a következő" onClick={() => advance(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'megválaszolva (titkárnő-mód)') }, 'Elküldve, lezárva')}>✓ Már elküldtem</button>
          {closeBtn}
          <span className="sp" />
          {snoozeBtns}
          {skipBtn}
        </div>
      </div>
    );
  };

  return (
    <main className="catalog postav">
      <PageHead title="Posta" sub="Válaszra váró bejövő levelek · a választerveket az éjszakai/napközbeni szinkron írja elő" />
      {/* brífing-sáv: sávonkénti darabszámok + a két munka-mód */}
      <div className="po-brief">
        <span className="pill">{pendingAll.length} válaszra vár</span>
        {lanes.returned.length > 0 && <span className="pill pill--hot" title="Felébredt halasztás vagy új levél lezárt szálban">{lanes.returned.length} visszatért</span>}
        {urgent > 0 && <span className="pill pill--hot" title="Határidő 48 órán belül">{urgent} sürgős</span>}
        {noted.length > 0 && <span className="pill pill--note" title="Titkárnőben megírt jegyzetek, amelyek megfogalmazásra várnak">{noted.length} jegyzet</span>}
        {lanes.drafted.length > 0 && <span className="pill pill--draft" title="Megírt válaszok, amelyeket még át kell másolni az Outlookba">{lanes.drafted.length} másolható</span>}
        {lanes.waiting.length > 0 && <span className="pill" title="Válaszoltam, az ő válaszukra várok">{lanes.waiting.length} rájuk várok</span>}
        {lanes.snoozed.length > 0 && <span className="pill" title="Halasztva - a felbukkanási napon visszatér">{lanes.snoozed.length} halasztva</span>}
        <span className="sp" />
        {pendingAll.length > 0 && !decide && <button type="button" className="btn" title="Levelenként, lépésről lépésre: levél (felolvasással) - a döntésed nyersen - végleges válasz - következő" onClick={() => { setDecide(true); setTitkarMode(null); setDecideSkip(new Set()); setAllOpen(false); }}>🗣 Titkárnő</button>}
        {pendingAll.length > 0 && !decide && <button type="button" className="btn" title="Minden válaszra váró tétel terveivel együtt, egy listában végigdolgozható" onClick={() => setAllOpen((v) => !v)}>{allOpen ? '▴ Összecsukás' : '▤ Sorban mind'}</button>}
        {decide && <button type="button" className="btn" onClick={() => { setDecide(false); setTitkarMode(null); stopSpeak(); }}>✕ Kilépés a titkárnő-módból</button>}
      </div>
      {decide ? (
        <div className="po-list">{renderWizard()}</div>
      ) : (
        <>
          {pendingAll.length === 0 && lanes.waiting.length === 0 && (
            <div className="cc-empty"><span>Nincs válaszra váró levél. {lanes.closed.length > 0 ? `(${lanes.closed.length} lezárva.)` : 'A szinkron naponta háromszor fut.'}</span></div>
          )}
          <div className="po-list">
            {lane('Visszatért', 'felébredt halasztás vagy új levél egy lezárt szálban', lanes.returned, 'returned')}
            {lane('Határidős', 'a levélből készült feladat határideje egy héten belül', lanes.deadline, 'deadline')}
            {lane('Válaszra vár', 'a legrégebb óta várakozó elöl', lanes.awaiting, 'awaiting')}
            {lane('Rájuk várok', 'válaszoltam - ha nem jön válasz, a követési napon visszatér', lanes.waiting, 'waiting')}
          </div>
        </>
      )}
      {!decide && noted.length > 0 && (
        <section className="po-fold po-fold--note">
          <div className="po-notehead">
            <span className="po-batch-c">📝 Megfogalmazásra vár: {noted.length} jegyzet</span>
            <button type="button" className="btn btn--ink" disabled={batchBusy} title="Az összes gyűjtött jegyzetet egyben megfogalmazza; az eredmény a Másolható blokkba kerül. Ha félbeszakadt, ez folytatja a hátralévőket." onClick={generateAll}>{batchBusy ? `⏳ ${batchProg ?? 'Fogalmazás…'}` : `✍ Fogalmazd meg mind (${noted.length})`}</button>
          </div>
          <div className="po-fold-hint">Ezeket a Titkárnőben megírtad; a szerveren biztonságban vannak, nem vesznek el. A gombbal egyben elkészülnek. (Ha közben elnavigálsz, a böngésző leállíthatja a folyamatot - visszatérve nyomd meg újra, a hátralévőket folytatja.)</div>
          {batchProg && !batchBusy && <div className="po-fold-hint">{batchProg}</div>}
          {noted.map((r) => (
            <div key={r.sel} className="po-mini po-mini--note">
              <span className="d">{fmtD(r.src.date) || '·'}</span>
              <span className="n">{r.src.name}</span>
              <span className="s">„{r.src.subject ?? r.title}"</span>
              <span className="po-notesnip" title={r.src.rawReply ?? ''}>{(r.src.rawReply ?? '').replace(/\s+/g, ' ').slice(0, 44)}…</span>
              <button type="button" className="btn" title="A jegyzet megnyitása a Titkárnőben (szerkesztés)" onClick={() => { setDecide(true); setTitkarMode('write'); setDict(r.src.rawReply ?? ''); }}>✎</button>
              <button type="button" className="btn" title="Jegyzet elvetése (a levél visszakerül a válaszra várók közé)" onClick={() => onState(r.sel, { rawReply: null }, 'Jegyzet elvetve')}>✕</button>
            </div>
          ))}
        </section>
      )}
      {!decide && lanes.drafted.length > 0 && (
        <section className="po-fold po-fold--draft">
          <button type="button" className="po-fold-h" onClick={() => setShowDrafted((v) => !v)}>📋 Másolható válaszok ({lanes.drafted.length}) {showDrafted ? '▴' : '▾'}</button>
          {showDrafted && <div className="po-fold-hint">Ezek a válaszaid MEGvannak írva, de még NEM mentek el. Egy gombbal piszkozatként az Outlookba teheted őket (küldés nélkül), vagy soronként a vágólapra másolod. Utána az Outlookban küldöd el, és itt zárod le.</div>}
          {showDrafted && (
            <div className="po-draftpush">
              <button type="button" className="btn btn--ink" disabled={pushBusy} title="Mindegyik kész válaszból Válasz-piszkozatot készít a klasszikus asztali Outlookban (küldés SOHA). A duplikátumokat kihagyja." onClick={pushDrafts}>{pushBusy ? '⏳ Készül…' : '✉ Mind az Outlookba (piszkozat)'}</button>
              {pushMsg && <span className="po-pushmsg">{pushMsg}</span>}
            </div>
          )}
          {showDrafted && lanes.drafted.map((r) => {
            const l = draftBySel.get(r.sel);
            return (
              <div key={r.sel} className="po-mini po-mini--draft">
                <span className="d">{fmtD(r.src.date) || '·'}</span>
                <span className="n">{r.src.name}</span>
                <span className="s">„{r.src.subject ?? r.title}"</span>
                {l
                  ? <button type="button" className="btn btn--ink" title="A megírt válasz a vágólapra - illeszd be az Outlook válaszába" onClick={() => copyLetter(`d-${r.sel}`, l)}>{copied === `d-${r.sel}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                  : <button type="button" className="btn" title="A levél megnyitása a levélíróban" onClick={() => onOpenCard(r.sel)}>▤ Megnyitás</button>}
                <button type="button" className="btn" title="Beillesztettem és elküldtem az Outlookban - lezárás" onClick={() => onState(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'megválaszolva (átmásolva az Outlookba)') }, 'Elküldve, lezárva')}>✓ Elküldtem</button>
                <button type="button" className="btn" title="Vissza a válaszra várók közé" onClick={() => onState(r.sel, { status: 'pending', returned: null }, 'Vissza a Postába')}>↩ Vissza</button>
              </div>
            );
          })}
        </section>
      )}
      {!decide && lanes.snoozed.length > 0 && (
        <section className="po-fold">
          <button type="button" className="po-fold-h" onClick={() => setShowSnoozed((v) => !v)}>💤 Halasztva ({lanes.snoozed.length}) {showSnoozed ? '▴' : '▾'}</button>
          {showSnoozed && lanes.snoozed.map((r) => (
            <div key={r.sel} className="po-mini">
              <span className="d">{fmtD(r.src.date) || '·'}</span>
              <span className="n">{r.src.name}</span>
              <span className="s">„{r.src.subject ?? r.title}"</span>
              <span className="po-badge">visszatér: {fmtDayHu(r.src.snoozeUntil)}</span>
              <input type="date" className="po-date" value={r.src.snoozeUntil ?? ''} title="A felbukkanási nap módosítása"
                onChange={(ev) => { const v = ev.target.value; if (v && v > new Date().toISOString().slice(0, 10)) onState(r.sel, { snoozeUntil: v }, 'Halasztás módosítva'); }} />
              <button type="button" className="btn" title="Vissza most a válaszra várók közé" onClick={() => onState(r.sel, { status: 'pending', snoozeUntil: null }, 'Visszahozva')}>Vissza most</button>
            </div>
          ))}
        </section>
      )}
      {!decide && lanes.closed.length > 0 && (
        <section className="po-fold">
          <button type="button" className="po-fold-h" onClick={() => setShowClosed((v) => !v)}>Lezárt ({lanes.closed.length}) {showClosed ? '▴' : '▾'}</button>
          {showClosed && lanes.closed.map((r) => (
            <div key={r.sel} className="po-mini">
              <span className="d">{fmtD(r.src.repliedAt?.slice(0, 10) ?? r.src.date) || '·'}</span>
              <span className="n">{r.src.name}</span>
              <span className="s">„{r.src.subject ?? r.title}"</span>
              <span className={`po-badge${r.src.status === 'replied' ? ' ok' : ''}`}>{r.src.status === 'replied' ? '✓ megválaszolva' : 'lezárva'}</span>
              <button type="button" className="btn" title="Vissza a válaszra várók közé" onClick={() => onState(r.sel, { status: 'pending', returned: null }, 'Újranyitva')}>Újranyitás</button>
              {r.src.status === 'replied' && <button type="button" className="btn" title="Követés: ha 5 munkanapon belül nem jön válasz, visszatér a Postába" onClick={() => onState(r.sel, { status: 'waiting', followUpAt: addWorkdaysYmd(5) }, 'Követés bekapcsolva')}>⏳ Követés</button>}
            </div>
          ))}
        </section>
      )}
      {undo && (
        <div className="po-undotoast" role="status">
          <span>{undo.label}</span>
          <button type="button" className="btn" onClick={onUndo}>↶ Visszavonás</button>
        </div>
      )}
    </main>
  );
}
