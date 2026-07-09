'use client';

import { useEffect, useMemo, useState } from 'react';
import { AgendaEvent, AgendaTask, Letter } from '@/data/agenda';
import { PeopleDB, emailOf } from '@/data/people';
import { standingGroupNames, StandingGroup } from '@/lib/recipients';
import { buildLetter, rerollLetter, LETTER_KINDS, LetterKind } from '@/lib/letters';
import GrowArea from './GrowArea';
import PlaceQuickPick from './PlaceQuickPick';

export interface NotifyTarget {
  targetType: 'event' | 'task' | null;
  targetId: string | null;
  event?: AgendaEvent | null;
  task?: AgendaTask | null;
  names: string[]; // előre kijelölt címzettek (a tétel felelőse + résztvevői)
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

// Levél-készítő: sablonból generált szöveg + 3 numerikus másolás-gomb (Outlookba illesztéshez).
// A küldés (Gmail SMTP) opcionális — csak akkor aktív, ha a szerveren be van állítva.
export default function NotifyModal({ target, teacherNames, db, letters, onSaveLetter, onDeleteLetter, onPlaceChange, onClose }: Props) {
  const [kind, setKind] = useState<LetterKind>('felkeres');
  const initial = useMemo(() => buildLetter('felkeres', { type: target.targetType, event: target.event, task: target.task }, db.signature), [target, db.signature]);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [place, setPlace] = useState(target.event?.place ?? '');
  const [bodyDirty, setBodyDirty] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => [...new Set(target.names)]);
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

  const regenerate = (k: LetterKind, placeOverride?: string) => {
    setKind(k);
    const p = (placeOverride ?? place).trim();
    const ev = target.event ? { ...target.event, place: p || null } : target.event;
    const gen = buildLetter(k, { type: target.targetType, event: ev, task: target.task }, db.signature);
    setSubject(gen.subject);
    setBody(gen.body);
    setBodyDirty(false);
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
    setResult('Mentett levél betöltve.');
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

  const previewLines = body.split('\n').filter((l) => l.trim()).slice(0, 2);
  const fmtDate = (iso: string) => iso.slice(0, 16).replace('T', ' ');

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide">
        <h3>✉ Levél készítése{target.event ? ` · ${target.event.title}` : target.task ? ` · ${target.task.title}` : ''}</h3>
        <div className="pm-body nm-body">
          <div className="field full">
            <label>Sablon: a szöveget ebből generálom; ugyanarra újra koppintva más megfogalmazást kapsz</label>
            <div className="chipradio">
              {LETTER_KINDS.map((k) => (
                <button type="button" key={k.id} className={`crx c-blue${kind === k.id ? ' is-on' : ''}`} onClick={() => regenerate(k.id)}>{k.label}</button>
              ))}
              <button type="button" className="crx c-amber" title="Csak a megszólítást és az elköszönést cseréli, a törzsszöveg marad" onClick={() => setBody((b) => rerollLetter(b))}>🎲 Átfogalmaz</button>
            </div>
          </div>
          {target.event && (
            <div className="field full">
              <label>Helyszín: a levélbe és az eseményre is bekerül (külső helyszínnél írd be a címet)</label>
              <input value={place} onChange={(e) => applyPlace(e.target.value, false)} onBlur={() => { if (!bodyDirty) regenerate(kind); }} placeholder="pl. D épület 212, vagy külső cím" />
              <PlaceQuickPick onPick={(v) => applyPlace(v, true)} />
            </div>
          )}
          <div className="field full">
            <label>Csoportok gyors hozzáadása</label>
            <div className="nm-groups">
              {STANDING.map((g) => <button key={g.id} type="button" className="chip" onClick={() => addGroup(g.id)}>+ {g.label}</button>)}
              {db.groups.map((g) => <button key={g.name} type="button" className="chip" title={g.members.join(', ')} onClick={() => addCustom(g.members)}>+ {g.name}</button>)}
            </div>
          </div>
          <div className="field full">
            <label>Névsor: koppints a nevekre a hozzáadáshoz/levételhez (T = tanár, H = hallgató, többet is választhatsz)</label>
            <div className="cat-picker pp-picker">
              {roster.map((r) => {
                const on = selected.includes(r.name);
                const has = !!emailOf(db, r.name);
                return (
                  <button key={r.name} type="button" className={`chip${on ? ' is-on' : ''}${on && !has ? ' nm-noemail' : ''}`}
                    title={has ? (emailOf(db, r.name) as string) : 'nincs email-cím, a Névjegyzékben add meg'}
                    onClick={() => toggle(r.name)}>
                    <span className={`pb ${r.kind === 'T' ? 't' : 'h'}`}>{r.kind}</span>{r.name}{on && !has ? ' ⚠' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field full">
            <label>Kiválasztott címzettek: {emails.length} email{missing.length ? ` · ${missing.length} névnél nincs cím` : ''}</label>
            <div className="cat-picker pp-picker nm-recips">
              {selected.length === 0 && <span className="nm-empty">Válassz a fenti névsorból, a csoportokból, vagy a tétel résztvevői közül.</span>}
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
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field full">
            <label>Üzenet (az aláírással együtt) <button type="button" className="nm-bodytoggle" onClick={() => setBodyOpen((v) => !v)}>{bodyOpen ? '▲ elrejtés' : '▼ szerkesztés'}</button></label>
            {bodyOpen ? (
              <GrowArea minRows={8} value={body} onChange={(e) => { setBody(e.target.value); setBodyDirty(true); }} />
            ) : (
              <div className="nm-preview" onClick={() => setBodyOpen(true)} title="Kattints a szerkesztéshez">
                {previewLines.map((l, i) => <div key={i}>{l}</div>)}
                <span className="more">… a teljes szöveg az aláírással kész, a 3. gombbal másolható</span>
              </div>
            )}
          </div>
          <div className="nm-copyrow big">
            <button className="btn nm-copy" disabled={!emails.length} onClick={() => copy(emails.join('; '), 'Címzettek')}><b>1</b> ⧉ Címzettek ({emails.length})</button>
            <button className="btn nm-copy" disabled={!subject.trim()} onClick={() => copy(subject.trim(), 'Tárgy')}><b>2</b> ⧉ Tárgy</button>
            <button className="btn nm-copy" disabled={!body.trim()} onClick={() => copy(body, 'Üzenet')}><b>3</b> ⧉ Üzenet</button>
          </div>
          {result && <div className={`nm-result${result.startsWith('✓') || result.startsWith('Mentett') ? ' ok' : ' err'}`}>{result}</div>}
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
          <button className="btn" onClick={saveLetter} disabled={!subject.trim()}>💾 Levél mentése</button>
          <span className="sp" />
          <button className="btn" onClick={onClose}>Bezárás</button>
          <button className="btn btn--ink" disabled={sending || !emails.length || !subject.trim() || !configured}
            title={configured ? 'Küldés Gmail SMTP-n (BCC)' : 'A küldéshez töltsd ki a web/.env.local Gmail app-jelszavát és indítsd újra a szervert'}
            onClick={send}>
            {sending ? 'Küldés…' : `✉ Küldés (${emails.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
