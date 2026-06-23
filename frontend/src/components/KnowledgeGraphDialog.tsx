"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as dagre from "dagre";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

// ─── types ────────────────────────────────────────────────────────────────────
interface Concept {
  name: string;
  status?: string;
}

interface Rule {
  subject: string;
  predicate: string;
  object: string;
  type?: string;
  quantifier?: string;
  cardinality_value?: number;
  description?: string;
}

interface KnowledgeGraphDialogProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: Concept[];
  rules: Rule[];
  serverName: string;
  serverId: string;
}

// ─── colour palette ───────────────────────────────────────────────────────────
const EDGE_COLOURS: Record<string, string> = {
  ClassHierarchy: "#818cf8", // indigo
  Relationship: "#f59e0b", // amber
  ObjectProperty: "#f59e0b",
  DataProperty: "#34d399", // emerald
  default: "#94a3b8", // slate
};

const NODE_COLOURS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  active: { bg: "#1e1b4b", border: "#6366f1", text: "#a5b4fc" },
  pending: { bg: "#1c1917", border: "#78716c", text: "#a8a29e" },
  default: { bg: "#0f172a", border: "#334155", text: "#94a3b8" },
};

// ─── custom node ──────────────────────────────────────────────────────────────
function ConceptNode({ data }: { data: any }) {
  const colours = NODE_COLOURS[data.status] || NODE_COLOURS.default;
  return (
    <div
      style={{
        background: colours.bg,
        border: `2px solid ${colours.border}`,
        borderRadius: 12,
        padding: "10px 18px",
        minWidth: 110,
        boxShadow: `0 0 18px ${colours.border}40`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: colours.border,
          width: 8,
          height: 8,
          borderRadius: "50%",
        }}
      />
      <div style={{ fontSize: 18 }}>
        {data.status === "active" ? "🟣" : "⚫"}
      </div>
      <div
        style={{
          color: colours.text,
          fontWeight: 700,
          fontSize: 12,
          textAlign: "center",
        }}
      >
        {data.label}
      </div>
      {data.status && (
        <div
          style={{
            fontSize: 9,
            color: colours.border,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {data.status}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colours.border,
          width: 8,
          height: 8,
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

// ─── layout helper (simple layered) ───────────────────────────────────────────
function layoutNodes(
  conceptNames: string[],
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const cols = Math.ceil(Math.sqrt(conceptNames.length)) || 1;
  conceptNames.forEach((name, i) => {
    positions[name] = {
      x: (i % cols) * 220 + 80,
      y: Math.floor(i / cols) * 160 + 60,
    };
  });
  return positions;
}

// ─── TTL generator ────────────────────────────────────────────────────────────
function buildTTL(
  serverName: string,
  concepts: Concept[],
  rules: Rule[],
): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, "_");
  const base = `https://ralles.ai/logical-map/${safe(serverName)}#`;

  const lines: string[] = [
    `@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .`,
    `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .`,
    `@prefix owl:  <http://www.w3.org/2002/07/owl#> .`,
    `@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .`,
    `@prefix :     <${base}> .`,
    ``,
    `<${base}> a owl:Ontology ;`,
    `  rdfs:label "${serverName} Association Graph"^^xsd:string .`,
    ``,
    `# ── Classes ──────────────────────────────────────────────────────────────`,
  ];

  concepts.forEach((c) => {
    lines.push(`:${safe(c.name)} a owl:Class ;`);
    lines.push(`  rdfs:label "${c.name}"^^xsd:string .`);
  });

  lines.push(
    ``,
    `# ── Axioms / Object Properties ───────────────────────────────────────────`,
  );

  rules.forEach((r, i) => {
    const subj = safe(r.subject);
    const obj = safe(r.object);
    const pred = safe(r.predicate);

    if (r.type === "ClassHierarchy") {
      lines.push(
        `:${subj} rdfs:subClassOf :${obj} .   # ${r.description || ""}`,
      );
    } else {
      lines.push(`:${pred}_${i} a owl:ObjectProperty ;`);
      lines.push(`  rdfs:domain :${subj} ;`);
      lines.push(`  rdfs:range  :${obj} ;`);
      if (r.description)
        lines.push(`  rdfs:comment "${r.description}"^^xsd:string ;`);
      lines.push(`  rdfs:label "${r.predicate}"^^xsd:string .`);
    }
  });

  return lines.join("\n");
}

// ─── main dialog ──────────────────────────────────────────────────────────────
export default function KnowledgeGraphDialog({
  isOpen,
  onClose,
  concepts = [],
  rules = [],
  serverName,
  serverId,
}: KnowledgeGraphDialogProps) {
  const [activeView, setActiveView] = useState<"graph" | "demo">("graph");

  // Log incoming inputs for debugging extraction vs UI issues
  useEffect(() => {
    try {
      console.debug("KnowledgeGraphDialog inputs", {
        serverName,
        serverId,
        concepts,
        rules,
      });
      // Expose to the window for easier copy/paste from browser console during debugging
      (window as any).__RallesKGInputs = {
        serverName,
        serverId,
        concepts,
        rules,
      };
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [serverName, serverId, concepts, rules]);

  // When the dialog opens or view changes, trigger measurements so React Flow can render
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rfInstanceRef = useRef<any>(null);
  const demoRfInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (e) {}
      try {
        rfInstanceRef.current?.fitView?.({ padding: 0.12 });
      } catch (e) {}
      try {
        demoRfInstanceRef.current?.fitView?.({ padding: 0.18 });
      } catch (e) {}
    }, 120);

    let ro: ResizeObserver | null = null;
    try {
      if (containerRef.current && (window as any).ResizeObserver) {
        ro = new (window as any).ResizeObserver(() => {
          try {
            rfInstanceRef.current?.fitView?.({ padding: 0.12 });
          } catch (e) {}
          try {
            demoRfInstanceRef.current?.fitView?.({ padding: 0.12 });
          } catch (e) {}
        });
        ro?.observe(containerRef.current);
      }
    } catch (e) {}

    return () => {
      clearTimeout(t);
      if (ro && containerRef.current)
        try {
          ro.unobserve(containerRef.current);
        } catch (e) {}
    };
  }, [isOpen, activeView, concepts.length, rules.length]);

  // Aggressively attempt to call fitView a few times and log instance contents for debugging
  useEffect(() => {
    if (!isOpen) return;
    let attempts = 0;
    const iv = setInterval(() => {
      attempts += 1;
      try {
        const rn = rfInstanceRef.current;
        const dn = demoRfInstanceRef.current;
        // expose instances for console inspection
        (window as any).__RallesRF = rn;
        (window as any).__RallesDemoRF = dn;
        if (rn) {
          try {
            rn.fitView({ padding: 0.12 });
          } catch (e) {}
          console.debug(
            "RF instance nodes",
            rn.getNodes?.() || rn.getElements?.(),
          );
          console.debug("RF instance edges", rn.getEdges?.());
        }
        if (dn) {
          try {
            dn.fitView({ padding: 0.12 });
          } catch (e) {}
        }
      } catch (e) {}
      if (attempts > 6) clearInterval(iv);
    }, 300);
    return () => clearInterval(iv);
  }, [isOpen]);

  // Fixes Warning Error #002 by memoizing node structure mapping definitions
  const nodeTypes = useMemo(() => ({ concept: ConceptNode }), []);

  // Build nodes from concepts
  const initialNodes: Node[] = useMemo(() => {
    const names = concepts.map((c) => c.name);
    rules.forEach((r) => {
      if (!names.includes(r.subject)) names.push(r.subject);
      if (!names.includes(r.object)) names.push(r.object);
    });
    const positions = layoutNodes(names);
    return names.map((name) => {
      const concept = concepts.find((c) => c.name === name);
      return {
        id: name,
        type: "concept",
        position: positions[name] || { x: 0, y: 0 },
        data: { label: name, status: concept?.status || "default" },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
  }, [concepts, rules]);

  // Build edges from rules
  const initialEdges: Edge[] = useMemo(() => {
    return rules.map((r, i) => ({
      id: `e-${i}`,
      source: r.subject,
      target: r.object,
      label: r.predicate,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLOURS[r.type || "default"],
      },
      style: {
        stroke: EDGE_COLOURS[r.type || "default"],
        strokeWidth: 2,
      },
      labelStyle: {
        fill: EDGE_COLOURS[r.type || "default"],
        fontWeight: 600,
        fontSize: 10,
      },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
      animated: r.type === "ClassHierarchy",
    }));
  }, [rules]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  );

  // Keep React Flow nodes/edges in sync when `concepts` or `rules` props change
  useEffect(() => {
    try {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } catch (e) {}
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // --- Auto-layout (Dagre) utilities (defined after nodes/edges to avoid TDZ)
  const runDagreLayout = useCallback(
    (targetNodes?: Node[], targetEdges?: Edge[]) => {
      const n = targetNodes ?? nodes;
      const e = targetEdges ?? edges;
      try {
        const g = new (dagre as any).graphlib.Graph();
        g.setGraph({ rankdir: "LR" });
        g.setDefaultEdgeLabel(() => ({}));
        const NODE_WIDTH = 160;
        const NODE_HEIGHT = 56;

        n.forEach((nd) =>
          g.setNode(nd.id, { width: NODE_WIDTH, height: NODE_HEIGHT }),
        );
        e.forEach((ed) => g.setEdge(ed.source as string, ed.target as string));
        (dagre as any).layout(g);

        const positioned = n.map((nd) => {
          const d = g.node(nd.id);
          if (!d) return nd;
          return {
            ...nd,
            position: { x: d.x - NODE_WIDTH / 2, y: d.y - NODE_HEIGHT / 2 },
          };
        });

        setNodes(positioned);
        // small timeout to allow DOM to update
        setTimeout(() => {
          try {
            rfInstanceRef.current?.fitView?.({ padding: 0.12 });
          } catch (e) {}
        }, 60);
      } catch (err) {
        console.error("Dagre layout failed", err);
      }
    },
    [nodes, edges, setNodes],
  );

  const handleFitView = useCallback(() => {
    try {
      rfInstanceRef.current?.fitView?.({ padding: 0.12 });
    } catch (e) {}
  }, []);
  const handleResetLayout = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => {
      try {
        rfInstanceRef.current?.fitView?.({ padding: 0.12 });
      } catch (e) {}
    }, 60);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // ── Demo graph ─────────────────────────────────────────────────────────────
  const demoNodes: Node[] = useMemo(
    () => [
      {
        id: "User",
        type: "concept",
        position: { x: 60, y: 80 },
        data: { label: "User", status: "active" },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "Admin",
        type: "concept",
        position: { x: 60, y: 230 },
        data: { label: "Admin", status: "active" },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "Rating",
        type: "concept",
        position: { x: 340, y: 80 },
        data: { label: "Rating", status: "active" },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "Product",
        type: "concept",
        position: { x: 340, y: 230 },
        data: { label: "Product", status: "active" },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "Order",
        type: "concept",
        position: { x: 620, y: 155 },
        data: { label: "Order", status: "active" },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
    ],
    [],
  );

  const demoEdges: Edge[] = useMemo(
    () => [
      {
        id: "d1",
        source: "Admin",
        target: "User",
        label: "is-a",
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" },
        style: { stroke: "#818cf8", strokeWidth: 2 },
        labelStyle: { fill: "#818cf8", fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
      },
      {
        id: "d2",
        source: "User",
        target: "Rating",
        label: "creates",
        type: "smoothstep",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
        style: { stroke: "#f59e0b", strokeWidth: 2 },
        labelStyle: { fill: "#f59e0b", fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
      },
      {
        id: "d3",
        source: "Rating",
        target: "Product",
        label: "appliesTo",
        type: "smoothstep",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
        style: { stroke: "#f59e0b", strokeWidth: 2 },
        labelStyle: { fill: "#f59e0b", fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
      },
      {
        id: "d4",
        source: "User",
        target: "Order",
        label: "places",
        type: "smoothstep",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#34d399" },
        style: { stroke: "#34d399", strokeWidth: 2 },
        labelStyle: { fill: "#34d399", fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
      },
      {
        id: "d5",
        source: "Order",
        target: "Product",
        label: "contains",
        type: "smoothstep",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#34d399" },
        style: { stroke: "#34d399", strokeWidth: 2 },
        labelStyle: { fill: "#34d399", fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
      },
    ],
    [],
  );

  const [demoN, , onDemoNodesChange] = useNodesState(demoNodes);
  const [demoE, setDemoE, onDemoEdgesChange] = useEdgesState(demoEdges);
  const onDemoConnect = useCallback(
    (c: Connection) => setDemoE((eds) => addEdge(c, eds)),
    [setDemoE],
  );

  // ── Download TTL ───────────────────────────────────────────────────────────
  const handleDownloadTTL = () => {
    const ttl = buildTTL(serverName, concepts, rules);
    const blob = new Blob([ttl], { type: "text/turtle;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${serverName.replace(/\s+/g, "_")}_association_graph.ttl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  const isEmpty = concepts.length === 0 && rules.length === 0;

  return mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="relative w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col my-auto"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
              border: "1px solid rgba(99,102,241,0.35)",
              boxShadow: "0 0 80px rgba(99,102,241,0.2)",
              maxHeight: "calc(100vh - 3rem)", // Enforces proper centering layout spacing safely
            }}
          >
            {/* ── header gradient bar ── */}
            <div
              style={{
                height: 3,
                background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
                flexShrink: 0,
              }}
            />

            {/* ── header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🕸️</span> Association Graph
                  <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full ml-2">
                    {serverName}
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Schema association graph built from your database —{" "}
                  {concepts.length} entities · {rules.length} associations
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setActiveView("graph")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeView === "graph"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📊 Your Graph
                  </button>
                  <button
                    onClick={() => setActiveView("demo")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeView === "demo"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🎓 Demo Graph
                  </button>
                </div>

                {/* Download TTL */}
                <button
                  onClick={handleDownloadTTL}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all"
                >
                  ⬇️ Download Graph
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── legend ── */}
            <div className="flex items-center gap-6 px-6 py-2.5 border-b border-white/5 text-xs text-slate-400 flex-shrink-0">
              <span className="font-semibold text-slate-300">Legend:</span>
              {[
                { colour: "#818cf8", label: "Hierarchy (is-a)" },
                { colour: "#f59e0b", label: "Relationship / Association" },
                { colour: "#34d399", label: "Attribute Link" },
              ].map(({ colour, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 20,
                      height: 2,
                      background: colour,
                      display: "inline-block",
                      borderRadius: 1,
                    }}
                  />
                  {label}
                </span>
              ))}
              {activeView === "graph" && isEmpty && (
                <span className="ml-auto text-amber-400 font-medium">
                  ⚠️ No concepts or rules extracted yet — switch to Demo to
                  preview
                </span>
              )}
            </div>

            {/* How-it-works pipeline removed for knowledge-graph modal (not applicable) */}

            {/* ── canvas container wrapper (Explicit Dimensions Applied -> Fixed Error #004) ── */}
            <div
              ref={containerRef}
              className="w-full relative"
              style={{ height: 520, minHeight: 400, overflow: "hidden" }}
            >
              {/* Toolbar (Fit / Auto-layout / Reset) */}
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                <button
                  onClick={() => runDagreLayout()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition"
                >
                  Auto-layout
                </button>
                <button
                  onClick={() => handleFitView()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-200 hover:bg-white/10 transition"
                >
                  Fit view
                </button>
                <button
                  onClick={() => handleResetLayout()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-200 hover:bg-white/10 transition"
                >
                  Reset
                </button>
              </div>

              {/* Debug overlay: shows counts and sample nodes for quick inspection */}
              <div
                className="absolute top-4 right-4 z-20 p-3 rounded-lg text-xs text-slate-200"
                style={{
                  background: "rgba(2,6,23,0.6)",
                  border: "1px solid rgba(99,102,241,0.18)",
                }}
              >
                <div className="font-semibold text-indigo-300">Debug</div>
                <div className="text-slate-300">
                  concepts: {concepts.length}
                </div>
                <div className="text-slate-300">rules: {rules.length}</div>
                <div className="text-slate-400 mt-1">
                  nodes: {nodes.length} edges: {edges.length}
                </div>
              </div>
              {activeView === "graph" ? (
                isEmpty ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center z-10">
                    <div className="text-5xl">🌐</div>
                    <p className="text-slate-300 font-semibold">
                      No association data extracted yet
                    </p>
                    <p className="text-slate-500 text-sm max-w-xs">
                      Sync your database schema to automatically populate the
                      logical association graph with entities and
                      relationships.
                    </p>
                    <button
                      onClick={() => setActiveView("demo")}
                      className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-all"
                    >
                      View Demo Graph →
                    </button>
                  </div>
                ) : (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.2}
                    maxZoom={2}
                    onInit={(inst) => {
                      rfInstanceRef.current = inst;
                      try {
                        inst.fitView({ padding: 0.12 });
                      } catch (e) {}
                    }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Background
                      variant={BackgroundVariant.Dots}
                      gap={24}
                      size={1}
                      color="rgba(99,102,241,0.15)"
                    />
                    <Controls
                      style={{
                        background: "rgba(15,23,42,0.8)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 8,
                      }}
                    />
                    <MiniMap
                      style={{
                        background: "rgba(15,23,42,0.9)",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}
                      nodeColor={() => "#6366f1"}
                      maskColor="rgba(0,0,0,0.6)"
                    />
                  </ReactFlow>
                )
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  }}
                >
                  <div
                    className="absolute top-4 left-4 z-10 rounded-xl px-4 py-3 text-xs"
                    style={{
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      maxWidth: 280,
                    }}
                  >
                    <p className="font-bold text-indigo-300 mb-1">
                      🎓 Interactive Demo
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      This sample schema association graph illustrates a
                      restaurant/e-commerce schema.
                      <strong className="text-slate-200">
                        {" "}
                        Admin
                      </strong> is-a{" "}
                      <strong className="text-slate-200">User</strong>. Drag
                      nodes to explore associations.
                    </p>
                  </div>
                  <ReactFlow
                    nodes={demoN}
                    edges={demoE}
                    onNodesChange={onDemoNodesChange}
                    onEdgesChange={onDemoEdgesChange}
                    onConnect={onDemoConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    minZoom={0.2}
                    maxZoom={2}
                    onInit={(inst) => {
                      demoRfInstanceRef.current = inst;
                      try {
                        inst.fitView({ padding: 0.18 });
                      } catch (e) {}
                    }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Background
                      variant={BackgroundVariant.Dots}
                      gap={24}
                      size={1}
                      color="rgba(99,102,241,0.15)"
                    />
                    <Controls
                      style={{
                        background: "rgba(15,23,42,0.8)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 8,
                      }}
                    />
                    <MiniMap
                      style={{
                        background: "rgba(15,23,42,0.9)",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}
                      nodeColor={() => "#6366f1"}
                      maskColor="rgba(0,0,0,0.6)"
                    />
                  </ReactFlow>
                </div>
              )}
            </div>

            {/* ── footer stats ── */}
            <div
              className="flex items-center justify-between px-6 py-3 border-t border-white/10 text-xs text-slate-500 flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <span>
                Ralles Schema Association Graph · Export and explore in
                Neo4j or any graph tool
              </span>
              <span>
                {activeView === "graph" ? nodes.length : demoNodes.length} nodes
                · {activeView === "graph" ? edges.length : demoEdges.length}{" "}
                edges
              </span>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;
}
