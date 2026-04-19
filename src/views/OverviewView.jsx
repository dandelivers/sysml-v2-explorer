import { useState } from "react";

const DOMAIN_CFG = {
  requirement: { label: "Requirements", accent: "#3b82f6", dim: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.22)",  text: "#93c5fd" },
  behaviour:   { label: "Behaviour",    accent: "#10b981", dim: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.22)",  text: "#6ee7b7" },
  structure:   { label: "Structure",    accent: "#06b6d4", dim: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.22)",   text: "#67e8f9" },
  interface:   { label: "Interface",    accent: "#f59e0b", dim: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.22)",  text: "#fcd34d" },
  config:      { label: "Config",       accent: "#8b5cf6", dim: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.22)",  text: "#c4b5fd" },
  unknown:     { label: "Unknown",      accent: "#52525b", dim: "rgba(82,82,91,0.08)",    border: "rgba(82,82,91,0.22)",    text: "#a1a1aa" },
};

const DOMAIN_ORDER = ["requirement", "behaviour", "structure", "interface", "config", "unknown"];

const EDGE_COLOR = {
  composition:    "#4b5563",
  specialization: "#3b82f6",
  connection:     "#f59e0b",
  allocation:     "#8b5cf6",
};

const CW      = 178;
const NODE_H  = 66;
const NODE_W  = 154;
const GAP_X   = 26;
const GAP_Y   = 18;
const PAD_X   = 16;
const HEADER_H = 58;

function computeLayout(nodes) {
  const groups = {};
  for (const n of nodes) {
    const d = n.domain in DOMAIN_CFG ? n.domain : "unknown";
    (groups[d] = groups[d] ?? []).push(n);
  }
  const activeDomains = DOMAIN_ORDER.filter(d => groups[d]?.length);
  const positions = {};
  activeDomains.forEach((domain, ci) => {
    groups[domain].forEach((node, ri) => {
      positions[node.id] = {
        x: PAD_X + ci * (CW + GAP_X) + (CW - NODE_W) / 2,
        y: HEADER_H + ri * (NODE_H + GAP_Y),
        w: NODE_W, h: NODE_H, col: ci,
      };
    });
  });
  const numCols = activeDomains.length || 1;
  const maxRows = Math.max(...activeDomains.map(d => groups[d].length), 1);
  const totalW  = numCols * CW + (numCols - 1) * GAP_X + PAD_X * 2;
  const totalH  = HEADER_H + maxRows * (NODE_H + GAP_Y) + PAD_X + 20;
  const colH    = maxRows * (NODE_H + GAP_Y) + 12;
  return { positions, activeDomains, groups, totalW, totalH, colH };
}

function edgePts(fp, tp) {
  const fc = { x: fp.x + fp.w / 2, y: fp.y + fp.h / 2 };
  const tc = { x: tp.x + tp.w / 2, y: tp.y + tp.h / 2 };
  if (fp.col === tp.col) return { x1: fc.x, y1: fp.y + fp.h, x2: tc.x, y2: tp.y };
  if (fp.col < tp.col)  return { x1: fp.x + fp.w, y1: fc.y, x2: tp.x, y2: tc.y };
  return { x1: fp.x, y1: fc.y, x2: tp.x + tp.w, y2: tc.y };
}

function Arrow({ x1, y1, x2, y2, label, kind, active }) {
  const baseColor = EDGE_COLOR[kind] ?? "#555";
  const color = active ? baseColor : baseColor + "55";
  const sw    = active ? 1.5 : 0.9;
  const dash  = kind === "specialization" || kind === "allocation" ? "5,4" : undefined;
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx + dy*dy);
  if (len < 2) return null;
  const angle = Math.atan2(dy, dx);
  const al = 8, aw = 0.32;
  const ax1 = x2 - al * Math.cos(angle - aw), ay1 = y2 - al * Math.sin(angle - aw);
  const ax2 = x2 - al * Math.cos(angle + aw), ay2 = y2 - al * Math.sin(angle + aw);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const perpX = -dy / len * 7, perpY = dx / len * 7;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeDasharray={dash} />
      <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
      {label && active && (
        <text x={mx + perpX} y={my + perpY} textAnchor="middle" fontSize={8}
          fontFamily="'JetBrains Mono',monospace" fill={color} fontStyle="italic"
          style={{ pointerEvents: "none" }}>
          {label}
        </text>
      )}
    </g>
  );
}

function NodeBox({ node, pos, domainCfg, hot, onHover, onClick }) {
  const d = domainCfg;
  const rx = node.kind === "useCaseDef" ? pos.w / 2 : 5;
  const words = node.label.match(/[A-Z][a-z]+|[a-z]+|[A-Z]+(?=[A-Z]|$)/g) ?? [node.label];
  const line1 = words.slice(0, 2).join("");
  const line2 = words.length > 2 ? words.slice(2).join("") : null;
  return (
    <g style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node)}>
      <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={rx}
        fill={hot ? d.accent + "22" : "#13131388"}
        stroke={hot ? d.accent : d.border}
        strokeWidth={hot ? 1.5 : 1} />
      {hot && <rect x={pos.x} y={pos.y} width={4} height={pos.h} rx={rx} fill={d.accent} />}
      <text x={pos.x + pos.w / 2} y={pos.y + 14} textAnchor="middle" fontSize={7.5}
        fontFamily="'JetBrains Mono',monospace" fontStyle="italic"
        fill={hot ? d.accent : d.text + "99"}>
        {node.kw ?? ""}
      </text>
      <text x={pos.x + pos.w / 2} y={pos.y + 26} textAnchor="middle" fontSize={8}
        fontFamily="'JetBrains Mono',monospace" fontWeight="600"
        fill={hot ? d.accent : d.text}>
        {"// " + (node.kw ?? "")}
      </text>
      <line x1={pos.x + 8} y1={pos.y + 31} x2={pos.x + pos.w - 8} y2={pos.y + 31}
        stroke={hot ? d.accent + "44" : d.border + "66"} strokeWidth={0.7} />
      <text x={pos.x + pos.w / 2} y={pos.y + 46} textAnchor="middle" fontSize={10.5}
        fontFamily="'Inter',system-ui,sans-serif" fontWeight="600"
        fill={hot ? "#efefef" : "#c8c8c8"}>
        {line1}
      </text>
      {line2 && (
        <text x={pos.x + pos.w / 2} y={pos.y + 59} textAnchor="middle" fontSize={10}
          fontFamily="'Inter',system-ui,sans-serif" fontWeight="600"
          fill={hot ? "#efefef" : "#c8c8c8"}>
          {line2}
        </text>
      )}
    </g>
  );
}

export default function OverviewView({ nodes, edges, svgRef, exporting }) {
  const [hovered, setHovered]   = useState(null);
  const [selected, setSelected] = useState(null);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const layout  = computeLayout(nodes);
  const { positions, activeDomains, totalW, totalH, colH } = layout;

  const activeIds   = new Set(selected ? [selected.id] : hovered ? [hovered] : []);
  const activeEdges = new Set(
    edges.filter(e => activeIds.has(e.from) || activeIds.has(e.to)).map(e => e.id)
  );

  if (nodes.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12, color: "#555", fontFamily: "Inter,system-ui,sans-serif",
      }}>
        <div style={{
          fontSize: 36, color: "#222", border: "1px solid #1f1f1f",
          borderRadius: 12, width: 56, height: 56,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>◻</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#ececec" }}>No model elements</div>
        <div style={{ fontSize: 13, maxWidth: 300, textAlign: "center", lineHeight: 1.6 }}>
          Write some SysML v2 in the Model tab and your elements will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        flex: 1, overflow: "auto",
        padding: "16px",
      }}>
        <svg ref={svgRef} width={totalW} height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`} style={{ display: "block" }}>

          {/* Background */}
          <rect width={totalW} height={totalH} fill="#080808" />

          {/* Domain columns */}
          {activeDomains.map((domain, ci) => {
            const d = DOMAIN_CFG[domain];
            const x = PAD_X + ci * (CW + GAP_X);
            const y = HEADER_H - 20;
            return (
              <g key={domain}>
                <rect x={x} y={y} width={CW} height={colH + 20} rx={6}
                  fill={d.dim} stroke={d.border} strokeWidth={1} />
                <rect x={x} y={y} width={CW} height={26} rx={6} fill={d.accent + "22"} />
                <rect x={x} y={y + 14} width={CW} height={12} fill={d.accent + "22"} />
                <rect x={x + 8} y={y + 8} width={6} height={6} rx={2} fill={d.accent} />
                <text x={x + 20} y={y + 17} fontSize={9} fontWeight="600"
                  fontFamily="'Inter',system-ui,sans-serif" fill={d.text} letterSpacing={0.5}>
                  {d.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Dim edges */}
          {edges.map(e => {
            if (activeEdges.has(e.id) && !exporting) return null;
            const fp = positions[e.from], tp = positions[e.to];
            if (!fp || !tp) return null;
            const pts = edgePts(fp, tp);
            return <Arrow key={e.id} {...pts} label={e.label} kind={e.kind} active={exporting} />;
          })}

          {/* Active edges on top */}
          {!exporting && edges.map(e => {
            if (!activeEdges.has(e.id)) return null;
            const fp = positions[e.from], tp = positions[e.to];
            if (!fp || !tp) return null;
            const pts = edgePts(fp, tp);
            return <Arrow key={"a" + e.id} {...pts} label={e.label} kind={e.kind} active />;
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const pos = positions[n.id];
            if (!pos) return null;
            const domain = n.domain in DOMAIN_CFG ? n.domain : "unknown";
            return (
              <NodeBox key={n.id} node={n} pos={pos}
                domainCfg={DOMAIN_CFG[domain]}
                hot={hovered === n.id || selected?.id === n.id}
                onHover={setHovered} onClick={setSelected} />
            );
          })}
        </svg>
      </div>

      {/* Selection detail panel */}
      {selected && (() => {
        const d = DOMAIN_CFG[selected.domain in DOMAIN_CFG ? selected.domain : "unknown"];
        const relEdges = edges.filter(e => e.from === selected.id || e.to === selected.id);
        return (
          <div style={{
            borderTop: `1px solid ${d.border}`,
            background: "#0f0f0f",
            padding: "12px 20px",
            display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start",
            flexShrink: 0,
          }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{
                fontSize: 9, color: d.text, textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 3,
                fontFamily: "JetBrains Mono,monospace",
              }}>{d.label}</div>
              <div style={{
                fontSize: 15, fontWeight: 700, color: "#ececec",
                fontFamily: "Inter,system-ui,sans-serif", letterSpacing: "-0.02em",
              }}>{selected.label}</div>
              <div style={{
                fontSize: 10, color: d.accent, marginTop: 3,
                fontFamily: "JetBrains Mono,monospace",
              }}>{selected.kw}</div>
            </div>
            <div style={{ flex: 2, minWidth: 240 }}>
              <div style={{
                fontSize: 9, color: "#444", textTransform: "uppercase",
                letterSpacing: "0.08em", marginBottom: 6,
                fontFamily: "JetBrains Mono,monospace",
              }}>Relationships</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {relEdges.length === 0
                  ? <span style={{ fontSize: 11, color: "#333", fontFamily: "JetBrains Mono,monospace" }}>none</span>
                  : relEdges.map((e, i) => {
                    const otherId = e.from === selected.id ? e.to : e.from;
                    const other   = nodeMap[otherId];
                    const dir     = e.from === selected.id ? "→" : "←";
                    const col     = EDGE_COLOR[e.kind] ?? "#555";
                    return (
                      <span key={i} style={{
                        background: col + "15", borderRadius: 5,
                        padding: "3px 9px", fontSize: 11, color: col,
                        border: `1px solid ${col}33`,
                        fontFamily: "JetBrains Mono,monospace",
                      }}>
                        {dir} <em>{e.label}</em> {other?.label ?? otherId}
                      </span>
                    );
                  })}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 18, color: "#333", alignSelf: "flex-start",
              padding: "0 4px", lineHeight: 1,
            }}>×</button>
          </div>
        );
      })()}
    </div>
  );
}
