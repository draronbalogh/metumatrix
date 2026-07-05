'use client';

import { useEffect, useMemo, useState } from 'react';
import { PeopleDB, emailOf } from '@/data/people';
import { standingGroupNames, StandingGroup } from '@/lib/recipients';

export interface NotifyTarget {
  subject: string;
  body: string;
  names: string[]; // előre kijelölt címzettek (a tétel owner+people)
}

interface Props {
  target: NotifyTarget;
  teacherNames: string[];
  db: PeopleDB;
  onClose: () => void;
}

const STANDING: { id: StandingGroup; label: string }[] = [
  { id: 'minden-tanar', label: 'Minden tanár' },
  { id: 'minden-hallgato', label: 'Minden hallgató' },
  { id: 'mindenki', label: 'Mindenki' },
];

export default function NotifyModal({ target, teacherNames, db, onClose }: Props) {
  const [subject, setSubject] = useState(target.subject);
  const [body, setBody] = useState(target.body);
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

  const toggle = (name: string) => setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  const addGroup = (g: StandingGroup) => {
    const names = standingGroupNames(g, teacherNames, db);
    setSelected((s) => [...new Set([...s, ...names])]);
  };
  const addCustom = (members: string[]) => setSelected((s) => [...new Set([...s, ...members])]);

  const { emails, missing } = useMemo(() => {
    const em: string[] = []; const mi: string[] = []; const seen = new Set<string>();
    selected.forEach((n) => {
      const e = emailOf(db, n);
      if (e) { if (!seen.has(e)) { seen.add(e); em.push(e); } } else mi.push(n);
    });
    return { emails: em, missing: mi };
  }, [selected, db]);

  const send = async () => {
    if (!emails.length || !subject.trim()) return;
    setSending(true); setResult(null);
    try {
      const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.5">${body.split('\n').map((l) => l ? `<p>${l.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))}</p>` : '<br>').join('')}</div>`;
      const r = await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), text: body, html, bcc: emails }),
      });
      const j = await r.json();
      if (j.ok) { setResult(`✓ Elküldve ${j.sent} címzettnek.`); setTimeout(onClose, 1200); }
      else setResult(`Hiba: ${j.error || 'ismeretlen'}`);
    } catch (e) { setResult(`Hiba: ${String(e)}`); }
    setSending(false);
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide">
        <h3>✉ Értesítés küldése</h3>
        <div className="pm-body nm-body">
          {configured === false && (
            <div className="nm-warn">Az email-küldés még nincs beállítva. Töltsd ki a <code>web/.env.local</code> fájlt a szakos Gmail app-jelszavával, majd indítsd újra a szervert.</div>
          )}
          <div className="field full">
            <label>Csoportok gyors hozzáadása</label>
            <div className="nm-groups">
              {STANDING.map((g) => <button key={g.id} type="button" className="chip" onClick={() => addGroup(g.id)}>+ {g.label}</button>)}
              {db.groups.map((g) => <button key={g.name} type="button" className="chip" title={g.members.join(', ')} onClick={() => addCustom(g.members)}>+ {g.name}</button>)}
            </div>
          </div>
          <div className="field full">
            <label>Címzettek — {emails.length} email{missing.length ? ` · ${missing.length} névnél nincs cím` : ''}</label>
            <div className="cat-picker pp-picker nm-recips">
              {selected.length === 0 && <span className="nm-empty">Válassz címzettet a csoportokból, vagy nyisd meg egy feladat/esemény „Értesítés" gombjából.</span>}
              {selected.map((n) => {
                const has = !!emailOf(db, n);
                return (
                  <button key={n} type="button" className={`chip is-on${has ? '' : ' nm-noemail'}`} title={has ? emailOf(db, n) as string : 'nincs email-cím — a Névjegyzékben add meg'}
                    onClick={() => toggle(n)}>{n}{has ? '' : ' ⚠'}</button>
                );
              })}
            </div>
            {missing.length > 0 && <div className="nm-missing">⚠ Nincs email-címük (kimaradnak): {missing.join(', ')} — a ☎ Névjegyzékben pótolható.</div>}
          </div>
          <div className="field full">
            <label>Tárgy</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field full">
            <label>Üzenet</label>
            <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {result && <div className={`nm-result${result.startsWith('✓') ? ' ok' : ' err'}`}>{result}</div>}
        </div>
        <div className="mfoot">
          <span className="nm-hint">BCC-vel megy — a címzettek nem látják egymást.</span>
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" disabled={sending || !emails.length || !subject.trim() || configured === false} onClick={send}>
            {sending ? 'Küldés…' : `Küldés (${emails.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
