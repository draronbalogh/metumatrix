'use client';

import { useMemo, useState } from 'react';
import { PeopleDB, PersonKind, KIND_LABEL, emailOf, buildRoster, formerTeacherNames, teacherStatusNames, studentOrganizerNames, studentStatusNames, studentCohorts, cohortNames } from '@/data/people';
import { normName } from '@/lib/normalize';

// A postázó (NotifyModal) címzett-választójával AZONOS UI, közös komponensbe emelve:
// gyors csoport-listák (oktatók/hallgatók/intézményi/alumni/opponens/piaci + Mindenki),
// egyedi csoportok (db.groups), kategória + státusz szűrők a névsorhoz, a kiválasztottak
// mindig látszanak, kereséssel bővíthető, és EGYEDI email-cím is hozzáadható. Kontrollált:
// a kiválasztott NEVEK és az egyedi EMAIL-ek a szülőben élnek.
interface Props {
  teacherNames: string[];
  db: PeopleDB;
  selected: string[];   // kiválasztott nevek (a névsorból)
  adhoc: string[];      // egyedi email-címzettek (listán kívül)
  onChange: (selected: string[], adhoc: string[]) => void;
}

export default function RecipientPicker({ teacherNames, db, selected, adhoc, onChange }: Props) {
  const [kindFilter, setKindFilter] = useState<PersonKind | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rq, setRq] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const roster = useMemo(() => buildRoster(teacherNames, db), [teacherNames, db]);
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

  const setSel = (names: string[]) => onChange([...new Set(names)], adhoc);
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name], adhoc);
  const addCustom = (members: string[]) => onChange([...new Set([...selected, ...members])], adhoc);
  const removeAdhoc = (e: string) => onChange(selected, adhoc.filter((x) => x !== e));
  const addAdhocEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !adhoc.includes(e)) onChange(selected, [...adhoc, e]);
    setEmailInput('');
  };

  const groups = [
    { label: 'Aktuális oktatók', names: teacherNames },
    { label: 'Főállású oktatók', names: teacherStatusNames(db, 'főállású') },
    { label: 'Óraadók', names: teacherStatusNames(db, 'óraadó') },
    { label: 'Volt / külsős oktatók', names: formerTeacherNames(teacherNames, db) },
    { label: 'Minden hallgató', names: db.students.map((p) => p.name) },
    { label: 'Hallgatói szervezők (mind)', names: studentOrganizerNames(db) },
    { label: 'H · szervezők', names: studentStatusNames(db, 'szervező') },
    { label: 'H · nagykövetek', names: studentStatusNames(db, 'nagykövet') },
    { label: 'H · képviselők', names: studentStatusNames(db, 'képviselő') },
    { label: 'H · demonstrátorok', names: studentStatusNames(db, 'demonstrátor') },
    ...studentCohorts(db).map((c) => ({ label: `${c} évf.`, names: cohortNames(db, c) })),
    { label: 'Minden intézményi', names: db.institution.map((p) => p.name) },
    { label: 'Minden alumni', names: db.alumni.map((p) => p.name) },
    { label: 'Minden opponens', names: db.opponents.map((p) => p.name) },
    { label: 'Minden piaci', names: db.market.map((p) => p.name) },
    { label: 'Mindenki', names: [...teacherNames, ...formerTeacherNames(teacherNames, db), ...db.students.map((p) => p.name), ...db.institution.map((p) => p.name), ...db.alumni.map((p) => p.name), ...db.opponents.map((p) => p.name), ...db.market.map((p) => p.name)] },
  ];

  const missing = selected.filter((n) => !emailOf(db, n));

  return (
    <div className="field full">
      <div className="nm-row">
        <span className="nm-hint" title="Egy koppintás lecseréli a teljes címzett-listát">Gyors:</span>
        <div className="chipradio">
          {groups.map((p) => {
            const names = [...new Set(p.names)];
            return (
              <button key={p.label} type="button" className="crx c-blue" disabled={!names.length}
                title={names.length ? `${names.length} név - a lista cseréje` : 'Még üres (a Névjegyzékben tölthető fel)'}
                onClick={() => setSel(names)}>{p.label}{names.length ? ` (${names.length})` : ''}</button>
            );
          })}
          <button type="button" className="crx c-grey" title="Minden címzett törlése" onClick={() => onChange([], [])}>✕ Senki</button>
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
              title={statusSets[id].size ? `${statusSets[id].size} név` : 'Még senki nincs ilyen státuszra címkézve'}
              onClick={() => { setKindFilter(''); setStatusFilter((v) => (v === id ? '' : id)); }}>
              <span className={`pb ${id[0].toLowerCase()}`}>{id[0]}</span>{id.slice(2)}
            </button>
          ))}
        </div>
      </div>

      <div className="pp-selrow">
        <span className="pp-selcount">{selected.length + adhoc.length || 'Nincs'} címzett</span>
        {(selected.length + adhoc.length) > 0 && (
          <button type="button" className="chip chip--danger" title="Senki - minden kijelölt törlése" onClick={() => onChange([], [])}>Senki</button>
        )}
        {adhoc.map((e) => (
          <button key={e} type="button" className="chip is-on pp-selchip" title="Egyedi email-címzett - kattints a levételhez" onClick={() => removeAdhoc(e)}>@ {e}<span className="pp-x">✕</span></button>
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
      {(kindFilter || statusFilter || rq.trim()) ? (
        <div className="cat-picker pp-picker pp-scroll">
          {roster
            .filter((r) => (!kindFilter || r.kind === kindFilter)
              && (!statusFilter || statusSets[statusFilter]?.has(r.name))
              && (!rq.trim() || normName(r.name).includes(normName(rq))))
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
        <div className="pp-nohit">A teljes névfal nem jelenik meg magától - használd a Gyors csoportokat, keress névre, vagy nyisd meg fent egy listát.</div>
      )}

      <div className="nm-row">
        <span className="nm-hint" title="Listán kívüli címzett közvetlen email-címmel">Egyedi email:</span>
        <input className="nm-search" style={{ maxWidth: 280 }} type="email" value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAdhocEmail(); } }}
          placeholder="cim@example.com (Enter)" />
        <button type="button" className="chip" onClick={addAdhocEmail}>+ email</button>
      </div>

      {missing.length > 0 && <div className="nm-missing">⚠ Nincs email-címük (kimaradnak): {missing.join(', ')}. A Névjegyzékben pótolható.</div>}
    </div>
  );
}
