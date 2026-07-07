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

// A szerveroldali (SMTP) küldés a munkahelyi policy miatt nem járható; ehelyett az app
// ELŐKÉSZÍTI a levelet, és a saját levelezőben (mailto) nyitja meg, vagy vágólapra másol.
export default function NotifyModal({ target, teacherNames, db, onClose }: Props) {
  const [subject, setSubject] = useState(target.subject);
  const [body, setBody] = useState(target.body);
  const [selected, setSelected] = useState<string[]>(() => [...new Set(target.names)]);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (name: string) => setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  const addGroup = (g: StandingGroup) => setSelected((s) => [...new Set([...s, ...standingGroupNames(g, teacherNames, db)])]);
  const addCustom = (members: string[]) => setSelected((s) => [...new Set([...s, ...members])]);

  const { emails, missing } = useMemo(() => {
    const em: string[] = []; const mi: string[] = []; const seen = new Set<string>();
    selected.forEach((n) => {
      const e = emailOf(db, n);
      if (e) { if (!seen.has(e)) { seen.add(e); em.push(e); } } else mi.push(n);
    });
    return { emails: em, missing: mi };
  }, [selected, db]);

  const ready = emails.length > 0 && subject.trim().length > 0;

  const openMail = () => {
    if (!ready) return;
    const url = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`;
    if (url.length > 1900) {
      setResult('⚠ Túl sok a címzett a levelező közvetlen megnyitásához — másold a címzetteket és az üzenetet, és illeszd be a webmailbe.');
      return;
    }
    window.location.href = url;
    setResult('A leveleződ megnyílt — ott küldd el. Ha nem nyílt meg (pl. webmail), használd a másolás gombokat.');
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => setResult(`✓ ${label} a vágólapon`))
      .catch(() => setResult('Nem sikerült a másolás — jelöld ki kézzel a mezőben.'));
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide">
        <h3>✉ Értesítés előkészítése</h3>
        <div className="pm-body nm-body">
          <div className="nm-info">A saját leveleződben, <strong>BCC-vel</strong> megy (a címzettek nem látják egymást). A „Megnyitás a levelezőben" a beállított levelezőt (Outlook / webmail) nyitja meg előkitöltve — onnan Te küldöd el. Ha nem nyílik meg, másold a címzetteket és az üzenetet a gombokkal.</div>
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
          <div className="nm-copyrow">
            <button className="btn" disabled={!emails.length} onClick={() => copy(emails.join(', '), 'Címzettek (BCC)')}>⧉ Címzettek másolása</button>
            <button className="btn" disabled={!subject.trim() && !body} onClick={() => copy(`${subject}\n\n${body}`, 'Tárgy + üzenet')}>⧉ Üzenet másolása</button>
          </div>
          {result && <div className={`nm-result${result.startsWith('✓') || result.startsWith('A leveleződ') ? ' ok' : ' err'}`}>{result}</div>}
        </div>
        <div className="mfoot">
          <span className="nm-hint">{emails.length} címzett kiválasztva</span>
          <span className="sp" />
          <button className="btn" onClick={onClose}>Bezárás</button>
          <button className="btn btn--ink" disabled={!ready} onClick={openMail}>✉ Megnyitás a levelezőben</button>
        </div>
      </div>
    </div>
  );
}
