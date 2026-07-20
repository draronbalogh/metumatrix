'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Agenda, AgendaAttachment, AgendaEvent, AgendaMeetSlot, AgendaSource, Letter, ReplyDraft, ThreadMsg, addDaysYmd, addWorkdaysYmd, draftsStale, dueTs, duePrecise, emptyEvent, fmtDayHu, fmtDueHu, fmtEventWhen, nextMondayYmd, taskSteps, tomorrowYmd, withOutEntry } from '@/data/agenda';
import { SenderRule, SENDER_RULE_LABEL } from '@/data/people';
import { parseStyleBank, replyVariants, StyleBank } from '@/lib/replies';
import { suggestTemplatesFor, autoFill, TopicCtx } from '@/lib/topics';
import { editHeaders } from '@/lib/editkey';
import PageHead from './PageHead';
import ReplyMeet from './ReplyMeet';
import SlotConfirm from './SlotConfirm';

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
  onBusy?: (msg: string | null) => void;   // app-szintű „Titkárnő fogalmaz" jelző (nézetváltáskor is látszik)
  onSaveEvent?: (e: AgendaEvent) => void;  // a Meet-időpont tükör-eseménye a saját naptárba
  onLinkTaskEvent?: (taskId: string, eventId: string | null) => void; // az új Meet-esemény hozzákapcsolása a feladathoz
  onConfirmMeetSlot?: (eventId: string, slot: AgendaMeetSlot) => void; // függő időpontjavaslat véglegesítése innen
  onEditInComposer?: (l: Letter) => void;  // kimenő levél megnyitása a levélíróban (címzettek is módosíthatók)
  undo: { label: string } | null;
  onUndo: () => void;
  onOpenCard: (sel: string) => void;
  onSaveLetter?: (l: Letter) => void;   // a titkárnő végleges levele draftként tárolódik
  onDeleteLetter?: (id: string) => void; // újrafogalmazásnál a régi példány cserélődik
  onRefresh?: () => void;                // a szerver-állapot azonnali behúzása (pl. szinkron után)
  focusSel?: string | null;              // a Feladat/Esemény kártyáról idehozott levél - kinyitjuk + odagörgetünk
  onFocusConsumed?: () => void;          // a fókusz feldolgozva (a szülő nullázhatja)
}

const fmtD = (d?: string | null): string => (d && d.length >= 10 ? `${d.slice(5, 7)}. ${Number(d.slice(8, 10))}.` : '');
const ymdTs = (d?: string | null): number | null =>
  d && d.length >= 10 ? new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime() : null;

const DAY = 86400000;

export default function PostaView({ agenda, footer, senderRules, onSenderRule, onReply, onBusy, onState, onSaveEvent, onLinkTaskEvent, onConfirmMeetSlot, onEditInComposer, undo, onUndo, onOpenCard, onSaveLetter, onDeleteLetter, onRefresh, focusSel, onFocusConsumed }: Props) {
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
  const [titkarFocus, setTitkarFocus] = useState<string | null>(null); // „Vissza a titkárnőnek": ez a levél kerül a sor elejére
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

  // a Feladat/Esemény kártyáról idehozott levél (focusSel): a megfelelő sávban kinyitjuk
  // a sort (drafted esetén a Másolható blokkot + az olvasópanelt), és odagörgetünk
  useEffect(() => {
    if (!focusSel) return;
    const r = rows.find((x) => x.sel === focusSel);
    const st = r?.src.status ?? 'pending';
    if (st === 'drafted') { setShowDrafted(true); setReadDraft(focusSel); }
    else { setOpen(focusSel); }
    const id = window.setTimeout(() => {
      document.getElementById(`po-${focusSel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onFocusConsumed?.();
    }, 160);
    return () => window.clearTimeout(id);
  }, [focusSel]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [readDraft, setReadDraft] = useState<string | null>(null); // melyik kész válasz TELJES szövege van kinyitva (mobil olvasás)
  const [editDraft, setEditDraft] = useState<{ sel: string; subject: string; body: string } | null>(null); // kész válasz helyben szerkesztése
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
  // EGY kártya piszkozatként az Outlookba (a kártyánkénti „Outlookba" gomb) - küldés NÉLKÜL
  const [draftingSel, setDraftingSel] = useState<string | null>(null);
  const pushDraftOne = async (r: Row) => {
    if (draftingSel) return;
    setDraftingSel(r.sel); setPushMsg(`Piszkozat készítése az Outlookban: ${r.src.name}…`);
    try {
      const res = await fetch('/api/outlook-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ draftId: r.sel.slice(2) }),
      });
      const j = await res.json() as { ok: boolean; made?: number | null; skipped?: number | null; comError?: boolean };
      if (j.comError) setPushMsg('⚠ A klasszikus Outlook nem elérhető COM-on. Nyisd meg (Go to classic Outlook), és próbáld újra.');
      else if (j.made && j.made > 0) setPushMsg(`✓ Piszkozat kész az Outlookban: ${r.src.name}. Nézd át és küldd el ott, majd itt jelöld „Elküldtem".`);
      else if (j.skipped && j.skipped > 0) setPushMsg(`✓ ${r.src.name}: már volt piszkozat az Outlookban (nem duplikáltam).`);
      else setPushMsg(`⚠ ${r.src.name}: nem készült piszkozat (nincs kész levél vagy eredeti a Beérkezettben?). Nézd meg az Outlookot.`);
    } catch {
      setPushMsg('⚠ Nem sikerült elindítani a piszkozat-készítést (fut a dev-szerver és a klasszikus Outlook?).');
    } finally { setDraftingSel(null); }
  };
  // egy konkrét kártya AZONNALI elküldése az Outlookon át (megerősítéssel; nem vonható vissza)
  const [sendingSel, setSendingSel] = useState<string | null>(null);
  const sendNow = async (r: Row) => {
    if (sendingSel) return;
    if (!window.confirm(`Biztosan ELKÜLDÖD most?\n\nCímzett: ${r.src.name}\nTárgy: „${r.src.subject ?? r.title}"\n\nEz azonnal elküldi az Outlookból, és nem vonható vissza.`)) return;
    setSendingSel(r.sel); setPushMsg(`Küldés folyamatban: ${r.src.name}…`);
    try {
      const res = await fetch('/api/outlook-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ sendId: r.sel.slice(2) }),
      });
      const j = await res.json() as { ok: boolean; sent?: boolean; comError?: boolean };
      if (j.comError) setPushMsg('⚠ A klasszikus Outlook nem elérhető COM-on. Nyisd meg (Go to classic Outlook), és próbáld újra.');
      else if (j.ok && j.sent) {
        onState(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'elküldve (Küldés most)') }, 'Elküldve');
        setPushMsg(`✓ Elküldve: ${r.src.name}.`);
      } else setPushMsg('⚠ A küldés nem sikerült (nincs piszkozat vagy eredeti levél?). Nézd meg az Outlookban.');
    } catch {
      setPushMsg('⚠ Nem sikerült elindítani a küldést (fut a dev-szerver és a klasszikus Outlook?).');
    } finally { setSendingSel(null); }
  };
  // MIND küldése egyben (megerősítéssel): minden kész választ elküld, a sikeres kártyákat lezárja
  const [sendAllBusy, setSendAllBusy] = useState(false);
  const sendAllNow = async () => {
    if (sendAllBusy) return;
    const n = lanes.drafted.length;
    if (n === 0) return;
    if (!window.confirm(`Biztosan ELKÜLDÖD MOST mind a ${n} kész választ az Outlookon át?\n\nEz azonnal elküldi mindet, és nem vonható vissza.`)) return;
    setSendAllBusy(true); setPushMsg(`Mind küldése folyamatban (${n})…`);
    try {
      const res = await fetch('/api/outlook-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ sendAll: true }),
      });
      const j = await res.json() as { ok: boolean; sent?: number; failed?: number; sentIds?: string[]; comError?: boolean };
      if (j.comError) { setPushMsg('⚠ A klasszikus Outlook nem elérhető COM-on. Nyisd meg (Go to classic Outlook), és próbáld újra.'); return; }
      const ids = j.sentIds ?? [];
      for (const r of lanes.drafted) {
        if (ids.includes(r.sel.slice(2))) onState(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'elküldve (Mind küldése)') }, 'Elküldve');
      }
      setPushMsg(`✓ Elküldve: ${j.sent ?? ids.length}${j.failed ? `, ${j.failed} sikertelen (nézd meg az Outlookban)` : ''}.`);
    } catch {
      setPushMsg('⚠ Nem sikerült elindítani a küldést (fut a dev-szerver és a klasszikus Outlook?).');
    } finally { setSendAllBusy(false); }
  };
  // MAI levelek beolvasása most: elindítja a helyi szinkront, majd POLLOZZA az állapotot
  // (fut-e még / hány levél), és élő folyamatjelzőt mutat (eltelt idő + kész-eredmény).
  const [syncPhase, setSyncPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [syncElapsed, setSyncElapsed] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncScope, setSyncScope] = useState<'today' | 'yesterday'>('today'); // melyik nap fut épp
  const syncStartRef = useRef(0);   // kliens-idő: az eltelt idő kijelzéséhez
  const syncSrvRef = useRef(0);     // szerver-idő: a befejezés (vízjel) összevetéséhez
  const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const runSync = async (scope: 'today' | 'yesterday' = 'today') => {
    if (syncPhase === 'running') return;
    setSyncScope(scope);
    setSyncPhase('running'); setSyncMsg(null); setSyncElapsed(0);
    syncStartRef.current = Date.now(); syncSrvRef.current = Date.now();
    try {
      const res = await fetch('/api/agenda-sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({ scope }),
      });
      const j = await res.json() as { ok: boolean; started?: boolean; running?: boolean; startedAtMs?: number; msg?: string };
      if (typeof j.startedAtMs === 'number') syncSrvRef.current = j.startedAtMs;
      if (!j.ok && !j.running) { setSyncPhase('error'); setSyncMsg(`⚠ ${j.msg ?? 'Nem sikerült elindítani a beolvasást.'}`); }
      // ok/started VAGY „már fut" -> a polling-effekt figyeli a befejezést
    } catch { setSyncPhase('error'); setSyncMsg('⚠ Nem sikerült elindítani a beolvasást (fut a dev-szerver?).'); }
  };
  // BELÉPÉSKOR/visszatéréskor: a beolvasás KÜLÖN helyi feladatként fut, a menüváltás NEM
  // állítja meg - csak a folyamatjelző él a Posta nézetben. Ezért ha a szerver szerint épp
  // fut egy beolvasás (lock él), folytassuk a jelzőt onnan, ahol tart (túléli a menüváltást).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/agenda-sync', { cache: 'no-store', headers: editHeaders() })
      .then((r) => r.json())
      .then((s: { running?: boolean; elapsedSec?: number }) => {
        if (cancelled || !s.running) return;
        syncStartRef.current = Date.now() - (s.elapsedSec ?? 0) * 1000;
        syncSrvRef.current = syncStartRef.current;
        setSyncElapsed(s.elapsedSec ?? 0);
        setSyncPhase('running');
      })
      .catch(() => { /* átmeneti hiba: nem folytatjuk a jelzőt */ });
    return () => { cancelled = true; };
  }, []);
  // amíg fut: 1 mp-enként az eltelt idő, 4 mp-enként állapot-lekérdezés; befejezéskor eredmény + frissítés
  useEffect(() => {
    if (syncPhase !== 'running') return;
    const tick = window.setInterval(() => setSyncElapsed(Math.max(0, Math.round((Date.now() - syncStartRef.current) / 1000))), 1000);
    const poll = window.setInterval(async () => {
      try {
        const r = await fetch('/api/agenda-sync', { cache: 'no-store', headers: editHeaders() });
        const s = await r.json() as { running?: boolean; lastRunMs?: number; processed?: number | null };
        if (s.running === false && Date.now() - syncStartRef.current > 6000) {
          const completed = (s.lastRunMs ?? 0) >= syncSrvRef.current - 3000; // ez a futás írta a vízjelet?
          if (completed) {
            const n = typeof s.processed === 'number' ? s.processed : 0;
            setSyncMsg(n > 0 ? `✓ Kész: ${n} levél feldolgozva. A lista frissült.` : '✓ Kész, nem jött új levél.');
            onRefresh?.();
          } else {
            setSyncMsg('⚠ A beolvasás nem fejeződött be rendben (lehet kvóta vagy hiba). Próbáld később.');
          }
          setSyncPhase('done');
        }
      } catch { /* átmeneti hiba: a következő poll újrapróbálja */ }
    }, 4000);
    const safety = window.setTimeout(() => { setSyncPhase('done'); setSyncMsg('A beolvasás a szokásosnál tovább tart. Frissítsd később a listát.'); }, 12 * 60 * 1000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); window.clearTimeout(safety); };
  }, [syncPhase, onRefresh]);
  const pendingAll = useMemo(() => [...lanes.returned, ...lanes.deadline, ...lanes.awaiting], [lanes]);
  const urgent = lanes.deadline.filter((r) => r.duePrec && r.dueKey !== null && r.dueKey <= now + 2 * DAY).length;
  // a kész válaszok kettéválnak: ÜTEMEZETT (hajnalra felfegyverezve) vs. sima „másolható"
  const scheduledDrafts = lanes.drafted.filter((r) => (r.src.scheduledFor ?? '').trim());
  const plainDrafts = lanes.drafted.filter((r) => !(r.src.scheduledFor ?? '').trim());

  // HAJNALI ÜTEMEZETT KÜLDÉS: a kész válaszokat felfegyverezzük a következő HÉTKÖZNAP
  // 05:40-06:40 ablakára, emailenként szórt random időpontra (helyi idő). A tényleges
  // küldést a helyi hajnali feladat végzi (valódi .Send()); a 07:00 szinkron igazolja.
  const p2 = (n: number) => String(n).padStart(2, '0');
  const localIso = (d: Date): string => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  const nextWeekdayDawn = (): Date => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); // hétvégét átugorjuk
    d.setHours(5, 40, 0, 0); return d;
  };
  // N szórt random időpont a 60 perces ablakban, jitteres slotokkal (nem csúszik kettő egy percbe)
  const dawnTimes = (n: number): Date[] => {
    const base = nextWeekdayDawn(); const slot = 60 / Math.max(1, n); const out: Date[] = [];
    for (let i = 0; i < n; i++) {
      const t = new Date(base);
      t.setMinutes(t.getMinutes() + Math.floor(i * slot + Math.random() * slot * 0.85));
      t.setSeconds(Math.floor(Math.random() * 60));
      out.push(t);
    }
    return out;
  };
  const fmtDawn = (iso?: string | null): string => {
    if (!iso || iso.length < 16) return '';
    const mon = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'][Number(iso.slice(5, 7)) - 1] ?? '';
    return `${mon} ${Number(iso.slice(8, 10))}. ${iso.slice(11, 16)}`;
  };
  const scheduleAllDawn = () => {
    const targets = plainDrafts;
    if (targets.length === 0) return;
    const times = dawnTimes(targets.length);
    targets.forEach((r, i) => onState(r.sel, { scheduledFor: localIso(times[i]) }, `Ütemezve: ${fmtDawn(localIso(times[i]))}`));
    setPushMsg(`✓ ${targets.length} válasz ütemezve a következő hétköznap hajnalra (05:40–06:40, szórtan). A gép + Outlook maradjon bekapcsolva; a 07:00 szinkron igazolja a küldést.`);
  };
  const scheduleOneDawn = (r: Row) => {
    // egy random időpont az ablakban, a már ütemezettektől min. 3 percre
    const used = scheduledDrafts.map((x) => x.src.scheduledFor).filter(Boolean).map((s) => Date.parse(s as string));
    const base = nextWeekdayDawn(); let t = new Date(base); let tries = 0;
    do { t = new Date(base); t.setMinutes(t.getMinutes() + Math.floor(Math.random() * 60)); t.setSeconds(Math.floor(Math.random() * 60)); tries++; }
    while (tries < 25 && used.some((u) => Math.abs(u - t.getTime()) < 3 * 60000));
    onState(r.sel, { scheduledFor: localIso(t) }, `Ütemezve: ${fmtDawn(localIso(t))}`);
  };
  const unschedule = (r: Row) => onState(r.sel, { scheduledFor: null }, 'Ütemezés visszavonva');
  // gyűjtő-mód: akihez már van NYERS jegyzet, az kikerül a wizard-sorból (kötegelt megfogalmazásra vár)
  const noted = useMemo(() => pendingAll.filter((r) => (r.src.rawReply ?? '').trim()), [pendingAll]);
  const decideQueue0 = pendingAll.filter((r) => !decideSkip.has(r.sel) && !(r.src.rawReply ?? '').trim());
  // ha egy KÉSZ választ visszaküldtünk a Titkárnőnek, az a levél kerül a sor elejére
  const decideQueue = titkarFocus
    ? [...decideQueue0.filter((r) => r.sel === titkarFocus), ...decideQueue0.filter((r) => r.sel !== titkarFocus)]
    : decideQueue0;
  // a wizard aktuális tétele - tételváltáskor minden lépés-állapot nullázódik,
  // és az 1/3 (levél) képernyő jön (ha már van kész terv, egyből a 3/3)
  const curSel = decide ? (decideQueue[0]?.sel ?? null) : null;
  useEffect(() => {
    if (!curSel) return;
    setDict(''); setQa(''); setPendingQ(null); setGenErr(null);
    setWizStep(gen[curSel] ? 'final' : 'letter');
  }, [curSel]); // eslint-disable-line react-hooks/exhaustive-deps
  // ADATVÉDELEM: a Titkárnőben BE NEM KÜLDÖTT nyers döntést (dict) ne veszítsük el, ha
  // menüt váltasz (a nézet leválik). Kilépéskor jegyzetként (rawReply) mentjük az aktuális
  // levélhez - így a „Megfogalmazásra vár" blokkban megmarad, és később folytatható.
  const dictRef = useRef(''); dictRef.current = dict;
  const curSelRef = useRef<string | null>(null); curSelRef.current = curSel;
  const decideRef = useRef(false); decideRef.current = decide;
  const pendingQRef = useRef<string | null>(null); pendingQRef.current = pendingQ;
  const genRef = useRef(gen); genRef.current = gen;
  useEffect(() => () => {
    const sel = curSelRef.current;
    if (decideRef.current && sel && dictRef.current.trim() && !pendingQRef.current && !genRef.current[sel]) {
      onState(sel, { rawReply: dictRef.current.trim() }, 'Nyers jegyzet elmentve (kilépéskor)');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

  // MELLÉKLET megnyitása: a route csak x-edit-key FEJLÉCcel ad fájlt (a kulcs sose megy
  // URL-be), ezért fetch-eljük, blobból töltjük le - így megnyithatod, amit a bot archivált
  const openAttachment = async (a: AgendaAttachment) => {
    if (!a.day) return;
    try {
      const res = await fetch(`/api/attachment?day=${encodeURIComponent(a.day)}&name=${encodeURIComponent(a.name)}`, { headers: editHeaders() });
      if (!res.ok) { setPushMsg(`⚠ A melléklet nem nyitható meg: ${a.name} (lehet, hogy még nincs archiválva a következő szinkronig).`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = a.name;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch { setPushMsg('⚠ Nem sikerült megnyitni a mellékletet.'); }
  };
  // a kártya mellékletei megnyitható listaként (a bot tölti fel a source.attachments-et)
  const attachList = (src: AgendaSource) => {
    const at = src.attachments;
    if (!at?.length) return null;
    return (
      <div className="po-attach">
        <span className="po-attach-h">📎 Melléklet{at.length > 1 ? `ek (${at.length})` : ''}:</span>
        {at.map((a, i) => (a.day
          ? <button key={i} type="button" className="po-attach-i" title="Letöltés / megnyitás" onClick={() => openAttachment(a)}>{a.name}</button>
          : <span key={i} className="po-attach-i is-off" title={a.note || 'nincs archiválva'}>{a.name}</span>))}
      </div>
    );
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

  // a megfogalmazónak átadott PLUSZ kontextus: a kártya (feladat/esemény) konkrét
  // tartalma, az illeszkedő levéltár-sablonok, és a topic-kitöltéshez a kártya ctx-e.
  // Ezekből ír TELJES levelet a diktált IRÁNY alapján (nem a nyers szavakból).
  const topicCtxOf = (r: Row): TopicCtx => {
    const id = r.sel.slice(2);
    if (r.sel[0] === 'e') {
      const e = agenda.events.find((x) => x.id === id);
      return { title: e?.title ?? r.title, when: e?.when ?? null, place: e?.place ?? null, due: null };
    }
    const t = agenda.tasks.find((x) => x.id === id);
    return { title: t?.title ?? r.title, when: null, place: null, due: t?.dueDate ?? t?.due ?? null };
  };
  const cardCtx = (r: Row): { kind: string; lines: string[] } => {
    const id = r.sel.slice(2);
    if (r.sel[0] === 't') {
      const t = agenda.tasks.find((x) => x.id === id);
      if (!t) return { kind: 'feladat', lines: [] };
      const openSteps = taskSteps(t).filter((s) => !s.done).map((s) => s.text.trim()).filter(Boolean);
      return { kind: 'feladat', lines: [
        t.summary ? `Leírás: ${t.summary}` : '',
        t.dueDate ? `Határidő: ${t.dueDate}` : (t.due ? `Határidő: ${t.due}` : ''),
        openSteps.length ? `Nyitott lépések: ${openSteps.slice(0, 6).join(' | ')}` : '',
        t.people?.length ? `Résztvevők: ${t.people.join(', ')}` : '',
      ].filter(Boolean) };
    }
    const e = agenda.events.find((x) => x.id === id);
    if (!e) return { kind: 'esemény', lines: [] };
    return { kind: 'esemény', lines: [
      e.when ? `Időpont: ${e.when}` : (e.day ? `Nap: ${e.day}${e.dayEnd ? ` - ${e.dayEnd}` : ''}` : ''),
      e.place ? `Helyszín: ${e.place}` : '',
      e.note ? `Jegyzet: ${e.note}` : '',
      e.people?.length ? `Résztvevők: ${e.people.join(', ')}` : '',
    ].filter(Boolean) };
  };
  const tplsFor = (r: Row): { label: string; group: string; subject: string; body: string }[] => {
    const ctx = topicCtxOf(r);
    return suggestTemplatesFor(`${r.title} ${r.src.subject ?? ''}`, 2)
      .map((t) => ({ label: t.label, group: t.group, subject: autoFill(t.subject(ctx)), body: autoFill(t.body(ctx)) }));
  };

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
          card: cardCtx(r), templates: tplsFor(r),
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
    onBusy?.(`Titkárnő fogalmaz… (${items.length} levél)`);
    try {
      const res = await fetch('/api/rephrase-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
        body: JSON.stringify({
          items: items.map((r) => ({
            sel: r.sel, senderName: r.src.name, senderEmail: r.src.email,
            subject: r.src.subject ?? null, gist: r.src.gist ?? null,
            thread: (r.src.thread ?? []).map((m) => `${m.at.slice(0, 10)} · ${m.dir === 'in' ? 'bejövő' : 'kimenő'} · ${m.from}: ${m.gist}`),
            drafts: r.drafts.map((d) => ({ label: d.label, subject: d.subject, body: d.body })),
            card: cardCtx(r), templates: tplsFor(r),
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
    } finally { setBatchBusy(false); onBusy?.(null); }
  };

  const nowIso = () => new Date().toISOString();

  // ---- KIMENŐ (Levelek Titkárnő) levelek: dir:'out' + status:'outbox' ----
  // Új, KEZDEMÉNYEZETT levelek (nem válaszok); a küldő-script levél-id alapján célozza.
  const outboxLetters = useMemo(() => (agenda.letters || [])
    .filter((l) => l.dir === 'out' && (l.status ?? 'draft') === 'outbox')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [agenda]);
  const recipSummary = (l: Letter): string => {
    const rs = l.recipients ?? [];
    if (rs.length === 0) return l.names.join(', ') || '(nincs címzett)';
    if (rs.length === 1) return rs[0].name;
    return `${rs.length} címzett${l.sendMode === 'bcc' ? ' · BCC' : ' · egyenként'}`;
  };
  const [readOut, setReadOut] = useState<string | null>(null);
  const [editOut, setEditOut] = useState<{ id: string; subject: string; body: string } | null>(null);
  const [outBusy, setOutBusy] = useState<string | null>(null); // 'd-<id>' piszkozat / 's-<id>' küldés
  const pushOutboundOne = async (l: Letter) => {
    if (outBusy) return;
    setOutBusy(`d-${l.id}`); setPushMsg(`Piszkozat készítése az Outlookban: ${recipSummary(l)}…`);
    try {
      const res = await fetch('/api/outlook-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify({ outboundId: l.id }) });
      const j = await res.json() as { ok: boolean; made?: number | null; comError?: boolean };
      if (j.comError) setPushMsg('⚠ A klasszikus Outlook nem elérhető COM-on. Nyisd meg (Go to classic Outlook), és próbáld újra.');
      else if (j.ok) setPushMsg(`✓ Piszkozat(ok) kész az Outlookban: ${recipSummary(l)}. Nézd át és küldd el ott, majd itt jelöld „Elküldtem".`);
      else setPushMsg('⚠ Nem készült piszkozat. Nézd meg az Outlookot / az automation/logs/drafts.log-ot.');
    } catch { setPushMsg('⚠ Nem sikerült elindítani a piszkozat-készítést (fut a dev-szerver és a klasszikus Outlook?).'); }
    finally { setOutBusy(null); }
  };
  const sendOutboundNow = async (l: Letter) => {
    if (outBusy) return;
    if (!window.confirm(`Biztosan ELKÜLDÖD most?\n\nCímzett: ${recipSummary(l)}\nTárgy: „${l.subject}"\n\nEz azonnal elküldi az Outlookból, és nem vonható vissza.`)) return;
    setOutBusy(`s-${l.id}`); setPushMsg(`Küldés folyamatban: ${recipSummary(l)}…`);
    try {
      const res = await fetch('/api/outlook-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() }, body: JSON.stringify({ outboundSendId: l.id }) });
      const j = await res.json() as { ok: boolean; sent?: boolean; comError?: boolean };
      if (j.comError) setPushMsg('⚠ A klasszikus Outlook nem elérhető COM-on. Nyisd meg (Go to classic Outlook), és próbáld újra.');
      else if (j.ok && j.sent) { onSaveLetter?.({ ...l, status: 'sent' }); setPushMsg(`✓ Elküldve: ${recipSummary(l)}.`); }
      else setPushMsg('⚠ A küldés nem sikerült (nincs piszkozat / címzett?). Nézd meg az Outlookot.');
    } catch { setPushMsg('⚠ Nem sikerült elindítani a küldést (fut a dev-szerver és a klasszikus Outlook?).'); }
    finally { setOutBusy(null); }
  };
  const markOutboundSent = (l: Letter) => onSaveLetter?.({ ...l, status: 'sent' });
  const scheduleOutbound = (l: Letter) => {
    const t = new Date(nextWeekdayDawn());
    t.setMinutes(t.getMinutes() + Math.floor(Math.random() * 60));
    t.setSeconds(Math.floor(Math.random() * 60));
    onSaveLetter?.({ ...l, scheduledFor: localIso(t) });
    setPushMsg(`✓ Ütemezve: ${fmtDawn(localIso(t))} (a hajnali feladat küldi ki valódi levélként).`);
  };
  const unscheduleOutbound = (l: Letter) => onSaveLetter?.({ ...l, scheduledFor: null });
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
      <article key={r.sel} id={`po-${r.sel}`} className={`po-row${isOpen ? ' is-open' : ''}`}>
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
            {attachList(r.src)}
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
    setTitkarFocus((f) => (f === sel ? null : f)); // a fókusz feloldódik, ha erről döntöttünk
    onState(sel, patch, label);
  };
  const skipCur = (sel: string) => { stopSpeak(); setDecideSkip((s) => new Set([...s, sel])); };
  const pickMode = (m: 'voice' | 'write') => {
    try { localStorage.setItem('md-titkar-mode', m); } catch { /* ignore */ }
    if (m === 'write') stopSpeak();
    setTitkarMode(m);
  };
  // egy KÉSZ (drafted) válasz VISSZAKÜLDÉSE a Titkárnőnek: a státusz visszaáll
  // válaszra-váróra, a nyers jegyzet + a memóriabeli terv törlődik (a mentett Letter
  // megmarad referenciának), és a Titkárnő rögtön EZT a levelet nyitja meg elöl,
  // hangmódban - újra meghallgatható és új válasz adható rá.
  const backToTitkar = (r: Row, letter?: Letter | null) => {
    // el lehet dönteni: a MEGLÉVŐ választ szerkesztem (szöveg megmarad), vagy teljesen ÚJAT írok
    if (letter) {
      const keep = window.confirm('A MEGLÉVŐ választ szeretnéd módosítani?\n\nOK: a mostani szöveg megnyílik szerkesztésre (megmarad).\nMégse: teljesen ÚJ választ írsz (a mostani törlődik).');
      if (keep) {
        setShowDrafted(true);
        setReadDraft(r.sel);
        setEditDraft({ sel: r.sel, subject: letter.subject, body: letter.body });
        return;
      }
    }
    stopSpeak();
    setGen((g) => { const n = { ...g }; delete n[r.sel]; return n; });
    onState(r.sel, { status: 'pending', returned: null, rawReply: null }, 'Vissza a titkárnőnek');
    setReadDraft(null); setEditDraft(null);
    setTitkarFocus(r.sel); setDecideSkip(new Set()); setAllOpen(false);
    setTitkarMode('voice'); setDecide(true);
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
            {attachList(r.src)}
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
        {plainDrafts.length > 0 && <span className="pill pill--draft" title="Megírt válaszok, amelyeket még ki kell küldeni / át kell másolni az Outlookba">{plainDrafts.length} másolható</span>}
        {scheduledDrafts.length > 0 && <span className="pill pill--sched" title="Hajnalra (05:40–06:40) ütemezett, szórt küldések">⏰ {scheduledDrafts.length} ütemezve</span>}
        {lanes.waiting.length > 0 && <span className="pill" title="Válaszoltam, az ő válaszukra várok">{lanes.waiting.length} rájuk várok</span>}
        {lanes.snoozed.length > 0 && <span className="pill" title="Halasztva - a felbukkanási napon visszatér">{lanes.snoozed.length} halasztva</span>}
        <span className="sp" />
        {!decide && <button type="button" className="btn btn--ink" disabled={syncPhase === 'running'} title="A MAI beérkezett és elküldött leveleket beolvassa és beteszi az agendába (a napi ütemezett szinkronon felül, kézzel). Pár perc, magától frissül." onClick={() => runSync('today')}>{syncPhase === 'running' && syncScope === 'today' ? `⏳ Beolvasás… ${mmss(syncElapsed)}` : '🔄 Mai levelek'}</button>}
        {!decide && <button type="button" className="btn" disabled={syncPhase === 'running'} title="A TEGNAPI beérkezett és elküldött leveleket olvassa be (pl. ha kimaradt egy futás, vagy utólag jött be levél). Ugyanaz a feldolgozás, csak a tegnapi napra. Pár perc, magától frissül." onClick={() => runSync('yesterday')}>{syncPhase === 'running' && syncScope === 'yesterday' ? `⏳ Tegnapi… ${mmss(syncElapsed)}` : '🔄 Tegnapi levelek'}</button>}
        {pendingAll.length > 0 && !decide && <button type="button" className="btn" title="Levelenként, lépésről lépésre: levél (felolvasással) - a döntésed nyersen - végleges válasz - következő" onClick={() => { setDecide(true); setTitkarMode(null); setDecideSkip(new Set()); setAllOpen(false); }}>🗣 Titkárnő</button>}
        {pendingAll.length > 0 && !decide && <button type="button" className="btn" title="Minden válaszra váró tétel terveivel együtt, egy listában végigdolgozható" onClick={() => setAllOpen((v) => !v)}>{allOpen ? '▴ Összecsukás' : '▤ Sorban mind'}</button>}
        {decide && <button type="button" className="btn" onClick={() => { setDecide(false); setTitkarMode(null); stopSpeak(); setTitkarFocus(null); }}>✕ Kilépés a titkárnő-módból</button>}
      </div>
      {(syncPhase === 'running' || syncMsg) && (
        <div className={`po-sync${syncPhase === 'running' ? ' is-running' : ''}${syncMsg && syncMsg[0] === '⚠' ? ' is-err' : ''}`}>
          {syncPhase === 'running' && <span className="po-sync-spin" aria-hidden />}
          <span className="po-sync-txt">
            {syncPhase === 'running'
              ? <><b>Levelek beolvasása folyamatban…</b> <span className="po-sync-clock">{mmss(syncElapsed)}</span> · általában 2-4 perc. Az Outlookot a háttérben olvassa, majd frissíti a listát.</>
              : syncMsg}
          </span>
          {syncPhase !== 'running' && syncMsg && <button type="button" className="po-sync-x" onClick={() => { setSyncMsg(null); setSyncPhase('idle'); }} title="Elrejtés">✕</button>}
        </div>
      )}
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
      {!decide && plainDrafts.length > 0 && (
        <section className="po-fold po-fold--draft">
          <button type="button" className="po-fold-h" onClick={() => setShowDrafted((v) => !v)}>📋 Másolható válaszok ({plainDrafts.length}) {showDrafted ? '▴' : '▾'}</button>
          {showDrafted && <div className="po-fold-hint">Ezek a válaszaid MEGvannak írva, de még NEM mentek el. Kiküldheted őket most, piszkozatként az Outlookba teheted, vagy a vágólapra másolod. VAGY egy gombbal HAJNALRA ütemezed (05:40–06:40, szórtan) - akkor a helyi hajnali feladat küldi ki őket valódi levélként.</div>}
          {showDrafted && (
            <div className="po-draftpush">
              <button type="button" className="btn btn--sched" title="Mind a kész választ a KÖVETKEZŐ HÉTKÖZNAP hajnalára ütemezi (05:40–06:40, emailenként szórt random időben). A gép + Outlook legyen bekapcsolva; a 07:00 szinkron igazolja a küldést." onClick={scheduleAllDawn}>⏰ Ütemezett küldés (hajnalra)</button>
              <button type="button" className="btn btn--ink" disabled={pushBusy} title="Mindegyik kész válaszból Válasz-piszkozatot készít a klasszikus asztali Outlookban (küldés SOHA). A duplikátumokat kihagyja." onClick={pushDrafts}>{pushBusy ? '⏳ Készül…' : '✉ Mind az Outlookba (piszkozat)'}</button>
              <button type="button" className="btn btn--hot" disabled={sendAllBusy} title="AZONNAL elküldi MIND a kész választ az Outlookon át (megerősítéssel, nem vonható vissza). A meglévő piszkozatokat küldi." onClick={sendAllNow}>{sendAllBusy ? '⏳ Küldés…' : `✉ Mind küldése most (${plainDrafts.length})`}</button>
              {pushMsg && <span className="po-pushmsg">{pushMsg}</span>}
            </div>
          )}
          {showDrafted && plainDrafts.map((r) => {
            const l = draftBySel.get(r.sel);
            const isRead = readDraft === r.sel;
            const editing = !!l && editDraft?.sel === r.sel;
            return (
              <Fragment key={r.sel}>
                <div id={`po-${r.sel}`} className={`po-mini po-mini--draft${isRead ? ' is-read' : ''}`}>
                  <span className="d">{fmtD(r.src.date) || '·'}</span>
                  <span className="n">{r.src.name}</span>
                  <span className="s">„{r.src.subject ?? r.title}"</span>
                  {r.src.meetLink && <a className="po-badge" href={r.src.meetLink} target="_blank" rel="noopener noreferrer" title="Google Meet belépés">📹 Meet</a>}
                  {l && <button type="button" className="btn" title="A megírt válasz TELJES szövegének megnyitása olvasásra/szerkesztésre (mobilon is)" onClick={() => { setReadDraft(isRead ? null : r.sel); setEditDraft(null); }}>{isRead ? '▴ Bezár' : '👁 Elolvasás'}</button>}
                  {l
                    ? <button type="button" className="btn btn--ink" title="A megírt válasz a vágólapra - illeszd be az Outlook válaszába" onClick={() => copyLetter(`d-${r.sel}`, l)}>{copied === `d-${r.sel}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                    : <button type="button" className="btn" title="A levél megnyitása a levélíróban" onClick={() => onOpenCard(r.sel)}>▤ Megnyitás</button>}
                  <button type="button" className="btn btn--ink" disabled={draftingSel === r.sel} title="EZT az egy kész választ piszkozatként az Outlookba teszi (küldés NÉLKÜL). Az Outlookban átnézed és onnan küldöd el." onClick={() => pushDraftOne(r)}>{draftingSel === r.sel ? '⏳ Piszkozat…' : '✉ Outlookba'}</button>
                  <button type="button" className="btn btn--hot" disabled={sendingSel === r.sel} title="AZONNALI küldés az Outlookon át (megerősítéssel, nem vonható vissza). Ha van piszkozat, azt küldi." onClick={() => sendNow(r)}>{sendingSel === r.sel ? '⏳ Küldés…' : '✉ Küldés most'}</button>
                  <button type="button" className="btn btn--sched" title="EZT az egy választ a következő hétköznap hajnalára ütemezi (05:40–06:40, random időben). A helyi hajnali feladat küldi ki valódi levélként." onClick={() => scheduleOneDawn(r)}>⏰ Ütemezve</button>
                  <button type="button" className="btn" title="Beillesztettem és elküldtem az Outlookban - lezárás" onClick={() => onState(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'megválaszolva (átmásolva az Outlookba)') }, 'Elküldve, lezárva')}>✓ Elküldtem</button>
                  <button type="button" className="btn" title="Vissza a titkárnőnek: a válasz státusza visszaáll, a Titkárnő rögtön ezt a levelet nyitja hangmódban - újra meghallgathatod és új választ adhatsz rá" onClick={() => backToTitkar(r, l)}>🗣 Titkárnőnek</button>
                  <button type="button" className="btn" title="Vissza a válaszra várók közé (a Postába, a Titkárnő megnyitása nélkül)" onClick={() => onState(r.sel, { status: 'pending', returned: null }, 'Vissza a Postába')}>↩ Vissza</button>
                </div>
                {isRead && l && (
                  <div className="po-readbody">
                    {editing ? (
                      <>
                        <div className="po-readedit">
                          <label className="po-readedit-l">Tárgy</label>
                          <input className="po-readedit-s" value={editDraft.subject} onChange={(e) => setEditDraft((d) => (d ? { ...d, subject: e.target.value } : d))} />
                          <label className="po-readedit-l">A válasz szövege</label>
                          <textarea className="po-readedit-b" rows={12} value={editDraft.body} onChange={(e) => setEditDraft((d) => (d ? { ...d, body: e.target.value } : d))} />
                        </div>
                        <ReplyMeet
                          title={l.subject}
                          recipientEmail={r.src.email}
                          onInsert={(text) => setEditDraft((d) => (d ? { ...d, body: `${d.body.trimEnd()}\n\n${text}` } : d))}
                          onLink={(link) => onState(r.sel, { meetLink: link }, 'Meet-link a kártyához')}
                          onCreated={(info) => {
                            // a saját naptárba is: esemény-kártyánál rákötjük, feladatnál tükör-esemény + kapcsolás
                            if (!onSaveEvent) return;
                            if (r.sel.startsWith('e:')) {
                              const ev = agenda.events.find((x) => x.id === r.sel.slice(2));
                              if (ev) onSaveEvent({ ...ev, googleEventId: ev.googleEventId ?? (info.googleEventId || null), meetLink: ev.meetLink ?? (info.link || null), mstatus: ev.mstatus ?? 'tentative', meetSlots: ev.meetSlots ?? (info.slots.length > 1 ? info.slots : null) });
                            } else {
                              const eid = `e-${Date.now().toString(36)}`;
                              onSaveEvent({
                                ...emptyEvent(), id: eid, title: l.subject,
                                when: `${fmtEventWhen(info.day, null, info.day.slice(0, 7), info.start || null)} (egyeztetés alatt)`,
                                sort: info.day.slice(0, 7), day: info.day,
                                people: [r.src.name],
                                googleEventId: info.googleEventId || null, meetLink: info.link || null, mstatus: 'tentative',
                                meetSlots: info.slots.length > 1 ? info.slots : null,
                              });
                              const t = agenda.tasks.find((x) => x.id === r.sel.slice(2));
                              if (t && !t.eventId) onLinkTaskEvent?.(t.id, eid);
                            }
                          }}
                        />
                        {(() => {
                          // a kártyához kapcsolt függő (tentative + több javaslat) esemény véglegesítése innen
                          const ev = r.sel.startsWith('e:')
                            ? agenda.events.find((x) => x.id === r.sel.slice(2))
                            : (() => { const t = agenda.tasks.find((x) => x.id === r.sel.slice(2)); return t?.eventId ? agenda.events.find((x) => x.id === t.eventId) : undefined; })();
                          return ev && onConfirmMeetSlot ? <SlotConfirm event={ev} onConfirm={(s) => onConfirmMeetSlot(ev.id, s)} /> : null;
                        })()}
                        <div className="po-readbody-f">
                          <button type="button" className="btn btn--ink" title="A módosítások mentése (a kész válasz felülíródik)" onClick={() => { onSaveLetter?.({ ...l, subject: editDraft.subject.trim() || l.subject, body: editDraft.body.trim() }); setEditDraft(null); }}>💾 Mentés</button>
                          <button type="button" className="btn" title="Módosítások elvetése" onClick={() => setEditDraft(null)}>Mégse</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="po-readbody-h">
                          <span className="s2">„{l.subject}"</span>
                          <span className="to">→ {r.src.name}{(r.src.cc?.length ?? 0) > 0 ? ` · +${r.src.cc?.length} másolat` : ''}</span>
                        </div>
                        <div className="po-draft-b">{l.body}</div>
                        <div className="po-readbody-f">
                          <button type="button" className="btn" title="A válasz átírása (tárgy és szöveg) - a módosítás helyben menthető" onClick={() => setEditDraft({ sel: r.sel, subject: l.subject, body: l.body })}>✎ Szerkesztés</button>
                          <button type="button" className="btn" title="Vissza a titkárnőnek: a válasz státusza visszaáll, a Titkárnő rögtön ezt a levelet nyitja hangmódban - újra meghallgathatod és új választ adhatsz rá" onClick={() => backToTitkar(r, l)}>🗣 Titkárnőnek</button>
                          <button type="button" className="btn btn--ink" title="A megírt válasz a vágólapra" onClick={() => copyLetter(`d-${r.sel}`, l)}>{copied === `d-${r.sel}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                          <button type="button" className="btn" onClick={() => { setReadDraft(null); setEditDraft(null); }}>▴ Bezár</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </section>
      )}
      {!decide && outboxLetters.length > 0 && (
        <section className="po-fold po-fold--draft">
          <div className="po-fold-h" style={{ cursor: 'default' }}>📤 Kimenő - Titkárnő levelek ({outboxLetters.length})</div>
          <div className="po-fold-hint">Ezeket a Levelek Titkárnőben írtad (kezdeményezett, nem válasz), még NEM mentek el. Kiküldheted most, piszkozatként az Outlookba teheted, vagy a vágólapra másolod. Több címzettnél a személyre szabott mód címzettenként külön levelet küld, a BCC egy közöset.</div>
          {outboxLetters.map((l) => {
            const isRead = readOut === l.id;
            const editing = editOut?.id === l.id;
            return (
              <Fragment key={l.id}>
                <div id={`po-out-${l.id}`} className="po-mini po-mini--draft">
                  <span className="d">📤</span>
                  <span className="n">{recipSummary(l)}</span>
                  <span className="s">„{l.subject}"</span>
                  {l.meetLink && <a className="po-badge" href={l.meetLink} target="_blank" rel="noopener noreferrer" title="Google Meet belépés">📹 Meet</a>}
                  <button type="button" className="btn" title="A levél teljes szövegének megnyitása olvasásra/szerkesztésre" onClick={() => { setReadOut(isRead ? null : l.id); setEditOut(null); }}>{isRead ? '▴ Bezár' : '👁 Elolvasás'}</button>
                  <button type="button" className="btn btn--ink" title="A levél a vágólapra" onClick={() => copyLetter(`o-${l.id}`, l)}>{copied === `o-${l.id}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                  <button type="button" className="btn btn--ink" disabled={outBusy === `d-${l.id}`} title="Piszkozatként az Outlookba (küldés nélkül)" onClick={() => pushOutboundOne(l)}>{outBusy === `d-${l.id}` ? '⏳ Piszkozat…' : '✉ Outlookba'}</button>
                  <button type="button" className="btn btn--hot" disabled={outBusy === `s-${l.id}`} title="AZONNALI küldés az Outlookon át (megerősítéssel, nem vonható vissza)" onClick={() => sendOutboundNow(l)}>{outBusy === `s-${l.id}` ? '⏳ Küldés…' : '✉ Küldés most'}</button>
                  {l.scheduledFor
                    ? <span className="po-schedtime" title="Ütemezett hajnali küldés">⏰ {fmtDawn(l.scheduledFor)} <button type="button" className="btn" title="Ütemezés visszavonása" onClick={() => unscheduleOutbound(l)}>✕</button></span>
                    : <button type="button" className="btn btn--sched" title="A következő hétköznap hajnalára ütemezi (05:40–06:40, szórtan)" onClick={() => scheduleOutbound(l)}>⏰ Ütemezve</button>}
                  <button type="button" className="btn" title="Elküldtem - lezárás" onClick={() => markOutboundSent(l)}>✓ Elküldtem</button>
                  {onEditInComposer && <button type="button" className="btn" title="Megnyitás a levélíróban - ott a címzettek és a küldési mód is módosítható; a „Küldésre a Postába” ugyanezt a levelet frissíti (nem duplikál)" onClick={() => onEditInComposer(l)}>▤ Levélíróba</button>}
                  <button type="button" className="btn" title="A kimenő levél elvetése (megerősítéssel)" onClick={() => { if (confirm(`Elveted ezt a kimenő levelet?\n\n„${l.subject}"`)) onDeleteLetter?.(l.id); }}>🗑</button>
                </div>
                {isRead && (
                  <div className="po-readbody">
                    {editing ? (
                      <>
                        <div className="po-readedit">
                          <label className="po-readedit-l">Tárgy</label>
                          <input className="po-readedit-s" value={editOut.subject} onChange={(e) => setEditOut((d) => (d ? { ...d, subject: e.target.value } : d))} />
                          <label className="po-readedit-l">A levél szövege</label>
                          <textarea className="po-readedit-b" rows={12} value={editOut.body} onChange={(e) => setEditOut((d) => (d ? { ...d, body: e.target.value } : d))} />
                        </div>
                        <ReplyMeet
                          title={editOut.subject || l.subject}
                          recipientEmail={l.recipients?.[0]?.email ?? null}
                          onInsert={(text) => setEditOut((d) => (d ? { ...d, body: `${d.body.trimEnd()}\n\n${text}` } : d))}
                          onLink={(link) => onSaveLetter?.({ ...l, meetLink: link || undefined })}
                          onCreated={(info) => {
                            if (!onSaveEvent) return;
                            const eid = `e-${Date.now().toString(36)}`;
                            onSaveEvent({
                              ...emptyEvent(), id: eid, title: editOut.subject || l.subject,
                              when: `${fmtEventWhen(info.day, null, info.day.slice(0, 7), info.start || null)} (egyeztetés alatt)`,
                              sort: info.day.slice(0, 7), day: info.day,
                              people: l.names.filter((n) => !n.includes('@')),
                              googleEventId: info.googleEventId || null, meetLink: info.link || null, mstatus: 'tentative',
                              meetSlots: info.slots.length > 1 ? info.slots : null,
                            });
                          }}
                        />
                        <div className="po-readbody-f">
                          <button type="button" className="btn btn--ink" title="A módosítások mentése" onClick={() => { onSaveLetter?.({ ...l, subject: editOut.subject.trim() || l.subject, body: editOut.body.trim() }); setEditOut(null); }}>💾 Mentés</button>
                          <button type="button" className="btn" onClick={() => setEditOut(null)}>Mégse</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="po-readbody-h">
                          <span className="s2">„{l.subject}"</span>
                          <span className="to">→ {recipSummary(l)}</span>
                        </div>
                        <div className="po-draft-b">{l.body}</div>
                        <div className="po-readbody-f">
                          <button type="button" className="btn" title="A levél átírása (helyben menthető)" onClick={() => setEditOut({ id: l.id, subject: l.subject, body: l.body })}>✎ Szerkesztés</button>
                          <button type="button" className="btn btn--ink" onClick={() => copyLetter(`o-${l.id}`, l)}>{copied === `o-${l.id}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                          <button type="button" className="btn" onClick={() => { setReadOut(null); setEditOut(null); }}>▴ Bezár</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </section>
      )}
      {!decide && scheduledDrafts.length > 0 && (
        <section className="po-fold po-fold--sched">
          <div className="po-sched-h">⏰ Ütemezve hajnalra ({scheduledDrafts.length})</div>
          <div className="po-fold-hint">Ezek a KÖVETKEZŐ hétköznap hajnalán, 05:40–06:40 között, szórt random időben mennek ki (a helyi feladat valódi levélként küldi). A gép + Outlook legyen bekapcsolva; a 07:00 szinkron „megválaszolt"-ra billenti a ténylegesen kimenteket.</div>
          {scheduledDrafts.map((r) => {
            const overdue = !!(r.src.scheduledFor && Date.parse(r.src.scheduledFor) < Date.now());
            return (
              <div key={r.sel} id={`po-${r.sel}`} className="po-mini po-mini--sched">
                <span className="d">{fmtD(r.src.date) || '·'}</span>
                <span className="n">{r.src.name}</span>
                <span className="s">„{r.src.subject ?? r.title}"</span>
                <span className={`po-schedtime${overdue ? ' is-over' : ''}`} title={overdue ? 'A tervezett idő elmúlt - ha a hajnali feladat nem futott, küldd ki kézzel vagy ütemezd újra' : 'A tervezett küldési idő'}>⏰ {fmtDawn(r.src.scheduledFor)}{overdue ? ' (lejárt?)' : ''}</span>
                <button type="button" className="btn btn--hot" disabled={sendingSel === r.sel} title="Mégis most küldöm (nem várok hajnalig)" onClick={() => sendNow(r)}>{sendingSel === r.sel ? '⏳ Küldés…' : '✉ Küldés most'}</button>
                <button type="button" className="btn" title="Ütemezés visszavonása - a válasz visszakerül a Másolható közé" onClick={() => unschedule(r)}>✕ Visszavonás</button>
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
