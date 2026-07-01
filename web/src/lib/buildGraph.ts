import { Node, Edge, MarkerType } from 'reactflow';
import { Course, Curriculum, semLabel, specShort, courseGroup, courseRank } from '@/data/curriculum';

export interface Filter { q: string; spec: string; ctype: string; instr: string; }
export interface View { ver: string; prog: 'BA' | 'MA'; }
export interface Handlers {
  onEdit: (ci: number, xi: number) => void;
  onDetails: (ci: number, xi: number) => void;
  onAdd: (ci: number) => void;
  onInstructor: (name: string) => void;
}

export const GRID = 24;
const PROG_X = -288;
const HEADER_X = 0;
export const COURSE_X0 = 280;
export const STEP_X = 320;
const ROW_H = 296;
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

export function buildGraph(data: Curriculum, filter: Filter, h: Handlers, view: View): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const filterActive = !!(filter.q || filter.spec || filter.ctype || filter.instr);
  const matches = (c: Course) => {
    if (filter.q) {
      const s = filter.q.toLowerCase();
      if (!(c.name.toLowerCase().includes(s) || (c.specialization || '').toLowerCase().includes(s) || (c.instructors || '').toLowerCase().includes(s))) return false;
    }
    if (filter.spec && specShort(c.specialization) !== filter.spec) return false;
    if (filter.ctype && c.courseType !== filter.ctype) return false;
    if (filter.instr && !instrList(c).includes(filter.instr)) return false;
    return true;
  };

  const visible = data.cohorts
    .map((c, ci) => ({ c, ci }))
    .filter(({ c }) => c.version === view.ver && c.program === view.prog)
    .sort((a, b) => (a.c.semester || 0) - (b.c.semester || 0));

  if (!visible.length) return { nodes, edges };

  const series: Record<string, { id: string; sem: number; num: number }[]> = {};
  const hitIds = new Set<string>();
  let y = 0;

  visible.forEach(({ c, ci }) => {
    const rowTop = y;
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
        data: { course, ci, xi, dim: filterActive && !hit, hit, onEdit: h.onEdit, onDetails: h.onDetails },
      });
      const { base, num } = baseAndNum(course.name);
      if (num != null) (series[base] ||= []).push({ id, sem: c.semester || 0, num });
    });

    y += ROW_H;
  });

  nodes.push({
    id: `prog-${view.prog}`, type: 'program',
    position: { x: PROG_X, y: 0 },
    data: { program: view.prog, height: visible.length * ROW_H - 40 },
    draggable: false, selectable: false,
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

  return { nodes, edges };
}
