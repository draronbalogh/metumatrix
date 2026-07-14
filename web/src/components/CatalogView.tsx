'use client';

import { useState } from 'react';
import { Course, Curriculum, catList, cohortTotals, semLabel, specShort, courseGroup, courseRank, GROUP_LABEL } from '@/data/curriculum';
import type { Filter, View } from '@/lib/buildGraph';
import { instrList } from '@/lib/buildGraph';
import CourseCardStd from './CourseCardStd';
import PageHead from './PageHead';

interface Props {
  data: Curriculum;
  filter: Filter;
  view: View;
  onDetails: (ci: number, xi: number) => void;
  onEdit: (ci: number, xi: number) => void;
  onAdd: (ci: number) => void;
  onInstructor: (name: string) => void;
  onCategory: (cat: string) => void;
  onCatEdit: (ci: number, xi: number, x: number, y: number) => void;
  displayName?: (n: string) => string; // a Névjegyzék szerinti (titulusos) írásmód a kártyákon
}

export default function CatalogView({ data, filter, view, onDetails, onEdit, onAdd, onInstructor, onCategory, onCatEdit, displayName }: Props) {
  // félév-szűrő: 0 = mind, egyébként a kiválasztott félév blokkja látszik csak
  const [sem, setSem] = useState(0);
  const matches = (x: Course) => {
    if (filter.q) {
      const s = filter.q.toLowerCase();
      if (!(x.name.toLowerCase().includes(s) || (x.specialization || '').toLowerCase().includes(s) || (x.instructors || '').toLowerCase().includes(s) || catList(x).some((k) => k.includes(s)) || x.keywords.some((k) => k.toLowerCase().includes(s)) || x.software.some((k) => k.toLowerCase().includes(s)))) return false;
    }
    if (filter.spec && specShort(x.specialization) !== filter.spec) return false;
    if (filter.ctype && x.courseType !== filter.ctype) return false;
    if (filter.instr && !instrList(x).includes(filter.instr)) return false;
    if (filter.cat && !catList(x).includes(filter.cat)) return false;
    return true;
  };

  const allVisible = data.cohorts
    .map((c, ci) => ({ c, ci }))
    .filter(({ c }) => c.version === view.ver && (view.prog === 'ALL' || c.program === view.prog))
    .sort((a, b) => (a.c.semester || 0) - (b.c.semester || 0));

  // a jelen lévő félévek (verzió/program-váltásnál a nem létező kiválasztás = mind)
  const sems = [...new Set(allVisible.map(({ c }) => c.semester || 0))].sort((a, b) => a - b);
  const semActive = sems.includes(sem) ? sem : 0;
  const visible = semActive ? allVisible.filter(({ c }) => (c.semester || 0) === semActive) : allVisible;

  // BA+MA nézetben programonként külön blokk (saját fejléccel), egyébként egyetlen blokk
  const progs = (view.prog === 'ALL' ? (['BA', 'MA'] as const) : [view.prog]).filter((p) => view.prog !== 'ALL' || visible.some(({ c }) => c.program === p));

  return (
    <main className="catalog">
      <PageHead title="🗂️ Katalógus" sub={`Média Design ${view.prog === 'ALL' ? 'BA + MA' : view.prog} · ${view.ver}`} />
      {allVisible.length > 0 && (
        <div className="viewtoggle cat-semfilter">
          <button className={!semActive ? 'is-on' : ''} onClick={() => setSem(0)}>Mind</button>
          {sems.map((s) => (
            <button key={s} className={semActive === s ? 'is-on' : ''} onClick={() => setSem(s)}>{semLabel(s)}</button>
          ))}
        </div>
      )}
      {visible.length === 0 && (
        <>
          <PageHead title={view.prog === 'ALL' ? 'BA+MA' : view.prog} sub={`Média Design ${view.prog === 'ALL' ? 'BA + MA' : view.prog} · ${view.ver}`} />
          <div className="cc-empty"><span>Ehhez a verzióhoz / programhoz nincs adat.</span></div>
        </>
      )}

      {progs.map((p) => (
        <div key={p}>
          <PageHead title={p} sub={`Média Design ${p} · ${view.ver}`} />
          {visible.filter(({ c }) => c.program === p).map(({ c, ci }) => {
        const t = cohortTotals(c);
        const isSpring = (c.semester || 0) % 2 === 0;
        const instrSet = new Set<string>();
        c.courses.forEach((x) => instrList(x).forEach((n) => instrSet.add(n)));
        const instructors = [...instrSet].sort((a, b) => a.localeCompare(b, 'hu'));

        const shown = c.courses.map((x, xi) => ({ x, xi })).filter(({ x }) => matches(x))
          .sort((a, b) => courseGroup(a.x) - courseGroup(b.x) || courseRank(a.x) - courseRank(b.x) || a.xi - b.xi);
        const groups: { g: number; items: { x: Course; xi: number }[] }[] = [];
        shown.forEach((it) => {
          const g = courseGroup(it.x);
          const last = groups[groups.length - 1];
          if (last && last.g === g) last.items.push(it);
          else groups.push({ g, items: [it] });
        });

        return (
          <section className="cc-section" key={ci}>
            <div className="cc-head">
              <div className="cc-sem">{semLabel(c.semester)} {isSpring && <span className="spring">· tavasz</span>}</div>
              {c.courses.length > 0 && (
                <div className="cc-totals">
                  <div><b>{t.n}</b><span>tárgy</span></div>
                  <div><b>{t.cr}</b><span>kredit</span></div>
                  <div><b>{t.h}</b><span>óra</span></div>
                </div>
              )}
            </div>
            {instructors.length > 0 && (
              <div className="cc-instr">
                <span className="cc-instr-h">Oktatók</span>
                {instructors.map((n) => (
                  <button key={n} className={`sem-ichip${filter.instr === n ? ' on' : ''}`} onClick={() => onInstructor(n)} title={`Szűrés erre az oktatóra: ${n}`}>{n}</button>
                ))}
              </div>
            )}
            {c.courses.length === 0 ? (
              <div className="cc-empty">
                <span>Ehhez a félévhez még nincs feltöltve tárgy.</span>
                <button onClick={() => onAdd(ci)}>+ Tárgy felvétele</button>
              </div>
            ) : shown.length === 0 ? (
              <div className="cc-empty"><span>Nincs a szűrőnek megfelelő tárgy.</span></div>
            ) : (
              groups.map(({ g, items }) => (
                <div key={g}>
                  <div className={`cc-grp g${g}`}>{GROUP_LABEL[g]}</div>
                  <div className="cc-grid">
                    {items.map(({ x, xi }) => (
                      <CourseCardStd key={xi} course={x} displayName={displayName} onDetails={() => onDetails(ci, xi)} onEdit={() => onEdit(ci, xi)} onCategory={onCategory} onCatEdit={(mx, my) => onCatEdit(ci, xi, mx, my)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        );
          })}
        </div>
      ))}
    </main>
  );
}
