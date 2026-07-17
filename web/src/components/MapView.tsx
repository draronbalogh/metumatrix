'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap, MarkerType, Panel, ConnectionLineType, SelectionMode,
  ReactFlowProvider, useNodesState, useEdgesState, useReactFlow,
  Connection, Edge, Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Course, Curriculum, EdgeLook, UserEdge, courseGroup, GROUP_LABEL } from '@/data/curriculum';
import { buildGraph, Filter, Handlers, View, GRID, COURSE_X0, STEP_X, ROW_H } from '@/lib/buildGraph';
import { ProgramNode, SemesterNode, CourseNode, FrameNode, ZoneLabelNode } from './MapNodes';

const nodeTypes = { program: ProgramNode, semester: SemesterNode, course: CourseNode, frame: FrameNode, zonelabel: ZoneLabelNode };

// Csoport-zónák („swimlane”): soronként a csoport kártyáinak befoglalója, a szomszédos sorok
// darabjai függőlegesen összeérnek, így csoportonként EGY összefüggő színes terület rajzolódik ki
// (Közös / Multimédia / Játéktervezés / külső elméleti). Akkor jelenik meg, ha a nézetben
// legalább KÉT különböző csoport van (MA-n pl. közös + ELM) - egyetlen csoportnál csak zaj lenne.
const CARD_W = 248, FR_PADX = 14, FR_PADT = 20, FR_CARDH = 288, FR_PADB = 8;
const ZONE_LABEL: Record<number, string> = { 0: 'Közös tárgyak', 1: GROUP_LABEL[1], 2: GROUP_LABEL[2], 3: GROUP_LABEL[3] };
function buildZones(nodes: Node[]): Node[] {
  const box: Record<string, { minX: number; maxX: number; minY: number; g: number }> = {};
  const present = new Set<number>();
  nodes.forEach((n) => {
    if (n.type !== 'course') return;
    const course = (n.data as { course?: Course })?.course;
    if (!course) return;
    const g = courseGroup(course);
    present.add(g);
    const key = `${(n.data as { ci: number }).ci}-${g}`;
    const b = box[key] || (box[key] = { minX: Infinity, maxX: -Infinity, minY: Infinity, g });
    b.minX = Math.min(b.minX, n.position.x); b.maxX = Math.max(b.maxX, n.position.x);
    b.minY = Math.min(b.minY, n.position.y);
  });
  if (present.size < 2) return [];
  const out: Node[] = [];
  [0, 1, 2, 3].forEach((g) => {
    const pieces = Object.values(box).filter((b) => b.g === g).sort((a, b) => a.minY - b.minY);
    // függőlegesen szomszédos sorok darabjai egy futamba (run) kerülnek -> összeérő zóna
    const runs: (typeof pieces)[] = [];
    pieces.forEach((p) => {
      const last = runs[runs.length - 1];
      if (last && p.minY - last[last.length - 1].minY < ROW_H * 1.6) last.push(p);
      else runs.push([p]);
    });
    runs.forEach((run, ri) => run.forEach((p, i) => {
      const first = i === 0, lastP = i === run.length - 1;
      const top = p.minY - FR_PADT;
      const h = lastP ? FR_CARDH + FR_PADT + FR_PADB : run[i + 1].minY - FR_PADT - top;
      out.push({
        id: `zone-${g}-${ri}-${i}`, type: 'frame',
        position: { x: p.minX - FR_PADX, y: top },
        data: { g, w: p.maxX - p.minX + CARD_W + FR_PADX * 2, h, zt: first, zb: lastP },
        draggable: false, selectable: false, focusable: false, zIndex: -1,
      });
      // a felirat külön, magas z-indexű node - a piros élek fölött marad
      if (first && ZONE_LABEL[g]) {
        out.push({
          id: `zonelbl-${g}-${ri}`, type: 'zonelabel',
          position: { x: p.minX - FR_PADX + 16, y: top - 11 },
          data: { g, label: ZONE_LABEL[g] },
          draggable: false, selectable: false, focusable: false, zIndex: 6,
        });
      }
    }));
  });
  return out;
}

export interface Persist {
  addEdge: (e: UserEdge) => void;
  deleteEdge: (id: string) => void;
  setEdgeLook: (id: string, look: EdgeLook) => void;
  moveNode: (id: string, pos: { x: number; y: number }) => void;
  savePositions: (map: Record<string, { x: number; y: number }>) => void;
  applyConnection: (e: UserEdge, positions: Record<string, { x: number; y: number }>) => void;
  resetPositions: () => void;
}

const EDGE_RED = '#d7144b';
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: EDGE_RED, width: 20, height: 20 };
// vonalstílus -> ReactFlow él-tulajdonságok
function lookProps(look?: EdgeLook): Partial<Edge> {
  switch (look) {
    case 'solid': return { type: 'default', animated: false, markerEnd: EDGE_MARKER, style: { stroke: EDGE_RED, strokeWidth: 2.5 } };
    case 'dash': return { type: 'default', animated: false, markerEnd: EDGE_MARKER, style: { stroke: EDGE_RED, strokeWidth: 2.5, strokeDasharray: '9 6' } };
    case 'dot': return { type: 'default', animated: false, markerEnd: EDGE_MARKER, style: { stroke: EDGE_RED, strokeWidth: 3, strokeDasharray: '0.5 8', strokeLinecap: 'round' } };
    default: return { type: 'default', animated: true, markerEnd: EDGE_MARKER, style: { stroke: EDGE_RED, strokeWidth: 2.5 } };
  }
}
const EDGE_LOOKS: { id: EdgeLook; label: string; dash?: string; anim?: boolean }[] = [
  { id: 'anim', label: 'Animált - folyamatosságot, egymásra épülést mutat', dash: '7 5', anim: true },
  { id: 'solid', label: 'Folyamatos vonal' },
  { id: 'dash', label: 'Szaggatott vonal' , dash: '9 6' },
  { id: 'dot', label: 'Pontozott vonal', dash: '0.5 8' },
];

interface Props {
  data: Curriculum;
  filter: Filter;
  handlers: Handlers;
  persist: Persist;
  theme: 'light' | 'dark';
  view: View;
  locked: boolean;
  onToggleLock: () => void;
  active: boolean;   // a Mátrix épp látszik-e (nézetváltáskor nem mountolunk újra, csak ezt kapcsoljuk)
  focusId: string | null; // a drawerben megnyitott kártya node-id-je (F billentyűs fókuszhoz)
}

function Inner({ data, filter, handlers, persist, theme, view, locked, onToggleLock, active, focusId }: Props) {
  const dark = theme === 'dark';
  const [legendOpen, setLegendOpen] = useState(false);
  // terület-kijelölés mód: húzásra jelöl (mutatóegér), a pásztázás középső/jobb gombbal marad.
  // Egeres (asztali) gépen ez az alapértelmezés; érintőkijelzőn a pásztázás marad az alap.
  const [selectMode, setSelectMode] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches);
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number; look: EdgeLook } | null>(null);
  const built = useMemo(() => buildGraph(data, filter, handlers, view), [data, filter, handlers, view]);

  const initNodes = useMemo<Node[]>(
    () => {
      // a mentett pozíciók kanonikus tere az egy-programos nézet - BA+MA nézetben a blokk-eltolással toljuk le
      const positioned = built.nodes.map((n) => {
        const p = data.positions?.[n.id];
        if (!p) return n;
        const off = built.offsets[n.id] || 0;
        return { ...n, position: { x: p.x, y: p.y + off } };
      });
      return [...buildZones(positioned), ...positioned];
    },
    [built, data.positions],
  );
  const filterActive = !!(filter.q || filter.spec || filter.ctype || filter.instr || filter.cat);
  const hitIds = useMemo(() => new Set(built.nodes.filter((n) => n.data?.hit).map((n) => n.id)), [built]);
  const initEdges = useMemo<Edge[]>(
    () => [...built.edges, ...(data.userEdges || []).map((e) => {
      const dim = filterActive && !(hitIds.has(e.source) && hitIds.has(e.target));
      return { ...e, ...lookProps(e.look), className: dim ? 'edge-dim' : undefined };
    })],
    [built, data.userEdges, filterActive, hitIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  useEffect(() => { setNodes(initNodes); }, [initNodes, setNodes]);
  useEffect(() => { setEdges(initEdges); }, [initEdges, setEdges]);

  const rf = useReactFlow();
  // okos igazítás: asztali nézetben a teljes gráf; mobilon (keskeny kijelző) a teljes gráf
  // mikroszkopikus lenne, ezért az első félév fejlécére + első kártyájára zoomolunk
  const smartFit = useCallback((duration: number) => {
    if (window.innerWidth < 720) {
      const all = rf.getNodes();
      const sem = all.find((n) => n.type === 'semester');
      if (sem) {
        const ci = (sem.data as { ci?: number }).ci;
        const course = all
          .filter((n) => n.type === 'course' && (n.data as { ci?: number }).ci === ci)
          .sort((a, b) => a.position.x - b.position.x)[0];
        rf.fitView({ nodes: course ? [sem, course] : [sem], padding: 0.08, duration });
        return;
      }
    }
    rf.fitView({ padding: 0.1, duration });
  }, [rf]);
  // Igazítás CSAK az első megjelenítéskor, illetve ha közben verziót/programot váltottunk.
  // Nézetek közti oda-vissza lépkedésnél (ugyanaz a ver/prog) NEM igazítunk újra, hogy a
  // felhasználó zoom/pásztázás pozíciója megmaradjon. (A komponens mountolva marad, csak
  // rejtjük - így a ReactFlow viewport állapota is megőrződik.)
  const lastFitKey = useRef<string | null>(null);
  useEffect(() => {
    if (!active) return;
    const key = `${view.ver}|${view.prog}`;
    if (lastFitKey.current === key) return;
    // a kulcsot CSAK a tényleges illesztéskor jegyezzük fel (Strict Mode dupla-mount ellen):
    // így a nézetváltás nem igazít újra, de a betöltés/ver-prog váltás igen.
    const t = setTimeout(() => { lastFitKey.current = key; smartFit(300); }, 90);
    return () => clearTimeout(t);
  }, [active, smartFit, view.ver, view.prog]);
  // F billentyű: animált fókusz a kijelölésre. Több kijelölt kártyánál (területkijelölés)
  // a teljes kijelölt területre zoomol, középre igazítva; egy kártyánál arra; különben a
  // drawerben megnyitott kártyára; kijelölés nélkül a teljes nézetre igazít. Gépelés közben
  // (input/textarea fókuszban) és nyitott modálnál nem csinál semmit.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'f' && e.key !== 'F') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (document.querySelector('.ovl')) return;
      const sel = rf.getNodes().filter((n) => n.selected && n.type === 'course');
      if (sel.length > 0) {
        rf.fitView({ nodes: sel, duration: 650, padding: sel.length > 1 ? 0.15 : 0.35, maxZoom: 1.15 });
      } else {
        const node = focusId ? rf.getNode(focusId) : undefined;
        if (node) rf.fitView({ nodes: [node], duration: 650, padding: 0.35, maxZoom: 1.15 });
        else smartFit(500);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, rf, focusId, smartFit]);
  // jelentős szélesség-változásnál (pl. telefon elforgatása) újraigazítás - a magasság-változást
  // (mobil billentyűzet felugrása) szándékosan figyelmen kívül hagyjuk
  useEffect(() => {
    let t: number | null = null;
    let lastW = window.innerWidth;
    const onResize = () => {
      // rejtett (másik nézet mögötti) térképen az illesztés nulla méretre futna → NaN-os
      // SVG-attribútumok; ilyenkor csak a szélességet jegyezzük meg, nem illesztünk
      if (!active) { lastW = window.innerWidth; return; }
      if (Math.abs(window.innerWidth - lastW) < 120) return;
      lastW = window.innerWidth;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => smartFit(200), 250);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); if (t) window.clearTimeout(t); };
  }, [smartFit, active]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    const edge: UserEdge = { id: `u-${c.source}.${c.sourceHandle || ''}-${c.target}.${c.targetHandle || ''}`, source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle };
    // a két összekötött node-ot rácsra igazítjuk, hogy az él tiszta legyen - az éllel EGYÜTT, egyetlen mentésben
    const defY: Record<string, number> = {};
    built.nodes.forEach((n) => { if (n.type === 'course') defY[n.id] = n.position.y; });
    const snap: Record<string, { x: number; y: number }> = {};
    const snapStore: Record<string, { x: number; y: number }> = {};
    [c.source, c.target].forEach((id) => {
      const n = nodes.find((nn) => nn.id === id);
      if (n && n.type === 'course') {
        const col = Math.max(0, Math.round((n.position.x - COURSE_X0) / STEP_X));
        snap[id] = { x: COURSE_X0 + col * STEP_X, y: defY[id] ?? n.position.y };
        snapStore[id] = { x: snap[id].x, y: snap[id].y - (built.offsets[id] || 0) };
      }
    });
    if (Object.keys(snap).length) setNodes((nds) => nds.map((n) => (snap[n.id] ? { ...n, position: snap[n.id] } : n)));
    persist.applyConnection(edge, snapStore);
  }, [persist, built, nodes, setNodes]);
  const onEdgesDelete = useCallback((eds: Edge[]) => {
    eds.forEach((e) => { if (e.id.startsWith('u-')) persist.deleteEdge(e.id); });
  }, [persist]);
  // koppintás/kattintás egy kézi élre -> stílus/törlés menü (mobilon ez a törlési út is)
  const onEdgeClick = useCallback((ev: React.MouseEvent, edge: Edge) => {
    if (locked || !edge.id.startsWith('u-')) return;
    ev.stopPropagation();
    const ue = (data.userEdges || []).find((x) => x.id === edge.id);
    setEdgeMenu({ id: edge.id, x: ev.clientX, y: ev.clientY, look: ue?.look || 'anim' });
  }, [locked, data.userEdges]);
  useEffect(() => { if (locked) setEdgeMenu(null); }, [locked]);
  const onNodeDragStop = useCallback((_e: React.MouseEvent, node: Node | undefined) => {
    if (node?.id && node.position) persist.moveNode(node.id, { x: node.position.x, y: node.position.y - (built.offsets[node.id] || 0) });
  }, [persist, built]);
  const onSelectionDragStop = useCallback((_e: React.MouseEvent, nds: Node[]) => {
    const map: Record<string, { x: number; y: number }> = {};
    nds.forEach((n) => { if (n.type === 'course') map[n.id] = { x: n.position.x, y: n.position.y - (built.offsets[n.id] || 0) }; });
    persist.savePositions(map);
  }, [persist, built]);
  const onAlign = useCallback(() => {
    const defY: Record<string, number> = {};
    built.nodes.forEach((n) => { if (n.type === 'course') defY[n.id] = n.position.y; });
    const next: Record<string, { x: number; y: number }> = {};
    const store: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      if (n.type !== 'course') return;
      const y = defY[n.id] ?? n.position.y;
      const col = Math.max(0, Math.round((n.position.x - COURSE_X0) / STEP_X));
      next[n.id] = { x: COURSE_X0 + col * STEP_X, y };
      store[n.id] = { x: next[n.id].x, y: y - (built.offsets[n.id] || 0) };
    });
    setNodes((nds) => nds.map((n) => (next[n.id] ? { ...n, position: next[n.id] } : n)));
    persist.savePositions(store);
  }, [built, nodes, persist, setNodes]);

  const miniColor = (n: Node) => (n.type === 'frame' ? 'transparent' : n.type === 'program' ? '#ff2d6f' : n.type === 'semester' ? (dark ? '#e9e9e4' : '#0e0f11') : n.data?.dim ? (dark ? '#26272c' : '#e7e7e2') : (dark ? '#3a3d44' : '#ffffff'));

  return (
    <div className={`mapwrap${locked ? ' locked' : ''}${selectMode ? ' selmode' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => setEdgeMenu(null)}
        zoomOnDoubleClick={false}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStop={onSelectionDragStop}
        defaultEdgeOptions={{ type: 'default' }}
        deleteKeyCode={locked ? null : ['Backspace', 'Delete']}
        nodesDraggable={!locked}
        elementsSelectable
        selectionOnDrag={selectMode}
        panOnDrag={selectMode ? [1, 2] : true}
        snapToGrid
        snapGrid={[GRID, GRID]}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: dark ? '#ff2d6f' : '#d7144b', strokeWidth: 2.5, strokeDasharray: '5 5' }}
        minZoom={0.1}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={!locked}
        elevateEdgesOnSelect
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        selectionMode={SelectionMode.Partial}
      >
        <Background id="g-fine" variant={BackgroundVariant.Lines} gap={GRID} size={1} color={dark ? '#171a1f' : '#e4e4db'} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={miniColor} nodeStrokeColor={dark ? '#000' : '#0e0f11'} maskColor={dark ? 'rgba(14,15,17,.6)' : 'rgba(242,243,239,.55)'} style={{ background: dark ? '#17181b' : '#fff' }} />
        <Panel position="top-right">
          <div className="map-tools">
            <button
              className={`btn lockbtn${locked ? ' is-on' : ''}`}
              onClick={onToggleLock}
              title={locked ? 'Az elrendezés zárolva: a kártyák és kapcsolatok nem mozdulnak, csak pásztázni/zoomolni lehet. Kattints a feloldáshoz.' : 'Az elrendezés szabad: a kártyák húzhatók, kapcsolatok köthetők. Kattints a zároláshoz (nézelődéshez ajánlott).'}
            >{locked ? '🔒 Zárolva' : '🔓 Szabad'}</button>
            <button
              className={`btn selbtn${selectMode ? ' is-on' : ''}`}
              onClick={() => setSelectMode((v) => !v)}
              title={selectMode ? 'Terület-kijelölés BE: húzással jelölsz ki kártyákat, F = rázoomolás a területre. Pásztázás a középső/jobb egérgombbal. Kattints a kikapcsoláshoz.' : 'Terület-kijelölés: húzással jelölj ki több kártyát, majd F = rázoomolás a kijelölt területre.'}
            >⬚ Terület</button>
            {!locked && <button className="btn alignbtn" onClick={onAlign} title="A node-okat sorba/oszlopba igazítja (vízszintesen egy vonalba, függőlegesen rácsra), a mozgatásokat megtartva">⌗ Igazítás</button>}
          </div>
        </Panel>
      </ReactFlow>
      {built.nodes.length === 0 && (
        <div className="map-empty">Ehhez a verzióhoz / programhoz nincs adat a térképen.<br />Válts verziót vagy programot fent, vagy a <b>Katalógus</b> nézetben adj hozzá tárgyat.</div>
      )}
      {edgeMenu && (
        <div
          className="edge-menu"
          style={{ left: Math.max(8, Math.min(edgeMenu.x - 90, window.innerWidth - 208)), top: Math.min(edgeMenu.y + 10, window.innerHeight - 110) }}
        >
          <div className="em-row">
            {EDGE_LOOKS.map((o) => (
              <button
                key={o.id}
                className={`em-btn${edgeMenu.look === o.id ? ' on' : ''}${o.anim ? ' em-anim' : ''}`}
                title={o.label}
                onClick={() => { persist.setEdgeLook(edgeMenu.id, o.id); setEdgeMenu((m) => (m ? { ...m, look: o.id } : m)); }}
              >
                <svg width="34" height="10" viewBox="0 0 34 10">
                  <line x1="2" y1="5" x2="32" y2="5" stroke={EDGE_RED} strokeWidth={o.id === 'dot' ? 3 : 2.5} strokeDasharray={o.dash} strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
          <div className="em-row">
            <button className="em-del" onClick={() => { persist.deleteEdge(edgeMenu.id); setEdgeMenu(null); }}>🗑 Kapcsolat törlése</button>
            <button className="em-x" onClick={() => setEdgeMenu(null)}>✕</button>
          </div>
        </div>
      )}
      <div className={`legend${legendOpen ? ' open' : ''}`}>
        <button className="legend-toggle" onClick={() => setLegendOpen((o) => !o)} title="Jelmagyarázat">{legendOpen ? '✕ Jelmagyarázat' : 'ⓘ'}</button>
        {legendOpen && (
          <div className="legend-body">
            <div className="row cats">
              <span className="cat g0">Közös</span><span className="cat g1">Multimédia</span><span className="cat g2">Játéktervezés</span><span className="cat g3">Elméleti int. (külső)</span>
            </div>
            <div className="row"><span className="ln build" /> tárgy épül a tárgyra (a nyíl a korábbi félévtől a későbbi felé mutat)</div>
            <div className="row"><span className="dot out" /> kimenet (húzd innen) &nbsp;<span className="dot in" /> bemenet (ide kösd)</div>
            <div className="row"><span className="hint">Kattints a kártyára a részletekért · koppints a piros élre: vonalstílus / törlés · Shift+húzás vagy ⬚ Terület = többes kijelölés · Ctrl+Z = visszavonás · F = fókusz a kijelölt kártyára/területre</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapView(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
