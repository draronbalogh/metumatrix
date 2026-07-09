'use client';

import { memo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Course, catList, specShort, groupClass } from '@/data/curriculum';

interface CourseData {
  course: Course;
  ci: number;
  xi: number;
  dim?: boolean;
  hit?: boolean;
  onEdit: (ci: number, xi: number) => void;
  onDetails: (ci: number, xi: number) => void;
  onCategory: (cat: string) => void;
  onCatEdit: (ci: number, xi: number, x: number, y: number) => void;
}

export const CourseNode = memo(function CourseNode({ data }: { data: CourseData }) {
  const x = data.course;
  const ea = x.courseType === 'előadás';
  // saját dupla-kattintás felismerés: a natív dblclick-et a d3-drag elnyeli húzható node-okon,
  // a click viszont mindkét (zárolt/feloldott) módban megbízhatóan megérkezik
  const lastClick = useRef(0);
  const onCardClick = () => {
    const now = Date.now();
    if (now - lastClick.current < 350) { lastClick.current = 0; data.onDetails(data.ci, data.xi); }
    else lastClick.current = now;
  };
  return (
    <div
      className={`cn-card ${groupClass(x)}${data.dim ? ' dim' : ''}${data.hit ? ' hit' : ''}`}
      onClick={onCardClick}
      title="Egy kattintás: kijelölés (F = fókusz) · dupla kattintás: részletek/szerkesztés"
    >
      <Handle type="target" position={Position.Top} id="tt" className="hdl in hdl-v" />
      <Handle type="target" position={Position.Left} id="tl" className="hdl in hdl-h" />
      <Handle type="source" position={Position.Bottom} id="sb" className="hdl out hdl-v" />
      <Handle type="source" position={Position.Right} id="sr" className="hdl out hdl-h" />

      <button className="cn-edit nodrag" title="Szerkesztés" onClick={(e) => { e.stopPropagation(); data.onEdit(data.ci, data.xi); }}>✎</button>
      <div className="cn-accent" />
      <div className="cn-name">{x.name}</div>
      <div className={`cn-okt${x.instructors ? '' : ' none'}`}>
        {x.instructors ? x.instructors : 'oktató: —'}
      </div>
      <div className="cn-meta">
        <span className={`cn-tag${ea ? ' ea' : ''}`}>{ea ? 'előadás' : 'gyakorlat'}</span>
        {x.hours != null && <span className="cn-h">{x.hours} óra</span>}
        <span className="cn-kr">{x.credits ?? '–'} kr</span>
        {x.specialization && <span className="cn-spec">{specShort(x.specialization)}</span>}
      </div>
      <div className="cn-cats">
        {catList(x).map((k) => (
          <button key={k} className="cn-cat nodrag" title={`Szűrés kategóriára: ${k}`}
            onClick={(e) => { e.stopPropagation(); data.onCategory(k); }}>{k}</button>
        ))}
        <button className="cn-cat cn-cat-add nodrag" title="Kategóriák beállítása ehhez a tárgyhoz"
          onClick={(e) => { e.stopPropagation(); data.onCatEdit(data.ci, data.xi, e.clientX, e.clientY); }}>+</button>
      </div>
      {(x.short || x.description) && (
        <div className={`cn-desc${x.short ? ' is-short' : ''}`}>{x.short || ((x.description as string).length > 140 ? (x.description as string).slice(0, 140).trimEnd() + '…' : x.description)}</div>
      )}
      {x.keywords.length > 0 && (
        <div className="cn-kws">{x.keywords.slice(0, 4).map((k) => <span key={k} className="cn-kw">{k}</span>)}</div>
      )}
      {(x.software.length > 0 || x.pdfUrl) && (
        <div className="cn-foot">
          {x.software.length > 0 && <span className="cn-soft" title={x.software.join(', ')}>{x.software.slice(0, 3).join(' · ')}</span>}
          {x.pdfUrl && <a className="cn-pdf nodrag" href={x.pdfUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} title="Tantárgyi leírás (PDF) új lapon">tematika ↗</a>}
        </div>
      )}
    </div>
  );
});

interface SemData {
  program: string;
  semester: number | null;
  label: string;
  n: number;
  cr: number;
  empty: boolean;
  ci: number;
  instructors: string[];
  activeInstr: string;
  onInstructor: (name: string) => void;
  onAdd: (ci: number) => void;
}

export const SemesterNode = memo(function SemesterNode({ data }: { data: SemData }) {
  return (
    <div className={`sem-head${data.empty ? ' empty' : ''}`}>
      <div className="sem-prog">{data.program}</div>
      <div className="sem-lbl">{data.label}</div>
      {data.empty ? (
        <button className="sem-add" onClick={() => data.onAdd(data.ci)}>+ Tárgy felvétele</button>
      ) : (
        <div className="sem-stats"><b>{data.n}</b> tárgy · <b>{data.cr}</b> kr</div>
      )}
      {data.instructors.length > 0 && (
        <div className="sem-instr">
          <div className="sem-instr-h">Oktatók</div>
          {data.instructors.map((n) => (
            <button key={n} className={`sem-ichip${data.activeInstr === n ? ' on' : ''}`}
              onClick={() => data.onInstructor(n)} title={`Szűrés erre az oktatóra: ${n}`}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
});

// Csoport-zóna („swimlane”) a mátrixban — nem interaktív, a kártyák MÖGÖTT ül (pointer-events: none a CSS-ben).
// zt/zb: a függőleges futam első/utolsó darabja (lekerekítés csak a futam tetején/alján, így a darabok egybeolvadnak)
export const FrameNode = memo(function FrameNode({ data }: { data: { g: number; w: number; h: number; zt?: boolean; zb?: boolean } }) {
  return (
    <div className={`spec-zone g${data.g}${data.zt ? ' zt' : ''}${data.zb ? ' zb' : ''}`} style={{ width: data.w, height: data.h }} />
  );
});

// A zóna-felirat KÜLÖN node, magas z-indexszel — így a piros élek (nyilak) NEM takarják ki.
export const ZoneLabelNode = memo(function ZoneLabelNode({ data }: { data: { g: number; label: string } }) {
  return <span className={`spec-zone-lbl zln g${data.g}`}>{data.label}</span>;
});

export const ProgramNode = memo(function ProgramNode({ data }: { data: { program: string; height: number } }) {
  return (
    <div className="prog-rail" style={{ height: data.height }}>
      <span>{data.program}</span>
    </div>
  );
});
