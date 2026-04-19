/**
 * Shared drill-down / block-diagram component.
 * Used by both StructureView and RequirementsView.
 *
 * Props:
 *   nodes    – full parsed node list
 *   edges    – full parsed edge list
 *   domain   – filter string, e.g. "structure" | "requirement"
 *   colors   – { header, border, bg, text }[]  depth-cycle palette
 */
import { useState, useMemo } from "react";

// ── Default colour palettes per domain ───────────────────────────────────────

const PALETTES = {
  structure: [
    { header:"#1a6fa0", border:"#2e86c1", bg:"#eaf4fb", text:"#154360" },
    { header:"#b05a10", border:"#ca6f1e", bg:"#fdf2ee", text:"#784212" },
    { header:"#1e8449", border:"#27ae60", bg:"#eafaf1", text:"#145a32" },
    { header:"#7d3c98", border:"#8e44ad", bg:"#f5eef8", text:"#4a235a" },
  ],
  requirement: [
    { header:"#d4ac0d", border:"#c8a84b", bg:"#fef9e7", text:"#7d6608" },
    { header:"#b05a10", border:"#ca6f1e", bg:"#fdf2ee", text:"#784212" },
    { header:"#d4ac0d", border:"#c8a84b", bg:"#fef9e7", text:"#7d6608" },
    { header:"#b05a10", border:"#ca6f1e", bg:"#fdf2ee", text:"#784212" },
  ],
  default: [
    { header:"#555",    border:"#888",    bg:"#f5f5f5", text:"#333"    },
  ],
};

function palette(domain, depth) {
  const p = PALETTES[domain] ?? PALETTES.default;
  return p[depth % p.length];
}

// ── Build composition tree ────────────────────────────────────────────────────

export function buildTree(nodes, edges, domain) {
  const domainNodes = nodes.filter(n => n.domain === domain);
  const nodeMap     = Object.fromEntries(domainNodes.map(n => [n.id, n]));
  const childrenOf  = {};
  const hasParent   = new Set();

  for (const e of edges) {
    if (e.kind !== "composition") continue;
    if (!nodeMap[e.from] || !nodeMap[e.to]) continue;
    (childrenOf[e.from] = childrenOf[e.from] ?? []).push({ id: e.to, label: e.label });
    hasParent.add(e.to);
  }

  const roots = domainNodes.filter(n => !hasParent.has(n.id));
  return { roots, childrenOf, nodeMap };
}

// ── Nested SVG block diagram ──────────────────────────────────────────────────

const MIN_W    = 170;
const MIN_H    = 64;
const HEADER_H = 26;
const PAD      = 14;
const GAP      = 10;

function computeSize(id, childrenOf, memo = {}) {
  if (memo[id]) return memo[id];
  const children = childrenOf[id] ?? [];
  if (!children.length) return (memo[id] = { w: MIN_W, h: MIN_H });
  const sizes  = children.map(c => computeSize(c.id, childrenOf, memo));
  const totalW = sizes.reduce((s, sz) => s + sz.w, 0) + GAP * (children.length - 1);
  const maxH   = Math.max(...sizes.map(sz => sz.h));
  return (memo[id] = { w: Math.max(MIN_W, totalW + PAD * 2), h: HEADER_H + PAD + maxH + PAD });
}

function NestedBlock({ id, nodeMap, childrenOf, x, y, depth, sizeMemo, domain, hovered, onHover }) {
  const node     = nodeMap[id];
  const { w, h } = sizeMemo[id] ?? { w: MIN_W, h: MIN_H };
  const c        = palette(domain, depth);
  const children = childrenOf[id] ?? [];
  const isHot    = hovered === id;
  let cx         = x + PAD;
  const cy       = y + HEADER_H + PAD;

  return (
    <g onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)}>
      <rect x={x} y={y} width={w} height={h} rx={5}
        fill={c.bg} stroke={isHot ? c.header : c.border}
        strokeWidth={isHot ? 2.2 : 1.4} opacity={0.92}/>
      <rect x={x} y={y} width={w} height={HEADER_H} rx={5} fill={c.header}/>
      <rect x={x} y={y + HEADER_H - 6} width={w} height={6} fill={c.header}/>
      <text x={x + w/2} y={y + 11} textAnchor="middle"
        fontSize={8} fontFamily="Arial,sans-serif" fontWeight="600" fill="rgba(255,255,255,0.7)">
        {node?.kw ?? ""}
      </text>
      <text x={x + w/2} y={y + 22} textAnchor="middle"
        fontSize={10} fontFamily="Arial,sans-serif" fontWeight="800" fill="#fff">
        {node?.label ?? id}
      </text>
      {children.map(ch => {
        const sz = sizeMemo[ch.id] ?? { w: MIN_W, h: MIN_H };
        const el = (
          <g key={ch.id}>
            <text x={cx + sz.w/2} y={cy - 3} textAnchor="middle"
              fontSize={7.5} fontFamily="Arial,sans-serif" fill={c.text} fontStyle="italic">
              {ch.label}
            </text>
            <NestedBlock id={ch.id} nodeMap={nodeMap} childrenOf={childrenOf}
              x={cx} y={cy} depth={depth + 1} sizeMemo={sizeMemo} domain={domain}
              hovered={hovered} onHover={onHover}/>
          </g>
        );
        cx += sz.w + GAP;
        return el;
      })}
    </g>
  );
}

function BlockDiagram({ roots, nodeMap, childrenOf, domain }) {
  const [hovered, setHovered] = useState(null);

  const sizeMemo = useMemo(() => {
    const memo = {};
    [...roots, ...Object.keys(nodeMap).map(id => ({ id }))].forEach(r =>
      computeSize(r.id, childrenOf, memo)
    );
    return memo;
  }, [roots, childrenOf, nodeMap]);

  if (!roots.length) return <Empty/>;

  const ROOT_GAP = 20, M = 16;
  let rx = M;
  const totalH = Math.max(...roots.map(r => sizeMemo[r.id]?.h ?? MIN_H)) + M * 2;
  const totalW = roots.reduce((s, r) => s + (sizeMemo[r.id]?.w ?? MIN_W) + ROOT_GAP, M);

  return (
    <div style={{ overflow:"auto", flex:1 }}>
      <svg width={totalW} height={totalH} style={{ display:"block" }}>
        {roots.map(r => {
          const sz = sizeMemo[r.id];
          const x  = rx;
          rx += sz.w + ROOT_GAP;
          return (
            <NestedBlock key={r.id} id={r.id} nodeMap={nodeMap} childrenOf={childrenOf}
              x={x} y={M} depth={0} sizeMemo={sizeMemo} domain={domain}
              hovered={hovered} onHover={setHovered}/>
          );
        })}
      </svg>
    </div>
  );
}

// ── Drill-down card view ──────────────────────────────────────────────────────

function NodeCard({ node, childCount, depth, domain, onClick }) {
  const c   = palette(domain, depth);
  const can = childCount > 0;
  const [hot, setHot] = useState(false);
  return (
    <div onClick={can ? onClick : undefined}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        width:220, borderRadius:8, overflow:"hidden", cursor: can ? "pointer" : "default",
        border:`2px solid ${hot && can ? c.header : c.border}`,
        boxShadow: hot && can ? `0 4px 16px ${c.border}44` : "0 2px 8px rgba(0,0,0,0.07)",
        transition:"box-shadow 0.15s, border-color 0.15s", background:"#fff",
      }}>
      <div style={{ background:c.header, padding:"8px 12px" }}>
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.7)", marginBottom:2, fontFamily:"Arial,sans-serif" }}>
          {node.kw}
        </div>
        <div style={{ fontSize:14, fontWeight:800, color:"#fff", fontFamily:"Arial,sans-serif" }}>
          {node.label}
        </div>
      </div>
      <div style={{ padding:"8px 12px", display:"flex", justifyContent:"space-between",
        alignItems:"center", background: hot && can ? c.bg : "#fff", transition:"background 0.15s" }}>
        <span style={{ fontSize:10, color:c.text, fontFamily:"Arial,sans-serif" }}>
          {childCount > 0 ? `${childCount} child${childCount > 1 ? "ren" : ""}` : "leaf"}
        </span>
        {can && <span style={{ fontSize:16, color:c.header, fontWeight:700 }}>›</span>}
      </div>
    </div>
  );
}

function DrilldownView({ roots, nodeMap, childrenOf, domain }) {
  const [path, setPath] = useState([]);
  const currentId    = path.length ? path[path.length - 1].id : null;
  const currentNodes = currentId
    ? (childrenOf[currentId] ?? []).map(c => nodeMap[c.id]).filter(Boolean)
    : roots;

  if (!roots.length) return <Empty/>;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Breadcrumb */}
      <div style={{ padding:"10px 16px", display:"flex", alignItems:"center",
        gap:6, flexWrap:"wrap", fontFamily:"Arial,sans-serif", fontSize:12, flexShrink:0 }}>
        <span onClick={() => setPath([])}
          style={{ color: path.length ? "#1a6fa0" : "#111",
            fontWeight: path.length ? 400 : 700, cursor: path.length ? "pointer" : "default" }}>
          All
        </span>
        {path.map((crumb, i) => (
          <span key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ color:"#bbb" }}>›</span>
            <span onClick={() => setPath(p => p.slice(0, i + 1))}
              style={{ color: i < path.length - 1 ? "#1a6fa0" : "#111",
                fontWeight: i === path.length - 1 ? 700 : 400,
                cursor: i < path.length - 1 ? "pointer" : "default" }}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Cards */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 16px",
        display:"flex", flexWrap:"wrap", gap:12, alignContent:"flex-start" }}>
        {currentNodes.map(node => (
          <NodeCard key={node.id} node={node} domain={domain} depth={path.length}
            childCount={(childrenOf[node.id] ?? []).length}
            onClick={() => setPath(p => [...p, { id: node.id, label: node.label }])}/>
        ))}
        {currentNodes.length === 0 && (
          <span style={{ color:"#aaa", fontFamily:"Arial,sans-serif", fontSize:13 }}>No children.</span>
        )}
      </div>
    </div>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────

function Empty() {
  return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
      color:"#bbb", fontFamily:"Arial,sans-serif", fontSize:13 }}>
      No nodes found for this domain.
    </div>
  );
}

// ── Mode toggle button ────────────────────────────────────────────────────────

function ModeBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 14px", fontSize:11, fontFamily:"Arial,sans-serif",
      fontWeight: active ? 700 : 400, border:"1.5px solid", borderRadius:4, cursor:"pointer",
      borderColor: active ? "#1a6fa0" : "#ddd",
      background:  active ? "#1a6fa0" : "#fff",
      color:       active ? "#fff"    : "#666",
    }}>{label}</button>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function DrilldownDiagram({ nodes, edges, domain }) {
  const [mode, setMode] = useState("drilldown");
  const { roots, childrenOf, nodeMap } = useMemo(
    () => buildTree(nodes, edges, domain),
    [nodes, edges, domain]
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"8px 16px", display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
        <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif", marginRight:4 }}>View:</span>
        <ModeBtn label="Drill-down"    active={mode==="drilldown"} onClick={() => setMode("drilldown")}/>
        <ModeBtn label="Block diagram" active={mode==="blocks"}    onClick={() => setMode("blocks")}/>
      </div>
      {mode === "drilldown"
        ? <DrilldownView roots={roots} nodeMap={nodeMap} childrenOf={childrenOf} domain={domain}/>
        : <BlockDiagram  roots={roots} nodeMap={nodeMap} childrenOf={childrenOf} domain={domain}/>
      }
    </div>
  );
}
