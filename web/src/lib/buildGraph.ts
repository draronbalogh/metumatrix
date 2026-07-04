import { Node, Edge, MarkerType } from 'reactflow';
import { Course, Curriculum, catList, semLabel, specShort, courseGroup, courseRank } from '@/data/curriculum';

export interface Filter { q: string; spec: string; ctype: string; instr: string; cat: string; }
export type Prog = 'BA' | 'MA' | 'ALL';
export interface View { ver: string; prog: Prog; }
export interface Handlers {
  onEdit: (ci: number, xi: number) => void;
  onDetails: (ci: number, xi: number) => void;
  onAdd: (ci: number) => void;
  onInstructor: (name: string) => void;
  onCategory: (cat: string) => void;
  onCatEdit: (ci: number, xi: number, x: number, y: number) => void;
}

export const GRID = 24;
const PROG_X = -288;
const HEADER_X = 0;
export const COURSE_X0 = 280;
export const STEP_X = 320;
export const ROW_H = 296;
const CARD_TOP = 40;

const buildEdge = {
  type: 'default',
  animated: true,
  style: { stroke: '#d7144b', strokeWidth: 2.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#d7144b', width: 20, height: 20 },
};

export function instrList(c: { instructors: string | null }): string[] {
  return (c.instructors || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// A sorszámozott láncok bázisa (minden szám eltávolítva) + a ZÁRÓ sorszám (pl. "3D labor 1." → 1, nem 3).
function baseAndNum(name: string): { base: string; num: number | null } {
  const nums = name.match(/\d+/g);
  const num = nums ? parseInt(nums[nums.length - 1], 10) : null;
  const base = name.toLowerCase().replace(/[().]/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  return { base, num };
}

// BA+MA nézetben a programok blokkjai közé eső üres sáv — elég nagy, hogy a csoport-zónák
// futamai (MapView buildZones, ROW_H*1.6 küszöb) ne olvadjanak át a programhatáron.
const PROG_GAP = ROW_H;
const PROG_ORDER: Record<string, number> = { BA: 0, MA: 1 };

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  // node-id -> y-eltolás: a mentett pozíciók kanonikus tere az egy-programos nézet;
  // BA+MA nézetben az MA-blokk node-jait ennyivel kell lejjebb tolni (mentéskor visszavonni).
  offsets: Record<string, number>;
}

export function buildGraph(data: Curriculum, filter: Filter, h: Handlers, view: View): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const offsets: Record<string, number> = {};

  const filterActive = !!(filter.q || filter.spec || filter.ctype || filter.instr || filter.cat);
  const matches = (c: Course) => {
    if (filter.q) {
      const s = filter.q.toLowerCase();
      if (!(c.name.toLowerCase().includes(s) || (c.specialization || '').toLowerCase().includes(s) || (c.instructors || '').toLowerCase().includes(s) || catList(c).some((k) => k.includes(s)) || c.keywords.some((k) => k.toLowerCase().includes(s)) || c.software.some((k) => k.toLowerCase().includes(s)))) return false;
    }
    if (filter.spec && specShort(c.specialization) !== filter.spec) return false;
    if (filter.ctype && c.courseType !== filter.ctype) return false;
    if (filter.instr && !instrList(c).includes(filter.instr)) return false;
    if (filter.cat && !catList(c).includes(filter.cat)) return false;
    return true;
  };

  const visible = data.cohorts
    .map((c, ci) => ({ c, ci }))
    .filter(({ c }) => c.version === view.ver && (view.prog === 'ALL' || c.program === view.prog))
    .sort((a, b) => (PROG_ORDER[a.c.program] ?? 9) - (PROG_ORDER[b.c.program] ?? 9) || (a.c.semester || 0) - (b.c.semester || 0));

  if (!visible.length) return { nodes, edges, offsets };

  const series: Record<string, { id: string; sem: number; num: number }[]> = {};
  const hitIds = new Set<string>();
  const blocks: { program: string; top: number; rows: number }[] = [];
  let y = 0;
  let rowInProg = 0;

  visible.forEach(({ c, ci }) => {
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock || lastBlock.program !== c.program) {
      if (lastBlock) y += PROG_GAP;
      blocks.push({ program: c.program, top: y, rows: 0 });
      rowInProg = 0;
    }
    blocks[blocks.length - 1].rows++;
    const rowTop = y;
    // a sor eltolása az egy-programos (kanonikus) elrendezéshez képest
    const off = rowTop - rowInProg * ROW_H;
    rowInProg++;
    if (off) {
      offsets[`sem-${ci}`] = off;
      c.courses.forEach((_, xi) => { offsets[`c-${ci}-${xi}`] = off; });
    }
    const headerId = `sem-${ci}`;
    const instrSet = new Set<string>();
    c.courses.forEach((x) => instrList(x).forEach((n) => instrSet.add(n)));
    const instructors = [...instrSet].sort((a, b) => a.localeCompare(b, 'hu'));
    nodes.push({
      id: headerId, type: 'semester',
      position: { x: HEADER_X, y: rowTop },
      data: { program: c.program, semester: c.semester, label: semLabel(c.semester), n: c.courses.length,
        cr: c.courses.reduce((a, x) => a + (x.credits || 0), 0), empty: c.courses.length === 0, ci,
        instructors, activeInstr: filter.instr, onInstructor: h.onInstructor, onAdd: h.onAdd },
      draggable: false, selectable: false,
    });

    const ordered = c.courses
      .map((course, xi) => ({ course, xi, g: courseGroup(course), r: courseRank(course) }))
      .sort((a, b) => a.g - b.g || a.r - b.r || a.xi - b.xi);

    ordered.forEach(({ course, xi }, col) => {
      const id = `c-${ci}-${xi}`;
      const hit = filterActive && matches(course);
      if (hit) hitIds.add(id);
      nodes.push({
        id, type: 'course',
        position: { x: COURSE_X0 + col * STEP_X, y: rowTop + CARD_TOP },
        data: { course, ci, xi, dim: filterActive && !hit, hit, onEdit: h.onEdit, onDetails: h.onDetails, onCategory: h.onCategory, onCatEdit: h.onCatEdit },
      });
      const { base, num } = baseAndNum(course.name);
      // programonként külön lánc — BA+MA nézetben se kössön át egyik programból a másikba
      if (num != null) (series[`${c.program}|${base}`] ||= []).push({ id, sem: c.semester || 0, num });
    });

    y += ROW_H;
  });

  blocks.forEach((b) => {
    nodes.push({
      id: `prog-${b.program}`, type: 'program',
      position: { x: PROG_X, y: b.top },
      data: { program: b.program, height: b.rows * ROW_H - 40 },
      draggable: false, selectable: false,
    });
  });

  // build-on élek: a korábbi félév a forrás (mindig lefelé mutat), és csak egymást követő sorszámok kötődnek.
  Object.values(series).forEach((arr) => {
    if (arr.length < 2) return;
    arr.sort((a, b) => a.sem - b.sem || a.num - b.num);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].sem !== arr[i + 1].sem && arr[i + 1].num === arr[i].num + 1) {
        const dim = filterActive && !(hitIds.has(arr[i].id) && hitIds.has(arr[i + 1].id));
        edges.push({ id: `b-${arr[i].id}-${arr[i + 1].id}`, source: arr[i].id, target: arr[i + 1].id, sourceHandle: 'sb', targetHandle: 'tt', className: dim ? 'edge-dim' : undefined, ...buildEdge });
      }
    }
  });

  return { nodes, edges, offsets };
}
