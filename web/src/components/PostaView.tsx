'use client';

import { useEffect, useMemo, useState } from 'react';
import { Agenda, AgendaSource, ReplyDraft } from '@/data/agenda';
import { parseStyleBank, replyVariants, StyleBank } from '@/lib/replies';
import PageHead from './PageHead';

// POSTA: az Outlook-szinkron által rögzített bejövő levelek, amikre válasz vár.
// Egy sor = egy levél (dátum, feladó, tárgy + EGY mondat arról, mire válaszolunk);
// lenyitva a bot által előre megírt 3 választervezet: másolható vagy a levélíróba tölthető.
// Levélszálnál a válasz a szál minden résztvevőjének megy (source.cc).

interface PendingItem {
  sel: string;               // 't:id' / 'e:id'
  title: string;             // a kapcsolt kártya címe
  src: AgendaSource;
  drafts: ReplyDraft[];      // bot-tervek, vagy gyors tartalék a kártya adataiból
  botMade: boolean;
}

interface Props {
  agenda: Agenda;
  footer: string;            // aláírás-blokk a másoláshoz (a levélíró is ezt teszi a levél aljára)
  onReply: (sel: string, draft: ReplyDraft, drafts: ReplyDraft[]) => void;
  onMarkReplied: (sel: string) => void;
  onOpenCard: (sel: string) => void;
}

const fmtD = (d?: string | null): string => (d && d.length >= 10 ? `${d.slice(5, 7)}. ${Number(d.slice(8, 10))}.` : '');

export default function PostaView({ agenda, footer, onReply, onMarkReplied, onOpenCard }: Props) {
  const [bank, setBank] = useState<StyleBank | null>(null);
  useEffect(() => {
    fetch('/api/style').then((r) => r.json())
      .then((j) => setBank(parseStyleBank(j?.text ?? null)))
      .catch(() => setBank(parseStyleBank(null)));
  }, []);
  const [open, setOpen] = useState<string | null>(null); // melyik sor tervei vannak lenyitva
  const [copied, setCopied] = useState<string | null>(null);

  const items = useMemo<PendingItem[]>(() => {
    const b = bank ?? parseStyleBank(null);
    const out: PendingItem[] = [];
    agenda.tasks.forEach((t) => {
      if (!t.source?.email || t.source.replied) return;
      const bot = (t.source.replies ?? []).length > 0;
      out.push({ sel: `t:${t.id}`, title: t.title, src: t.source, botMade: bot, drafts: bot ? (t.source.replies as ReplyDraft[]) : replyVariants(t.source, t, null, b) });
    });
    agenda.events.forEach((e) => {
      if (!e.source?.email || e.source.replied) return;
      const bot = (e.source.replies ?? []).length > 0;
      out.push({ sel: `e:${e.id}`, title: e.title, src: e.source, botMade: bot, drafts: bot ? (e.source.replies as ReplyDraft[]) : replyVariants(e.source, null, e, b) });
    });
    return out.sort((a, b2) => (b2.src.date || '').localeCompare(a.src.date || ''));
  }, [agenda, bank]);

  const answered = useMemo(() =>
    agenda.tasks.filter((t) => t.source?.replied).length + agenda.events.filter((e) => e.source?.replied).length,
  [agenda]);

  const copyDraft = async (key: string, d: ReplyDraft) => {
    try {
      await navigator.clipboard.writeText(`${d.body}\n\n${footer}`);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch { /* http vagy régi böngésző — a levélíróból másolható */ }
  };

  return (
    <main className="catalog postav">
      <PageHead title="Posta" sub="Válaszra váró bejövő levelek · a választerveket az éjszakai/napközbeni szinkron írja elő" />
      {items.length === 0 && (
        <div className="cc-empty"><span>Nincs válaszra váró levél. {answered > 0 ? `(${answered} már megválaszolva.)` : 'A szinkron naponta háromszor fut.'}</span></div>
      )}
      <div className="po-list">
        {items.map((p) => {
          const isOpen = open === p.sel;
          return (
            <article key={p.sel} className={`po-row${isOpen ? ' is-open' : ''}`}>
              <button type="button" className="po-main" onClick={() => setOpen(isOpen ? null : p.sel)} title={isOpen ? 'Tervek elrejtése' : 'Választervek megnyitása'}>
                <span className="d">{fmtD(p.src.date) || '·'}</span>
                <span className="n">{p.src.name}</span>
                <span className="s">„{p.src.subject ?? p.title}"</span>
                {(p.src.cc?.length ?? 0) > 0 && <span className="cc" title={`A válasz a szál minden résztvevőjének megy: ${p.src.cc?.join(', ')}`}>👥 +{p.src.cc?.length}</span>}
                <span className="x">{isOpen ? '▴' : '▾'}</span>
              </button>
              {/* MIRE válaszolunk: a bot egy mondatos összefoglalója a levélről */}
              <div className="po-gist">{p.src.gist || 'A levél összefoglalója a következő szinkronnál készül el.'}
                <button type="button" className="po-card" title="A kapcsolt kártya megnyitása" onClick={() => onOpenCard(p.sel)}>▤ {p.title}</button>
              </div>
              {isOpen && (
                <div className="po-drafts">
                  {!p.botMade && <div className="po-note">Gyors tervek a kártya adataiból — a személyre szabott terveket a következő szinkron írja meg a levél teljes szövege alapján.</div>}
                  {p.drafts.map((d, i) => (
                    <div key={i} className="po-draft">
                      <div className="po-draft-h">
                        <span className="l">{d.label}</span>
                        <span className="sp" />
                        <button type="button" className="btn" onClick={() => copyDraft(`${p.sel}-${i}`, d)}>{copied === `${p.sel}-${i}` ? '✓ Másolva' : '⧉ Másolás'}</button>
                        <button type="button" className="btn btn--ink" title="Megnyitás a levélíróban: címzettek és tárgy előtöltve, ott küldhető vagy finomítható" onClick={() => onReply(p.sel, d, p.drafts)}>✉ Levélíróba</button>
                      </div>
                      <div className="po-draft-b">{d.body}</div>
                    </div>
                  ))}
                  <div className="po-actrow">
                    <button type="button" className="btn" title="Megválaszoltnak jelölés (pl. ha Outlookból már elment a válasz)" onClick={() => { setOpen(null); onMarkReplied(p.sel); }}>✓ Megválaszolva</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {items.length > 0 && answered > 0 && <div className="po-foot">{answered} korábbi levél már megválaszolva.</div>}
    </main>
  );
}
