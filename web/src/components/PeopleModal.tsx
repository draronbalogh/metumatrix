'use client';

import { useEffect, useState } from 'react';
import { PeopleDB, PeopleGroup, Person, normalizePhone, TEACHER_STATUSES, STUDENT_STATUSES } from '@/data/people';
import GrowArea from './GrowArea';

interface Props {
  teacherNames: string[]; // a tantervből — itt nem szerkeszthető, csak elérhetőség adható hozzá
  db: PeopleDB;
  onSave: (db: PeopleDB) => void;
  onClose: () => void;
}

// Egységes rubrikák MINDEN listán: név, email, telefon, titulus, terület (+ státusz a tanár/hallgató listán)
interface Row { name: string; email: string; phone: string; title: string; field: string; status: string; }

const toRow = (name: string, p?: Person): Row => ({ name, email: p?.email ?? '', phone: p?.phone ?? '', title: p?.title ?? '', field: p?.field ?? '', status: p?.status ?? '' });
const toPerson = (r: Row): Person => ({ name: r.name.trim(), email: r.email.trim() || null, phone: normalizePhone(r.phone.trim() || null), title: r.title.trim() || null, field: r.field.trim() || null, status: r.status.trim() || null });
const EMPTY_ROW: Row = { name: '', email: '', phone: '', title: '', field: '', status: '' };
const hasData = (r: Row): boolean => !!(r.email.trim() || r.phone.trim() || r.title.trim() || r.field.trim() || r.status.trim());
// ékezet-független keresés minden mezőben
const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const rowMatch = (r: Row, q: string): boolean => !q.trim() || norm(`${r.name} ${r.email} ${r.phone} ${r.title} ${r.field} ${r.status}`).includes(norm(q));

type Sec = '' | 'T' | 'H' | 'I' | 'A' | 'O' | 'P' | 'G';

// Kibővített kapcsolat-lista (intézményi / alumni / opponens / piaci): 5 egységes mező
function ContactSection({ label, note, rows, setRows, q }: { label: string; note: string; rows: Row[]; setRows: (f: (r: Row[]) => Row[]) => void; q: string }) {
  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, ix) => (ix === i ? { ...r, [k]: v } : r)));
  const visible = rows.map((r, i) => ({ r, i })).filter(({ r }) => rowMatch(r, q));
  return (
    <>
      <div className="pm-sec">{label} · {rows.length}{q.trim() && visible.length !== rows.length ? ` (találat: ${visible.length})` : ''}</div>
      <div className="pm-note">{note}</div>
      <div className="pm-rows">
        {visible.length > 0 && <div className="pm-row pm-row5 pm-head"><span>Név</span><span>Email</span><span>Telefon</span><span>Titulus</span><span>Terület</span><span /></div>}
        {visible.map(({ r, i }) => (
          <div className="pm-row pm-row5" key={i}>
            <input value={r.name} placeholder="Név" onChange={(e) => set(i, 'name', e.target.value)} />
            <input type="email" value={r.email} placeholder="email" onChange={(e) => set(i, 'email', e.target.value)} />
            <input type="tel" value={r.phone} placeholder="+36…" onChange={(e) => set(i, 'phone', e.target.value)} />
            <input value={r.title} placeholder="titulus" onChange={(e) => set(i, 'title', e.target.value)} />
            <input value={r.field} placeholder="terület" onChange={(e) => set(i, 'field', e.target.value)} />
            <button className="btn btn--danger pm-del" title="Törlés a listából" onClick={() => setRows((rs) => rs.filter((_, ix) => ix !== i))}>✕</button>
          </div>
        ))}
        <button className="btn pm-add" onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}>+ Új kapcsolat</button>
      </div>
    </>
  );
}

export default function PeopleModal({ teacherNames, db, onSave, onClose }: Props) {
  const [teachers, setTeachers] = useState<Row[]>(() => {
    const byName: Record<string, Person> = {};
    db.teachers.forEach((p) => { byName[p.name] = p; });
    // a tantervi névsor a vezérfonal; a fájlban maradt (már nem aktuális) oktató-kontaktok a lista végén
    const extra = db.teachers.filter((p) => !teacherNames.includes(p.name));
    return [...teacherNames.map((n) => toRow(n, byName[n])), ...extra.map((p) => toRow(p.name, p))];
  });
  const [students, setStudents] = useState<Row[]>(() => db.students.map((p) => toRow(p.name, p)));
  const [institution, setInstitution] = useState<Row[]>(() => db.institution.map((p) => toRow(p.name, p)));
  const [alumni, setAlumni] = useState<Row[]>(() => db.alumni.map((p) => toRow(p.name, p)));
  const [opponents, setOpponents] = useState<Row[]>(() => (db.opponents ?? []).map((p) => toRow(p.name, p)));
  const [market, setMarket] = useState<Row[]>(() => db.market.map((p) => toRow(p.name, p)));
  const [groups, setGroups] = useState<PeopleGroup[]>(() => db.groups.map((g) => ({ name: g.name, members: [...g.members] })));
  const [signature, setSignature] = useState(db.signature);
  const [signatureLinks, setSignatureLinks] = useState(db.signatureLinks);
  // kereső + tábla-szűrő: nem kell végiggörgetni, választható, melyik listában keresel
  const [pq, setPq] = useState('');
  const [psec, setPsec] = useState<Sec>('');
  const show = (s: Sec) => psec === '' || psec === s;
  // választható tagok: tantervi tanárok + az itt szerkesztett összes lista
  const memberPool = [
    ...teacherNames,
    ...students.map((s) => s.name), ...institution.map((s) => s.name),
    ...alumni.map((s) => s.name), ...opponents.map((s) => s.name), ...market.map((s) => s.name),
  ].filter(Boolean);

  const setGroupName = (i: number, v: string) => setGroups((gs) => gs.map((g, ix) => (ix === i ? { ...g, name: v } : g)));
  const toggleMember = (i: number, name: string) => setGroups((gs) => gs.map((g, ix) => (ix === i ? { ...g, members: g.members.includes(name) ? g.members.filter((m) => m !== name) : [...g.members, name] } : g)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setT = (i: number, k: keyof Row, v: string) =>
    setTeachers((rows) => rows.map((r, ix) => (ix === i ? { ...r, [k]: v } : r)));
  const setS = (i: number, k: keyof Row, v: string) =>
    setStudents((rows) => rows.map((r, ix) => (ix === i ? { ...r, [k]: v } : r)));

  const save = () => {
    onSave({
      // tanárból azt tároljuk, akihez bármilyen adat tartozik — a névsor forrása úgyis a tanterv
      teachers: teachers.filter(hasData).map(toPerson),
      students: students.filter((r) => r.name.trim()).map(toPerson),
      institution: institution.filter((r) => r.name.trim()).map(toPerson),
      alumni: alumni.filter((r) => r.name.trim()).map(toPerson),
      opponents: opponents.filter((r) => r.name.trim()).map(toPerson),
      market: market.filter((r) => r.name.trim()).map(toPerson),
      groups: groups.filter((g) => g.name.trim()).map((g) => ({ name: g.name.trim(), members: g.members })),
      signature,
      signatureLinks,
    });
  };

  const tVisible = teachers.map((r, i) => ({ r, i })).filter(({ r }) => rowMatch(r, pq));
  const sVisible = students.map((r, i) => ({ r, i })).filter(({ r }) => rowMatch(r, pq));

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide">
        <h3>☎ Névjegyzék — elérhetőségek</h3>
        <div className="pm-body">
          <div className="pm-toolbar">
            <input className="nm-search pm-search" value={pq} onChange={(e) => setPq(e.target.value)}
              placeholder="Keresés mindenben: név, email, titulus, terület, státusz…" />
            <div className="cat-picker pm-secpick">
              {([['', 'Mind'], ['T', 'Oktatók'], ['H', 'Hallgatók'], ['I', 'Intézményi'], ['A', 'Alumni'], ['O', 'Opponensek'], ['P', 'Piaci'], ['G', 'Csoportok']] as [Sec, string][]).map(([v, l]) => (
                <button key={v || 'mind'} type="button" className={`chip${psec === v ? ' is-on' : ''}`}
                  onClick={() => setPsec((cur) => (cur === v ? '' : v))}>{l}</button>
              ))}
            </div>
          </div>
          {show('T') && (
            <>
              <div className="pm-sec"><span className="pb t">T</span> Aktuális oktatók · {teacherNames.length} <span className="pm-sec-extra">+ volt / külsős kontakt · {teachers.length - teacherNames.length}</span></div>
              <div className="pm-note">A tanárnévsor forrása a tanterv — itt az elérhetőség és a státusz (főállású / óraadó) adható meg; a státusz alapján a levélírásban külön körök választhatók.</div>
              <div className="pm-rows">
                {tVisible.length > 0 && <div className="pm-row pm-row6 pm-head"><span>Név</span><span>Email</span><span>Telefon</span><span>Titulus</span><span>Terület</span><span>Státusz</span><span /></div>}
                {tVisible.map(({ r, i }) => (
                  <div className="pm-row pm-row6" key={`t-${r.name}`}>
                    <span className="pm-name">{r.name}{!teacherNames.includes(r.name) && <em className="pm-former" title="A tantervben már nem szerepel — volt vagy külsős oktató-kontakt"> volt/külsős</em>}</span>
                    <input type="email" value={r.email} placeholder="email@metropolitan.hu" onChange={(e) => setT(i, 'email', e.target.value)} />
                    <input type="tel" value={r.phone} placeholder="+36…" onChange={(e) => setT(i, 'phone', e.target.value)} />
                    <input value={r.title} placeholder="titulus" onChange={(e) => setT(i, 'title', e.target.value)} />
                    <input value={r.field} placeholder="terület" onChange={(e) => setT(i, 'field', e.target.value)} />
                    <select value={r.status} onChange={(e) => setT(i, 'status', e.target.value)} title="Főállású vagy óraadó — a levélírás külön köreihez">
                      <option value="">státusz…</option>
                      {TEACHER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span />
                  </div>
                ))}
              </div>
            </>
          )}
          {show('H') && (
            <>
              <div className="pm-sec"><span className="pb h">H</span> Aktuális hallgatók · {students.length}</div>
              <div className="pm-note">A státusz jelöli, ki vesz részt a szervezésben (szervező / nagykövet / képviselő / demonstrátor) — ők a levélírásban „Hallgatói szervezők" körként egyben címezhetők. A végzettek az Alumni listában vannak.</div>
              <div className="pm-rows">
                {sVisible.length > 0 && <div className="pm-row pm-row6 pm-head"><span>Név</span><span>Email</span><span>Telefon</span><span>Titulus</span><span>Terület</span><span>Státusz</span><span /></div>}
                {sVisible.map(({ r, i }) => (
                  <div className="pm-row pm-row6" key={`s-${i}`}>
                    <input value={r.name} placeholder="Név" onChange={(e) => setS(i, 'name', e.target.value)} />
                    <input type="email" value={r.email} placeholder="email" onChange={(e) => setS(i, 'email', e.target.value)} />
                    <input type="tel" value={r.phone} placeholder="+36…" onChange={(e) => setS(i, 'phone', e.target.value)} />
                    <input value={r.title} placeholder="titulus / szerep" onChange={(e) => setS(i, 'title', e.target.value)} />
                    <input value={r.field} placeholder="évfolyam / terület" onChange={(e) => setS(i, 'field', e.target.value)} />
                    <select value={r.status} onChange={(e) => setS(i, 'status', e.target.value)} title="Szervezői szerep — a Hallgatói szervezők levél-körhöz">
                      <option value="">státusz…</option>
                      {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn btn--danger pm-del" title="Hallgató törlése a listából"
                      onClick={() => setStudents((rows) => rows.filter((_, ix) => ix !== i))}>✕</button>
                  </div>
                ))}
                <button className="btn pm-add" onClick={() => setStudents((rows) => [...rows, { ...EMPTY_ROW }])}>+ Új hallgató</button>
              </div>
            </>
          )}
          {show('I') && <ContactSection q={pq} label="🏛 Intézményi kapcsolatok" note="Marketing, PR, továbbképzési központ, más tanszékek elérhetőségei — címzettként mindenhol választhatók." rows={institution} setRows={setInstitution} />}
          {show('A') && <ContactSection q={pq} label="🎓 Alumni" note="METU-t végzett volt hallgatók: titulus és terület, ahol dolgoznak. A volt oktatók kontaktja a Tanárok lista végén marad (volt/külsős jelöléssel)." rows={alumni} setRows={setAlumni} />}
          {show('O') && <ContactSection q={pq} label="⚖ Opponensek / diploma-opponensek" note="A záróvizsgák és diplomavédések bírálói — a levélírásban a Minden opponens körrel egyben címezhetők." rows={opponents} setRows={setOpponents} />}
          {show('P') && <ContactSection q={pq} label="🤝 Piaci kapcsolatok" note="Ipari, céges és egyéb külső partnerek." rows={market} setRows={setMarket} />}
          {show('G') && (
            <>
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
            </>
          )}
          {psec === '' && (
            <>
              <div className="pm-sec">✒ Hivatalos aláírás — a levélben ki-be kapcsolható</div>
              <div className="field full">
                <GrowArea minRows={6} value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
              <div className="pm-sec">🔗 Szakos linkek — MINDIG a levél legalján, elválasztó vonal után</div>
              <div className="field full">
                <GrowArea minRows={5} value={signatureLinks} onChange={(e) => setSignatureLinks(e.target.value)} />
              </div>
            </>
          )}
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
