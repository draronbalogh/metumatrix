'use client';

import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, Course, catList } from '@/data/curriculum';
import GrowArea from './GrowArea';
import { ModalTabs, TabDef } from './AgendaModals';

interface Props {
  course: Course;
  cohortLabel: string;
  isNew: boolean;
  teacherNames: string[]; // az egy-forrású oktatói adatbázis (a tanterv oktató-mezőiből)
  students: string[]; // hallgatói (demonstrátor) adatbázis a people.json-ból
  onSave: (c: Course) => void;
  onDelete: () => void;
  onClose: () => void;
}

type Draft = Record<keyof Course, string>;

const toDraft = (c: Course): Draft => ({
  type: c.type ?? '',
  name: c.name ?? '',
  specialization: c.specialization ?? '',
  courseType: String(c.courseType ?? 'gyakorlat'),
  hours: c.hours == null ? '' : String(c.hours),
  credits: c.credits == null ? '' : String(c.credits),
  active: c.active == null ? '' : String(c.active),
  groups: c.groups ?? '',
  instructors: c.instructors ?? '',
  demonstrators: (c.demonstrators ?? []).join(', '),
  institute: String(c.institute ?? 'AMD'),
  note: c.note ?? '',
  description: c.description ?? '',
  short: c.short ?? '',
  felelos: c.felelos ?? '',
  prerequisite: c.prerequisite ?? '',
  requirement: c.requirement ?? '',
  software: (c.software ?? []).join(', '),
  keywords: (c.keywords ?? []).join(', '),
  category: catList(c).join(', '),
  cel: c.cel ?? '',
  pdfUrl: c.pdfUrl ?? '',
  group: c.group == null ? '' : String(c.group),
});

const toList = (v: string): string[] => v.split(',').map((s) => s.trim()).filter(Boolean);

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
};

// a Feladat/Esemény/Levél szerkesztőkkel azonos füles váz (mobilon a fülsor alul)
const EDIT_TABS: TabDef[] = [
  { id: 'alap', label: 'Alap' },
  { id: 'people', label: 'Emberek', cls: 'c-blue' },
  { id: 'content', label: 'Tartalom', cls: 'c-green' },
  { id: 'other', label: 'Egyéb', cls: 'c-purple' },
];

export default function EditModal({ course, cohortLabel, isNew, teacherNames, students, onSave, onDelete, onClose }: Props) {
  const [d, setD] = useState<Draft>(() => toDraft(course));
  const [newInstr, setNewInstr] = useState(''); // új (a listában még nem szereplő) oktató felvétele
  const [tab, setTab] = useState('alap');
  // névfal-kapuzás: a teljes oktató-/hallgatólista csak szűréskor jelenik meg
  const [instrQ, setInstrQ] = useState('');
  const [demoQ, setDemoQ] = useState('');

  // dirty-guard: módosítás után a Mégsem/overlay/Esc rákérdez a mentés nélküli bezárásra
  const dirty = useRef(false);
  const tryClose = () => { if (dirty.current && !confirm('Elmentetlen módosítások vannak. Bezárod mentés nélkül?')) return; onClose(); };
  const tryCloseRef = useRef(tryClose);
  tryCloseRef.current = tryClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') tryCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const set = (k: keyof Draft, v: string) => { dirty.current = true; setD((p) => ({ ...p, [k]: v })); };

  const save = () => {
    if (!d.name.trim()) return;
    onSave({
      type: d.type,
      name: d.name.trim(),
      specialization: d.specialization.trim() || null,
      courseType: d.courseType,
      hours: numOrNull(d.hours),
      credits: numOrNull(d.credits),
      active: numOrNull(d.active),
      groups: d.groups.trim() || null,
      instructors: d.instructors.trim() || null,
      demonstrators: toList(d.demonstrators),
      institute: d.institute,
      note: d.note.trim() || null,
      description: d.description.trim() || null,
      short: d.short.trim() || null,
      felelos: d.felelos.trim() || null,
      prerequisite: d.prerequisite.trim() || null,
      requirement: d.requirement.trim() || null,
      software: toList(d.software),
      keywords: toList(d.keywords),
      category: toList(d.category),
      cel: d.cel.trim() || null,
      pdfUrl: d.pdfUrl.trim() || null,
      group: d.group === '' ? null : Number(d.group),
    });
  };

  return (
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) tryClose(); }}>
      <div className="modal modal--wide modal--tabs">
        <h3>
          {!isNew && d.name.trim() && <span className="mh-name">{d.name.trim()}</span>}
          {isNew ? 'Új tárgy · ' : 'Tárgy szerkesztése · '}{cohortLabel}
        </h3>
        <div className="mt-sum">
          <button type="button" className="mt-chip" title="Óraszám és kredit — az Alap fülön" onClick={() => setTab('alap')}>⏱ {d.hours.trim() || '–'} óra · {d.credits.trim() || '–'} kr</button>
          <button type="button" className="mt-chip" title="Felelős és oktatók" onClick={() => setTab('people')}>👥 {toList(d.instructors).length} oktató</button>
          <button type="button" className="mt-chip" title="Kategóriák — a Tartalom fülön" onClick={() => setTab('content')}>🏷 {toList(d.category).length} kategória</button>
          {!d.short.trim() && <button type="button" className="mt-chip mt-warn" title="A kártyán látszó rövid leírás hiányzik — a Tartalom fülön pótolhatod" onClick={() => setTab('content')}>⚠ nincs rövid leírás</button>}
        </div>
        <ModalTabs tabs={EDIT_TABS} active={tab} onPick={setTab} />
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {tab === 'alap' && (<>
          <div className="f-sec">Alapadatok</div>
          <div className="field full">
            <label>Tárgy neve</label>
            <input value={d.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="field">
            <label>Tárgy típusa</label>
            <select value={d.type} onChange={(e) => set('type', e.target.value)}>
              <option>Kötelező</option>
              <option>Kötelező és szabváll.</option>
              <option>Szabadon választható</option>
            </select>
          </div>
          <div className="field">
            <label>Kurzus-típus</label>
            <select value={d.courseType} onChange={(e) => set('courseType', e.target.value)}>
              <option value="gyakorlat">gyakorlat</option>
              <option value="előadás">előadás</option>
            </select>
          </div>
          <div className="field full">
            <label>Specializáció</label>
            <select value={d.specialization} onChange={(e) => set('specialization', e.target.value)}>
              <option value="">Közös tárgy (nincs specializáció)</option>
              <option value="Multimédia specializáció">Multimédia specializáció — kék zóna</option>
              <option value="Játéktervezés specializáció">Játéktervezés specializáció — lila zóna</option>
              {d.specialization && !['Multimédia specializáció', 'Játéktervezés specializáció'].includes(d.specialization) && (
                <option value={d.specialization}>{d.specialization}</option>
              )}
            </select>
          </div>
          <div className="field full">
            <label>Besorolás / szín (kézi felülbírálás)</label>
            <select value={d.group} onChange={(e) => set('group', e.target.value)}>
              <option value="">Automatikus (specializáció + típus szerint)</option>
              <option value="0">Közös gyakorlati — zöld</option>
              <option value="1">Multimédia specializáció — kék</option>
              <option value="2">Játéktervezés specializáció — lila</option>
              <option value="3">Elméleti — sárga</option>
            </select>
          </div>
          <div className="f-sec c-yellow">Óraszám, létszám, kredit</div>
          <div className="field">
            <label>Heti óraszám</label>
            <input type="number" min={0} value={d.hours} onChange={(e) => set('hours', e.target.value)} />
          </div>
          <div className="field">
            <label>Kredit</label>
            <input type="number" min={0} value={d.credits} onChange={(e) => set('credits', e.target.value)} />
          </div>
          <div className="field">
            <label>Aktív létszám</label>
            <input type="number" min={0} value={d.active} onChange={(e) => set('active', e.target.value)} />
          </div>
          <div className="field">
            <label>Tervezett csoportszám</label>
            <input value={d.groups} onChange={(e) => set('groups', e.target.value)} placeholder="pl. 2 vagy ??" />
          </div>
          </>)}
          {tab === 'people' && (<>
          <div className="f-sec c-blue">Felelős és oktatók</div>
          <div className="field">
            <label>Intézet</label>
            <select value={d.institute} onChange={(e) => set('institute', e.target.value)}>
              <option>AMD</option>
              <option>ELM</option>
            </select>
          </div>
          <div className="field">
            <label>Felelős — az oktatói adatbázisból</label>
            <select value={d.felelos} onChange={(e) => set('felelos', e.target.value)}>
              <option value="">— nincs —</option>
              {d.felelos && !teacherNames.includes(d.felelos) && <option value={d.felelos}>{d.felelos} (egyedi név)</option>}
              {teacherNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>Oktató(k) — {toList(d.instructors).length} kiválasztva; a kiválasztott név kattintásra lekerül</label>
            {(() => {
              const sel = toList(d.instructors);
              const toggle = (n: string) => set('instructors', (sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n]).join(', '));
              const q = instrQ.trim().toLowerCase();
              const matches = q === '' ? [] : teacherNames.filter((n) => n.toLowerCase().includes(q) && !sel.includes(n));
              return (<>
                {sel.length > 0 && (
                  <div className="cat-picker pp-picker">
                    {sel.map((n) => (
                      <button type="button" key={n} className="chip is-on" title="Kattints az eltávolításhoz" onClick={() => toggle(n)}>{n}</button>
                    ))}
                  </div>
                )}
                <input value={instrQ} onChange={(e) => setInstrQ(e.target.value)}
                  placeholder={`Szűrés névre — gépelj, és megjelenik a választható névsor (${teacherNames.length} oktató)`} />
                {q !== '' && (
                  <div className="cat-picker pp-picker pp-scroll">
                    {matches.length === 0 && <span className="nm-empty">Nincs több találat — lent új névként felveheted.</span>}
                    {matches.map((n) => (
                      <button type="button" key={n} className="chip" onClick={() => toggle(n)}>{n}</button>
                    ))}
                  </div>
                )}
              </>);
            })()}
            <div className="em-addrow">
              <input value={newInstr} onChange={(e) => setNewInstr(e.target.value)} placeholder="Új oktató neve (ha még nincs a listában)"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const n = newInstr.trim(); if (n) { set('instructors', [...toList(d.instructors), n].join(', ')); setNewInstr(''); } } }} />
              <button type="button" className="btn" onClick={() => { const n = newInstr.trim(); if (n) { set('instructors', [...toList(d.instructors), n].join(', ')); setNewInstr(''); } }}>+ Hozzáadás</button>
            </div>
          </div>
          <div className="field full">
            <label>Hallgatói demonstrátor — {toList(d.demonstrators).length} kiválasztva</label>
            {(() => {
              const sel = toList(d.demonstrators);
              const toggle = (n: string) => set('demonstrators', (sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n]).join(', '));
              const q = demoQ.trim().toLowerCase();
              const matches = q === '' ? [] : students.filter((n) => n.toLowerCase().includes(q) && !sel.includes(n));
              if (students.length === 0 && sel.length === 0) return <span className="nm-empty">Még nincs hallgató a Névjegyzékben — a ☎ Névjegyzék „Hallgatók” részében vehetsz fel.</span>;
              return (<>
                {sel.length > 0 && (
                  <div className="cat-picker pp-picker">
                    {sel.map((n) => (
                      <button type="button" key={n} className="chip is-on" title="Kattints az eltávolításhoz" onClick={() => toggle(n)}>
                        <span className="pb h">H</span>{n}
                      </button>
                    ))}
                  </div>
                )}
                <input value={demoQ} onChange={(e) => setDemoQ(e.target.value)}
                  placeholder={`Szűrés névre — gépelj, és megjelenik a hallgatói névsor (${students.length} hallgató)`} />
                {q !== '' && (
                  <div className="cat-picker pp-picker pp-scroll">
                    {matches.length === 0 && <span className="nm-empty">Nincs találat.</span>}
                    {matches.map((n) => (
                      <button type="button" key={n} className="chip" onClick={() => toggle(n)}>
                        <span className="pb h">H</span>{n}
                      </button>
                    ))}
                  </div>
                )}
              </>);
            })()}
          </div>
          </>)}
          {tab === 'content' && (<>
          <div className="f-sec c-green">Tartalom</div>
          <div className="field full">
            <label>A tárgy célja</label>
            <GrowArea minRows={4} value={d.cel} onChange={(e) => set('cel', e.target.value)} placeholder="a tárgy célja, tanulási eredmények" />
          </div>
          <div className="field full">
            <label>Rövid leírás — a kártyán ez látszik (max ~110 karakter)</label>
            <input maxLength={140} value={d.short} onChange={(e) => set('short', e.target.value)} placeholder="távirati, tartalom-első összefoglaló, pl.: Vektor- és pixelgrafika: piktogram, logó, hibrid grafikák." />
          </div>
          <div className="field full">
            <label>Összegzés — a részletek panelen látszik</label>
            <GrowArea minRows={6} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="néhány mondatos összefoglaló a tárgyról" />
          </div>
          <div className="field full">
            <label>Szoftverek (vesszővel)</label>
            <input value={d.software} onChange={(e) => set('software', e.target.value)} placeholder="pl. After Effects, Photoshop, Blender" />
          </div>
          <div className="field full">
            <label>Kulcsszavak (vesszővel)</label>
            <input value={d.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="pl. mozgógrafika, animáció, motion graphics" />
          </div>
          <div className="field full">
            <label>Kategóriák</label>
            <div className="cat-picker">
              {CATEGORIES.map((k) => {
                const sel = toList(d.category);
                const on = sel.includes(k);
                return (
                  <button type="button" key={k} className={`chip${on ? ' is-on' : ''}`}
                    onClick={() => set('category', (on ? sel.filter((s) => s !== k) : [...sel, k]).join(', '))}>{k}</button>
                );
              })}
            </div>
          </div>
          </>)}
          {tab === 'other' && (<>
          <div className="f-sec c-purple">Előfeltétel, követelmény, egyéb</div>
          <div className="field">
            <label>Előfeltétel</label>
            <input value={d.prerequisite} onChange={(e) => set('prerequisite', e.target.value)} placeholder="pl. Média design stúdiumok 1." />
          </div>
          <div className="field">
            <label>Követelmény</label>
            <input value={d.requirement} onChange={(e) => set('requirement', e.target.value)} placeholder="pl. gyakorlati jegy / kollokvium" />
          </div>
          <div className="field full">
            <label>Tematika PDF link</label>
            <input value={d.pdfUrl} onChange={(e) => set('pdfUrl', e.target.value)} placeholder="pl. /tematikak/15044.pdf" />
          </div>
          <div className="field full">
            <label>Megjegyzés</label>
            <input value={d.note} onChange={(e) => set('note', e.target.value)} />
          </div>
          </>)}
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          <span className="sp" />
          <button className="btn" onClick={tryClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}
