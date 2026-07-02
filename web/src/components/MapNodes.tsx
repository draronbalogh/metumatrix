'use client';

import { memo } from 'react';
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
}

export const CourseNode = memo(function CourseNode({ data }: { data: CourseData }) {
  const x = data.course;
  const ea = x.courseType === 'előadás';
  return (
    <div
      className={`cn-card ${groupClass(x)}${data.dim ? ' dim' : ''}${data.hit ? ' hit' : ''}`}
      onClick={() => data.onDetails(data.ci, data.xi)}
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
      {catList(x).length > 0 && (
        <div className="cn-cats">
          {catList(x).map((k) => (
            <button key={k} className="cn-cat nodrag" title={`Szűrés kategóriára: ${k}`}
              onClick={(e) => { e.stopPropagation(); data.onCategory(k); }}>{k}</button>
          ))}
        </div>
      )}
      {x.description && <div className="cn-desc">{x.description.length > 140 ? x.description.slice(0, 140).trimEnd() + '…' : x.description}</div>}
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

export const ProgramNode = memo(function ProgramNode({ data }: { data: { program: string; height: number } }) {
  return (
    <div className="prog-rail" style={{ height: data.height }}>
      <span>{data.program}</span>
    </div>
  );
});
