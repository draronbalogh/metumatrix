'use client';

import { Course, catList, specShort, groupClass } from '@/data/curriculum';

interface Props {
  course: Course;
  onDetails: () => void;
  onEdit: () => void;
  onCategory: (cat: string) => void;
}

export default function CourseCardStd({ course: x, onDetails, onEdit, onCategory }: Props) {
  const ea = x.courseType === 'előadás';
  return (
    <div className={`cc-card ${groupClass(x)}`} onClick={onDetails}>
      <div className="cc-accent" />
      <button className="cc-edit" title="Szerkesztés" onClick={(e) => { e.stopPropagation(); onEdit(); }}>✎</button>
      <div className="cc-name">{x.name}</div>
      <div className={`cc-okt${x.instructors ? '' : ' none'}`}>{x.instructors || 'oktató: —'}</div>
      <div className="cc-meta">
        <span className={`cc-tag${ea ? ' ea' : ''}`}>{ea ? 'előadás' : 'gyakorlat'}</span>
        {x.hours != null && <span className="cc-h">{x.hours} óra</span>}
        {x.specialization && <span className="cc-spec">{specShort(x.specialization)}</span>}
        <span className="cc-kr">{x.credits ?? '–'} kr</span>
      </div>
      {catList(x).length > 0 && (
        <div className="cc-cats">
          {catList(x).map((k) => (
            <button key={k} className="cc-cat" title={`Szűrés kategóriára: ${k}`}
              onClick={(e) => { e.stopPropagation(); onCategory(k); }}>{k}</button>
          ))}
        </div>
      )}
      {(x.short || x.description) && (
        <div className="cc-desc">{x.short || ((x.description as string).length > 220 ? (x.description as string).slice(0, 220).trimEnd() + '…' : x.description)}</div>
      )}
      {x.keywords.length > 0 && (
        <div className="cc-kws">{x.keywords.slice(0, 5).map((k) => <span key={k} className="cc-kw">{k}</span>)}</div>
      )}
      {(x.software.length > 0 || x.pdfUrl) && (
        <div className="cc-foot">
          {x.software.length > 0 && <span className="cc-soft" title={x.software.join(', ')}>{x.software.slice(0, 4).join(' · ')}</span>}
          {x.pdfUrl && <a className="cc-pdf" href={x.pdfUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Tantárgyi leírás (PDF) új lapon">tematika ↗</a>}
        </div>
      )}
    </div>
  );
}
