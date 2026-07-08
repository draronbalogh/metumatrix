'use client';

import { useEffect, useState } from 'react';
import { PeopleDB, PeopleGroup, Person, normalizePhone } from '@/data/people';

interface Props {
  teacherNames: string[]; // a tantervből — itt nem szerkeszthető, csak elérhetőség adható hozzá
  db: PeopleDB;
  onSave: (db: PeopleDB) => void;
  onClose: () => void;
}

interface Row { name: string; email: string; phone: string; }

const toRow = (name: string, p?: Person): Row => ({ name, email: p?.email ?? '', phone: p?.phone ?? '' });
const toPerson = (r: Row): Person => ({ name: r.name.trim(), email: r.email.trim() || null, phone: normalizePhone(r.phone.trim() || null) });

export default function PeopleModal({ teacherNames, db, onSave, onClose }: Props) {
  const [teachers, setTeachers] = useState<Row[]>(() => {
    const byName: Record<string, Person> = {};
    db.teachers.forEach((p) => { byName[p.name] = p; });
    // a tantervi névsor a vezérfonal; a fájlban maradt (már nem oktató) nevek elérhetőségét is megtartjuk a lista végén
    const extra = db.teachers.filter((p) => !teacherNames.includes(p.name));
    return [...teacherNames.map((n) => toRow(n, byName[n])), ...extra.map((p) => toRow(p.name, p))];
  });
  const [students, setStudents] = useState<Row[]>(() => db.students.map((p) => toRow(p.name, p)));
  const [groups, setGroups] = useState<PeopleGroup[]>(() => db.groups.map((g) => ({ name: g.name, members: [...g.members] })));
  const [signature, setSignature] = useState(db.signature);
  // választható tagok: tantervi tanárok + az itt szerkesztett hallgatók
  const memberPool = [...teacherNames, ...students.map((s) => s.name).filter(Boolean)];

  const setGroupName = (i: number, v: string) => setGroups((gs) => gs.map((g, ix) => (ix === i ? { ...g, name: v } : g)));
  const toggleMember = (i: number, name: string) => setGroups((gs) => gs.map((g, ix) => (ix === i ? { ...g, members: g.members.includes(name) ? g.members.filter((m) => m !== name) : [...g.members, name] } : g)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setT = (i: number, k: 'email' | 'phone', v: string) =>
    setTeachers((rows) => rows.map((r, ix) => (ix === i ? { ...r, [k]: v } : r)));
  const setS = (i: number, k: keyof Row, v: string) =>
    setStudents((rows) => rows.map((r, ix) => (ix === i ? { ...r, [k]: v } : r)));

  const save = () => {
    onSave({
      // tanárból csak azt tároljuk, akinek van elérhetősége — a névsor forrása úgyis a tanterv
      teachers: teachers.filter((r) => r.email.trim() || r.phone.trim()).map(toPerson),
      students: students.filter((r) => r.name.trim()).map(toPerson),
      groups: groups.filter((g) => g.name.trim()).map((g) => ({ name: g.name.trim(), members: g.members })),
      signature,
    });
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide">
        <h3>Névjegyzék — elérhetőségek</h3>
        <div className="pm-body">
          <div className="pm-note">A tanárnévsor forrása a tanterv (Mátrix/Katalógus) — itt csak az elérhetőségük adható meg. Az email/telefon a későbbi értesítés-küldéshez kell.</div>
          <div className="pm-sec"><span className="pb t">T</span> Tanárok · {teachers.length}</div>
          <div className="pm-rows">
            <div className="pm-row pm-head"><span>Név</span><span>Email</span><span>Telefon</span><span /></div>
            {teachers.map((r, i) => (
              <div className="pm-row" key={`t-${r.name}`}>
                <span className="pm-name">{r.name}</span>
                <input type="email" value={r.email} placeholder="email@metropolitan.hu" onChange={(e) => setT(i, 'email', e.target.value)} />
                <input type="tel" value={r.phone} placeholder="+36…" onChange={(e) => setT(i, 'phone', e.target.value)} />
                <span />
              </div>
            ))}
          </div>
          <div className="pm-sec"><span className="pb h">H</span> Hallgatók / demonstrátorok · {students.length}</div>
          <div className="pm-rows">
            {students.length > 0 && <div className="pm-row pm-head"><span>Név</span><span>Email</span><span>Telefon</span><span /></div>}
            {students.map((r, i) => (
              <div className="pm-row" key={`s-${i}`}>
                <input value={r.name} placeholder="Név" onChange={(e) => setS(i, 'name', e.target.value)} />
                <input type="email" value={r.email} placeholder="email" onChange={(e) => setS(i, 'email', e.target.value)} />
                <input type="tel" value={r.phone} placeholder="+36…" onChange={(e) => setS(i, 'phone', e.target.value)} />
                <button className="btn btn--danger pm-del" title="Hallgató törlése a listából"
                  onClick={() => setStudents((rows) => rows.filter((_, ix) => ix !== i))}>✕</button>
              </div>
            ))}
            <button className="btn pm-add" onClick={() => setStudents((rows) => [...rows, { name: '', email: '', phone: '' }])}>+ Új hallgató</button>
          </div>
          <div className="pm-sec">✉ Egyedi csoportok · {groups.length}</div>
          <div className="pm-note">Elnevezett email-csoportok (pl. „Kiállítás-csapat") — az Értesítés ablakban egy gombbal hozzáadhatók a címzettekhez.</div>
          <div className="pm-groups">
            {groups.map((g, i) => (
              <div className="pm-group" key={i}>
                <div className="pm-group-head">
                  <input value={g.name} placeholder="Csoport neve" onChange={(e) => setGroupName(i, e.target.value)} />
                  <span className="pm-group-n">{g.members.length} tag</span>
                  <button className="btn btn--danger pm-del" title="Csoport törlése" onClick={() => setGroups((gs) => gs.filter((_, ix) => ix !== i))}>✕</button>
                </div>
                <div className="cat-picker pp-picker">
                  {[...new Set(memberPool)].map((name) => (
                    <button type="button" key={name} className={`chip${g.members.includes(name) ? ' is-on' : ''}`} onClick={() => toggleMember(i, name)}>{name}</button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn pm-add" onClick={() => setGroups((gs) => [...gs, { name: '', members: [] }])}>+ Új csoport</button>
          </div>
          <div className="pm-sec">✒ Aláírás — minden levél végére kerül</div>
          <div className="field full">
            <textarea rows={9} value={signature} onChange={(e) => setSignature(e.target.value)} />
          </div>
        </div>
        <div className="mfoot">
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}
