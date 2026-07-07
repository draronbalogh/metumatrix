'use client';

import { useEffect, useState } from 'react';
import { CATEGORIES, Course, catList } from '@/data/curriculum';

interface Props {
  course: Course;
  cohortLabel: string;
  isNew: boolean;
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

export default function EditModal({ course, cohortLabel, isNew, onSave, onDelete, onClose }: Props) {
  const [d, setD] = useState<Draft>(() => toDraft(course));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k: keyof Draft, v: string) => setD((p) => ({ ...p, [k]: v }));

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
    <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--wide">
        <h3>{isNew ? 'Új tárgy · ' : 'Tárgy szerkesztése · '}{cohortLabel}</h3>
        <form className="f" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="f-sec">Alapadatok</div>
          <div className="field full">
            <label>Tárgy neve</label>
            <input autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} required />
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
          <div className="f-sec c-blue">Felelős és oktatók</div>
          <div className="field">
            <label>Intézet</label>
            <select value={d.institute} onChange={(e) => set('institute', e.target.value)}>
              <option>AMD</option>
              <option>ELM</option>
            </select>
          </div>
          <div className="field">
            <label>Felelős</label>
            <input value={d.felelos} onChange={(e) => set('felelos', e.target.value)} placeholder="tárgyfelelős" />
          </div>
          <div className="field">
            <label>Oktató(k)</label>
            <input value={d.instructors} onChange={(e) => set('instructors', e.target.value)} placeholder="oktató neve" />
          </div>
          <div className="f-sec c-green">Tartalom</div>
          <div className="field full">
            <label>A tárgy célja</label>
            <textarea rows={4} value={d.cel} onChange={(e) => set('cel', e.target.value)} placeholder="a tárgy célja, tanulási eredmények" />
          </div>
          <div className="field full">
            <label>Rövid leírás — a kártyán ez látszik (max ~110 karakter)</label>
            <input maxLength={140} value={d.short} onChange={(e) => set('short', e.target.value)} placeholder="távirati, tartalom-első összefoglaló, pl.: Vektor- és pixelgrafika: piktogram, logó, hibrid grafikák." />
          </div>
          <div className="field full">
            <label>Összegzés — a részletek panelen látszik</label>
            <textarea rows={6} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="néhány mondatos összefoglaló a tárgyról" />
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
        </form>
        <div className="mfoot">
          {!isNew && <button className="btn btn--danger" onClick={onDelete}>Törlés</button>}
          <span className="sp" />
          <button className="btn" onClick={onClose}>Mégsem</button>
          <button className="btn btn--ink" onClick={save}>Mentés</button>
        </div>
      </div>
    </div>
  );
}
