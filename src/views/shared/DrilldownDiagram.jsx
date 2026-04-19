import { useState, useMemo } from "react";

const PALETTES = {
  structure: [
    { accent: "#06b6d4", dim: "rgba(6,182,212,0.07)",   border: "rgba(6,182,212,0.2)",   text: "#67e8f9" },
    { accent: "#f59e0b", dim: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)",  text: "#fcd34d" },
    { accent: "#10b981", dim: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.2)",  text: "#6ee7b7" },
    { accent: "#8b5cf6", dim: "rgba(139,92,246,0.07)",  border: "rgba(139,92,246,0.2)",  text: "#c4b5fd" },
  ],
  requirement: [
    { accent: "#3b82f6", dim: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.2)",  text: "#93c5fd" },
    { accent: "#f59e0b", dim: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)",  text: "#fcd34d" },
    { accent: "#3b82f6", dim: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.2)",  text: "#93c5fd" },
    { accent: "#f59e0b", dim: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)",  text: "#fcd34d" },
  ],
  behaviour: [
    { accent: "#10b981", dim: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.2)",  text: "#6ee7b7" },
    { accent: "#06b6d4", dim: "rgba(6,182,212,0.07)",   border: "rgba(6,182,212,0.2)",   text: "#67e8f9" },
  ],
  interface: [
    { accent: "#f59e0b", dim: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)",  text: "#fcd34d" },
    { accent: "#8b5cf6", dim: "rgba(139,92,246,0.07)",  border: "rgba(139,92,246,0.2)",  text: "#c4b5fd" },
  ],
  default: [
    { accent: "#52525b", dim: "rgba(82,82,91,0.07)",    border: "rgba(82,82,91,0.2)",    text: "#a1a1aa" },
  ],
};

function palette(domain, depth) {
  const p = PALETTES[domain] ?? PALETTES.default;
  return p[depth % p.length];
}

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

const MIN_W    = 170;
const MIN_H    = 64;
const HEADER_H = 28;
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
  let cx = x + PAD;
  const cy = y + HEADER_H + PAD;

  return (
    <g onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)}>
      <rect x={x} y={y} width={w} height={h} rx={6}
        fill={isHot ? c.dim : "#0f0f0f88"}
        stroke={isHot ? c.accent : c.border}
        strokeWidth={isHot ? 1.5 : 1} />
      <rect x={x} y={y} width={w} height={HEADER_H} rx={6}
        fill={isHot ? c.accent + "33" : c.dim} />
      <rect x={x} y={y + HEADER_H - 6} width={w} height={6} fill={isHot ? c.accent + "33" : c.dim} />
      {isHot && <rect x={x} y={y} width={4} height={h} rx={6} fill={c.accent} />}
      <text x={x + w / 2} y={y + 11} textAnchor="middle"
        fontSize={7.5} fontFamily="'JetBrains Mono',monospace" fontWeight="500"
        fill={isHot ? c.accent : c.text + "88"}>
        {node?.kw ?? ""}
      </text>
      <text x={x + w / 2} y={y + 22} textAnchor="middle"
        fontSize={10} fontFamily="'Inter',system-ui,sans-serif" fontWeight="700"
        fill={isHot ? "#ececec" : "#c8c8c8"}>
        {node?.label ?? id}
      </text>
      {children.map(ch => {
        const sz = sizeMemo[ch.id] ?? { w: MIN_W, h: MIN_H };
        const el = (
          <g key={ch.id}>
            {ch.label && (
              <text x={cx + sz.w / 2} y={cy - 3} textAnchor="middle"
                fontSize={7.5} fontFamily="'JetBrains Mono',monospace"
                fill={c.text + "88"} fontStyle="italic">
                {ch.label}
              </text>
            )}
            <NestedBlock id={ch.id} nodeMap={nodeMap} childrenOf={childrenOf}
              x={cx} y={cy} depth={depth + 1} sizeMemo={sizeMemo} domain={domain}
              hovered={hovered} onHover={onHover} />
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

  if (!roots.length) return <Empty />;

  const ROOT_GAP = 20, M = 16;
  let rx = M;
  const totalH = Math.max(...roots.map(r => sizeMemo[r.id]?.h ?? MIN_H)) + M * 2;
  const totalW = roots.reduce((s, r) => s + (sizeMemo[r.id]?.w ?? MIN_W) + ROOT_GAP, M);

  return (
    <div style={{ overflow: "auto", flex: 1, padding: 16 }}>
      <svg width={totalW} height={totalH} style={{ display: "block" }}>
        <rect width={totalW} height={totalH} fill="#080808" />
        {roots.map(r => {
          const sz = sizeMemo[r.id];
          const x  = rx;
          rx += sz.w + ROOT_GAP;
          return (
            <NestedBlock key={r.id} id={r.id} nodeMap={nodeMap} childrenOf={childrenOf}
              x={x} y={M} depth={0} sizeMemo={sizeMemo} domain={domain}
              hovered={hovered} onHover={setHovered} />
          );
        })}
      </svg>
    </div>
  );
}

function NodeCard({ node, childCount, depth, domain, onClick }) {
  const c   = palette(domain, depth);
  const can = childCount > 0;
  const [hot, setHot] = useState(false);
  return (
    <div onClick={can ? onClick : undefined}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        width: 220, borderRadius: 9, overflow: "hidden",
        cursor: can ? "pointer" : "default",
        border: `1px solid ${hot && can ? c.accent : c.border}`,
        background: "#0f0f0f",
        boxShadow: hot && can ? `0 0 0 3px ${c.accent}22` : "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}>
      <div style={{
        background: hot ? c.accent + "22" : c.dim,
        padding: "10px 14px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{
          fontSize: 9, color: c.text, marginBottom: 3,
          fontFamily: "JetBrains Mono,monospace", fontWeight: 500,
        }}>
          {node.kw}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: hot ? "#ececec" : "#c8c8c8",
          fontFamily: "Inter,system-ui,sans-serif", letterSpacing: "-0.02em",
        }}>
          {node.label}
        </div>
      </div>
      <div style={{
        padding: "8px 14px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{
          fontSize: 11, color: can ? c.text : "#333",
          fontFamily: "JetBrains Mono,monospace",
        }}>
          {childCount > 0 ? `${childCount} child${childCount > 1 ? "ren" : ""}` : "leaf"}
        </span>
        {can && <span style={{ fontSize: 14, color: c.accent, fontWeight: 600 }}>›</span>}
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

  if (!roots.length) return <Empty />;

  const c0 = palette(domain, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Breadcrumb */}
      <div style={{
        padding: "10px 18px", display: "flex", alignItems: "center",
        gap: 6, flexWrap: "wrap", flexShrink: 0,
        borderBottom: "1px solid #1f1f1f",
        background: "#0f0f0f",
      }}>
        <span onClick={() => setPath([])} style={{
          fontSize: 12, fontFamily: "Inter,system-ui,sans-serif",
          color: path.length ? c0.accent : "#ececec",
          fontWeight: path.length ? 400 : 600,
          cursor: path.length ? "pointer" : "default",
          letterSpacing: "-0.01em",
        }}>All</span>
        {path.map((crumb, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#2e2e2e", fontSize: 12 }}>›</span>
            <span onClick={() => setPath(p => p.slice(0, i + 1))} style={{
              fontSize: 12, fontFamily: "Inter,system-ui,sans-serif",
              color: i < path.length - 1 ? c0.accent : "#ececec",
              fontWeight: i === path.length - 1 ? 600 : 400,
              cursor: i < path.length - 1 ? "pointer" : "default",
              letterSpacing: "-0.01em",
            }}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 18px",
        display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start",
      }}>
        {currentNodes.map(node => (
          <NodeCard key={node.id} node={node} domain={domain} depth={path.length}
            childCount={(childrenOf[node.id] ?? []).length}
            onClick={() => setPath(p => [...p, { id: node.id, label: node.label }])} />
        ))}
        {currentNodes.length === 0 && (
          <span style={{ color: "#333", fontFamily: "JetBrains Mono,monospace", fontSize: 12 }}>
            No children.
          </span>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      color: "#333", fontFamily: "Inter,system-ui,sans-serif", fontSize: 13,
    }}>
      No nodes found for this domain.
    </div>
  );
}

function ModeBtn({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px",
      fontSize: 12,
      fontFamily: "Inter,system-ui,sans-serif",
      fontWeight: active ? 600 : 400,
      border: "1px solid",
      borderRadius: 6,
      cursor: "pointer",
      letterSpacing: "-0.01em",
      borderColor: active ? accent + "66" : "#2e2e2e",
      background:  active ? accent + "15" : "transparent",
      color:       active ? accent       : "#777",
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

export default function DrilldownDiagram({ nodes, edges, domain }) {
  const [mode, setMode] = useState("drilldown");
  const { roots, childrenOf, nodeMap } = useMemo(
    () => buildTree(nodes, edges, domain),
    [nodes, edges, domain]
  );

  const c0 = palette(domain, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        padding: "10px 18px", display: "flex", gap: 6, alignItems: "center",
        flexShrink: 0, borderBottom: "1px solid #1a1a1a", background: "#0f0f0f",
      }}>
        <span style={{
          fontSize: 11, color: "#444",
          fontFamily: "JetBrains Mono,monospace", marginRight: 4,
        }}>View:</span>
        <ModeBtn label="Drill-down"    active={mode === "drilldown"} accent={c0.accent} onClick={() => setMode("drilldown")} />
        <ModeBtn label="Block diagram" active={mode === "blocks"}    accent={c0.accent} onClick={() => setMode("blocks")} />
      </div>
      {mode === "drilldown"
        ? <DrilldownView roots={roots} nodeMap={nodeMap} childrenOf={childrenOf} domain={domain} />
        : <BlockDiagram  roots={roots} nodeMap={nodeMap} childrenOf={childrenOf} domain={domain} />
      }
    </div>
  );
}
