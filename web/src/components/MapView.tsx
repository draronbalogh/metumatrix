'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap, MarkerType, Panel, ConnectionLineType, SelectionMode,
  ReactFlowProvider, useNodesState, useEdgesState, useReactFlow,
  Connection, Edge, Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Curriculum, UserEdge } from '@/data/curriculum';
import { buildGraph, Filter, Handlers, View, GRID, COURSE_X0, STEP_X } from '@/lib/buildGraph';
import { ProgramNode, SemesterNode, CourseNode } from './MapNodes';

const nodeTypes = { program: ProgramNode, semester: SemesterNode, course: CourseNode };

export interface Persist {
  addEdge: (e: UserEdge) => void;
  deleteEdge: (id: string) => void;
  moveNode: (id: string, pos: { x: number; y: number }) => void;
  savePositions: (map: Record<string, { x: number; y: number }>) => void;
  applyConnection: (e: UserEdge, positions: Record<string, { x: number; y: number }>) => void;
  resetPositions: () => void;
}

interface Props {
  data: Curriculum;
  filter: Filter;
  handlers: Handlers;
  persist: Persist;
  theme: 'light' | 'dark';
  view: View;
}

function Inner({ data, filter, handlers, persist, theme, view }: Props) {
  const dark = theme === 'dark';
  const [legendOpen, setLegendOpen] = useState(false);
  const built = useMemo(() => buildGraph(data, filter, handlers, view), [data, filter, handlers, view]);

  const userEdgeStyle = useMemo(() => ({
    type: 'default',
    animated: true,
    style: { stroke: '#d7144b', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#d7144b', width: 20, height: 20 },
  }), []);

  const initNodes = useMemo<Node[]>(
    () => built.nodes.map((n) => (data.positions?.[n.id] ? { ...n, position: data.positions[n.id] } : n)),
    [built, data.positions],
  );
  const filterActive = !!(filter.q || filter.spec || filter.ctype || filter.instr);
  const hitIds = useMemo(() => new Set(built.nodes.filter((n) => n.data?.hit).map((n) => n.id)), [built]);
  const initEdges = useMemo<Edge[]>(
    () => [...built.edges, ...(data.userEdges || []).map((e) => {
      const dim = filterActive && !(hitIds.has(e.source) && hitIds.has(e.target));
      return { ...e, ...userEdgeStyle, className: dim ? 'edge-dim' : undefined };
    })],
    [built, data.userEdges, userEdgeStyle, filterActive, hitIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  useEffect(() => { setNodes(initNodes); }, [initNodes, setNodes]);
  useEffect(() => { setEdges(initEdges); }, [initEdges, setEdges]);

  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.1, duration: 300 }), 90);
    return () => clearTimeout(t);
  }, [rf, view.ver, view.prog]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    const edge: UserEdge = { id: `u-${c.source}.${c.sourceHandle || ''}-${c.target}.${c.targetHandle || ''}`, source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle };
    // a két összekötött node-ot rácsra igazítjuk, hogy az él tiszta legyen — az éllel EGYÜTT, egyetlen mentésben
    const defY: Record<string, number> = {};
    built.nodes.forEach((n) => { if (n.type === 'course') defY[n.id] = n.position.y; });
    const snap: Record<string, { x: number; y: number }> = {};
    [c.source, c.target].forEach((id) => {
      const n = nodes.find((nn) => nn.id === id);
      if (n && n.type === 'course') {
        const col = Math.max(0, Math.round((n.position.x - COURSE_X0) / STEP_X));
        snap[id] = { x: COURSE_X0 + col * STEP_X, y: defY[id] ?? n.position.y };
      }
    });
    if (Object.keys(snap).length) setNodes((nds) => nds.map((n) => (snap[n.id] ? { ...n, position: snap[n.id] } : n)));
    persist.applyConnection(edge, snap);
  }, [persist, built, nodes, setNodes]);
  const onEdgesDelete = useCallback((eds: Edge[]) => {
    eds.forEach((e) => { if (e.id.startsWith('u-')) persist.deleteEdge(e.id); });
  }, [persist]);
  const onNodeDragStop = useCallback((_e: React.MouseEvent, node: Node | undefined) => {
    if (node?.id && node.position) persist.moveNode(node.id, node.position);
  }, [persist]);
  const onSelectionDragStop = useCallback((_e: React.MouseEvent, nds: Node[]) => {
    const map: Record<string, { x: number; y: number }> = {};
    nds.forEach((n) => { if (n.type === 'course') map[n.id] = n.position; });
    persist.savePositions(map);
  }, [persist]);
  const onAlign = useCallback(() => {
    const defY: Record<string, number> = {};
    built.nodes.forEach((n) => { if (n.type === 'course') defY[n.id] = n.position.y; });
    const next: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      if (n.type !== 'course') return;
      const y = defY[n.id] ?? n.position.y;
      const col = Math.max(0, Math.round((n.position.x - COURSE_X0) / STEP_X));
      next[n.id] = { x: COURSE_X0 + col * STEP_X, y };
    });
    setNodes((nds) => nds.map((n) => (next[n.id] ? { ...n, position: next[n.id] } : n)));
    persist.savePositions(next);
  }, [built, nodes, persist, setNodes]);

  const miniColor = (n: Node) => (n.type === 'program' ? '#ff2d6f' : n.type === 'semester' ? (dark ? '#e9e9e4' : '#0e0f11') : n.data?.dim ? (dark ? '#26272c' : '#e7e7e2') : (dark ? '#3a3d44' : '#ffffff'));

  return (
    <div className="mapwrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStop={onSelectionDragStop}
        defaultEdgeOptions={{ type: 'default' }}
        deleteKeyCode={['Backspace', 'Delete']}
        snapToGrid
        snapGrid={[GRID, GRID]}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: dark ? '#ff2d6f' : '#d7144b', strokeWidth: 2.5, strokeDasharray: '5 5' }}
        minZoom={0.1}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesConnectable
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
            <button className="btn" onClick={onAlign} title="A node-okat sorba/oszlopba igazítja (vízszintesen egy vonalba, függőlegesen rácsra), a mozgatásokat megtartva">⌗ Igazítás</button>
          </div>
        </Panel>
      </ReactFlow>
      {built.nodes.length === 0 && (
        <div className="map-empty">Ehhez a verzióhoz / programhoz nincs adat a térképen.<br />Válts verziót vagy programot fent, vagy a <b>Katalógus</b> nézetben adj hozzá tárgyat.</div>
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
            <div className="row"><span className="hint">Kattints a részletekért · Shift+húzás = többes kijelölés · Delete = kapcsolat törlése · Ctrl+Z = visszavonás</span></div>
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
