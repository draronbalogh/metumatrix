'use client';

import { useEffect, useMemo, useState } from 'react';
import { Agenda, AgendaSource, ReplyDraft, ThreadMsg, addDaysYmd, addWorkdaysYmd, draftsStale, dueTs, duePrecise, fmtDayHu, fmtDueHu, nextMondayYmd, tomorrowYmd, withOutEntry } from '@/data/agenda';
import { SenderRule, SENDER_RULE_LABEL } from '@/data/people';
import { parseStyleBank, replyVariants, StyleBank } from '@/lib/replies';
import { editHeaders } from '@/lib/editkey';
import PageHead from './PageHead';

// POSTA: az Outlook-szinkron által rögzített bejövő levelek, állapotgéppel.
// Stabil sávok fix sorrendben (egy kártya pontosan EGY sávban, a többi tulajdonság
// jelvény): Visszatért → Határidős → Válaszra vár → Rájuk várok. A halasztottak
// rejtve (lenyitható), a lezártak külön szekcióban, újranyitással. Minden verdikt
// egy koppintás + visszavonási sáv. Extra módok: Döntés-sor (tételenként egy
// kötelező döntés, Sunsama-minta) és Sorban (minden terv egyszerre lenyitva,
// Hey Focus&Reply-minta). Új feladónál egyszeri szabály-döntés (Screener-minta).

interface Row {
  sel: string;               // 't:id' / 'e:id'
  title: string;             // a kapcsolt kártya címe
  src: AgendaSource;
  drafts: ReplyDraft[];      // bot-tervek, vagy gyors tartalék a kártya adataiból
  botMade: boolean;
  dueKey: number | null;     // hatásos határidő (feladat dueDate / kapcsolt esemény napja)
  dueStr: string | null;     // ugyanez kijelezve
  duePrec: boolean;          // nap-pontos-e (csak az mehet a 48 órás sávba)
  eventDay: string | null;   // kapcsolt esemény napja — az „esemény előtt" halasztáshoz
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
}

const fmtD = (d?: string | null): string => (d && d.length >= 10 ? `${d.slice(5, 7)}. ${Number(d.slice(8, 10))}.` : '');
const ymdTs = (d?: string | null): number | null =>
  d && d.length >= 10 ? new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))).getTime() : null;

const DAY = 86400000;

export default function PostaView({ agenda, footer, senderRules, onSenderRule, onReply, onState, undo, onUndo, onOpenCard }: Props) {
  const [bank, setBank] = useState<StyleBank | null>(null);
  useEffect(() => {
    fetch('/api/style').then((r) => r.json())
      .then((j) => setBank(parseStyleBank(j?.text ?? null)))
      .catch(() => setBank(parseStyleBank(null)));
  }, []);
  const [open, setOpen] = useState<string | null>(null); // melyik sor tervei vannak lenyitva
  const [copied, setCopied] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [showThread, setShowThread] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);          // Sorban mód: minden terv lenyitva
  const [decide, setDecide] = useState(false);            // Döntés-sor mód: tételenként egy döntés
  const [decideSkip, setDecideSkip] = useState<Set<string>>(new Set());

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

  // sáv-besorolás: egy kártya pontosan egy sávban — Visszatért > Határidős > Válaszra vár
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
      closed: rows.filter((r) => st(r) === 'replied' || st(r) === 'noreply')
        .sort((a, b) => (b.src.repliedAt ?? b.src.date ?? '').localeCompare(a.src.repliedAt ?? a.src.date ?? '')),
    };
  }, [rows, now]);

  const pendingAll = useMemo(() => [...lanes.returned, ...lanes.deadline, ...lanes.awaiting], [lanes]);
  const urgent = lanes.deadline.filter((r) => r.duePrec && r.dueKey !== null && r.dueKey <= now + 2 * DAY).length;
  const decideQueue = pendingAll.filter((r) => !decideSkip.has(r.sel));

  const logChoice = (sel: string, label: string) => {
    fetch('/api/replylog', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...editHeaders() },
      body: JSON.stringify({ at: new Date().toISOString(), sel, label, action: 'copy' }),
    }).catch(() => { /* a napló nem kritikus */ });
  };

  const copyDraft = async (key: string, sel: string, d: ReplyDraft) => {
    try {
      await navigator.clipboard.writeText(`${d.body}\n\n${footer}`);
      setCopied(key);
      logChoice(sel, d.label);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch { /* http vagy régi böngésző — a levélíróból másolható */ }
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
          {stale && <span className="po-badge warn" title="A tervek egy korábbi levélhez készültek — új bejövő érkezett azóta">elavult</span>}
          {lane === 'waiting' && r.src.followUpAt && <span className="po-badge" title="Ha eddig nem válaszolnak, a levél visszatér a Postába">követés: {fmtDayHu(r.src.followUpAt)}</span>}
          <span className="x">{isOpen ? 'bezár ▴' : lane === 'waiting' ? 'részletek ▾' : `✉ válaszok ▾`}</span>
        </button>
        {/* MIRE válaszolunk: a bot egy mondatos összefoglalója a levélről */}
        <div className="po-gist">{r.src.gist || 'A levél összefoglalója a következő szinkronnál készül el.'}
          {/* a levélből a szinkron feladat-/eseménykártyát készített — ez nyitja meg */}
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
            {/* kinek megy a válasz — másolás előtt ellenőrizhető */}
            <div className="po-tocc">Címzett: <strong>{r.src.name}</strong> &lt;{r.src.email}&gt;{(r.src.cc?.length ?? 0) > 0 && <> · Másolat: {r.src.cc?.join(', ')}</>}</div>
            {r.src.draftMode === 'ping' && <div className="po-note">Követő tervek: a követési határidőig nem érkezett válasz — az alábbiak udvarias emlékeztetők.</div>}
            {stale && <div className="po-note">⚠ A tervek egy korábbi levélhez készültek, azóta új bejövő érkezett. A következő szinkron frissíti őket — a szál tartalmát ellenőrizd küldés előtt.</div>}
            {!r.botMade && lane !== 'waiting' && <div className="po-note">Gyors tervek a levélből készült feladat adataiból — a személyre szabott terveket a következő szinkron írja meg a levél teljes szövege alapján.</div>}
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
                <span className="po-snlbl">Új feladó — szabály egyszer, mostantól érvényes:</span>
                <button type="button" className="btn" title="A leveleire mindig teljes válasz-csomag készül" onClick={() => onSenderRule(r.src.email, 'reply')}>{SENDER_RULE_LABEL.reply}</button>
                <button type="button" className="btn" title="A leveleiből lehet kártya, de nem kerülnek a Postába" onClick={() => { onSenderRule(r.src.email, 'fyi'); onState(r.sel, { status: 'noreply', returned: null }, 'Csak tájékoztat — lezárva'); }}>{SENDER_RULE_LABEL.fyi}</button>
                <button type="button" className="btn" title="A bot a leveleit teljesen átugorja" onClick={() => { onSenderRule(r.src.email, 'ignore'); onState(r.sel, { status: 'noreply', returned: null }, 'Mellőzendő — lezárva'); }}>{SENDER_RULE_LABEL.ignore}</button>
              </div>
            )}
            <div className="po-actrow">
              {lane !== 'waiting' ? (
                <>
                  <button type="button" className="btn" title="Megválaszoltnak jelölés (pl. ha Outlookból már elment a válasz)" onClick={() => { setOpen(null); onState(r.sel, { status: 'replied', repliedAt: nowIso(), returned: null, thread: withOutEntry(r.src, 'megválaszolva (kézi jelölés)') }, 'Megválaszolva'); }}>✓ Megválaszolva</button>
                  <button type="button" className="btn" title="Megválaszolva + követés: ha 5 munkanapon belül nem jön válasz, a levél visszatér a Postába" onClick={() => { setOpen(null); onState(r.sel, { status: 'waiting', repliedAt: nowIso(), followUpAt: addWorkdaysYmd(5), returned: null, thread: withOutEntry(r.src, 'megválaszolva, követés bekapcsolva') }, 'Megválaszolva + követés'); }}>✓⏳ Válasz + követés</button>
                  <button type="button" className="btn" title="Lezárás válasz nélkül — ha mégis jön új levél a szálban, magától újranyílik" onClick={() => { setOpen(null); onState(r.sel, { status: 'noreply', returned: null }, 'Lezárva (nem kell válasz)'); }}>✕ Nem kell válasz</button>
                  <span className="sp" />
                  <span className="po-snlbl">💤 Halasztás:</span>
                  <button type="button" className="btn" onClick={() => { setOpen(null); onState(r.sel, { status: 'snoozed', snoozeUntil: tomorrowYmd(), returned: null }, 'Halasztva holnapig'); }}>holnap</button>
                  <button type="button" className="btn" onClick={() => { setOpen(null); onState(r.sel, { status: 'snoozed', snoozeUntil: nextMondayYmd(), returned: null }, 'Halasztva hétfőig'); }}>hétfő</button>
                  {evBefore && <button type="button" className="btn" title={`Visszatér ${fmtDayHu(evBefore)} (a kapcsolt esemény előtti nap)`} onClick={() => { setOpen(null); onState(r.sel, { status: 'snoozed', snoozeUntil: evBefore, returned: null }, 'Halasztva az esemény előttig'); }}>esemény előtt</button>}
                </>
              ) : (
                <>
                  <button type="button" className="btn" title="Vissza a válaszra várók közé (pl. mégis nekem kell lépnem)" onClick={() => { setOpen(null); onState(r.sel, { status: 'pending', followUpAt: null }, 'Vissza a Postába'); }}>↩ Vissza a Postába</button>
                  <button type="button" className="btn" title="Lezárás — nem várunk tovább a válaszukra" onClick={() => { setOpen(null); onState(r.sel, { status: 'noreply', followUpAt: null, returned: null }, 'Lezárva'); }}>✕ Lezárás</button>
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

  const laneOf = (r: Row): 'returned' | 'deadline' | 'awaiting' =>
    lanes.returned.includes(r) ? 'returned' : lanes.deadline.includes(r) ? 'deadline' : 'awaiting';

  return (
    <main className="catalog postav">
      <PageHead title="Posta" sub="Válaszra váró bejövő levelek · a választerveket az éjszakai/napközbeni szinkron írja elő" />
      {/* brífing-sáv: sávonkénti darabszámok + a két munka-mód */}
      <div className="po-brief">
        <span className="pill">{pendingAll.length} válaszra vár</span>
        {lanes.returned.length > 0 && <span className="pill pill--hot" title="Felébredt halasztás vagy új levél lezárt szálban">{lanes.returned.length} visszatért</span>}
        {urgent > 0 && <span className="pill pill--hot" title="Határidő 48 órán belül">{urgent} sürgős</span>}
        {lanes.waiting.length > 0 && <span className="pill" title="Válaszoltam, az ő válaszukra várok">{lanes.waiting.length} rájuk várok</span>}
        {lanes.snoozed.length > 0 && <span className="pill" title="Halasztva — a felbukkanási napon visszatér">{lanes.snoozed.length} halasztva</span>}
        <span className="sp" />
        {pendingAll.length > 0 && !decide && <button type="button" className="btn" title="Tételenként egy döntés: válasz / halasztás / lezárás — semmi nem marad függőben" onClick={() => { setDecide(true); setDecideSkip(new Set()); setAllOpen(false); }}>▶ Döntés-sor</button>}
        {pendingAll.length > 0 && !decide && <button type="button" className="btn" title="Minden válaszra váró tétel terveivel együtt, egy listában végigdolgozható" onClick={() => setAllOpen((v) => !v)}>{allOpen ? '▴ Összecsukás' : '▤ Sorban mind'}</button>}
        {decide && <button type="button" className="btn" onClick={() => setDecide(false)}>✕ Kilépés a döntés-sorból</button>}
      </div>
      {decide ? (
        <div className="po-list">
          {decideQueue.length === 0 ? (
            <div className="cc-empty"><span>Kész! Minden tételről döntöttél{decideSkip.size > 0 ? ` (${decideSkip.size} átugorva)` : ''}.</span></div>
          ) : (
            <>
              <div className="po-decide-h">Döntés-sor · még {decideQueue.length} tétel{decideSkip.size > 0 ? ` (+${decideSkip.size} átugorva)` : ''}</div>
              {renderRow(decideQueue[0], laneOf(decideQueue[0]), true)}
              <div className="po-actrow">
                <button type="button" className="btn" onClick={() => setDecideSkip((s) => new Set([...s, decideQueue[0].sel]))}>↷ Átugrás</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {pendingAll.length === 0 && lanes.waiting.length === 0 && (
            <div className="cc-empty"><span>Nincs válaszra váró levél. {lanes.closed.length > 0 ? `(${lanes.closed.length} lezárva.)` : 'A szinkron naponta háromszor fut.'}</span></div>
          )}
          <div className="po-list">
            {lane('Visszatért', 'felébredt halasztás vagy új levél egy lezárt szálban', lanes.returned, 'returned')}
            {lane('Határidős', 'a levélből készült feladat határideje egy héten belül', lanes.deadline, 'deadline')}
            {lane('Válaszra vár', 'a legrégebb óta várakozó elöl', lanes.awaiting, 'awaiting')}
            {lane('Rájuk várok', 'válaszoltam — ha nem jön válasz, a követési napon visszatér', lanes.waiting, 'waiting')}
          </div>
        </>
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
