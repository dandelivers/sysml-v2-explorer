import { useState } from "react";

const DOMAIN_CFG = {
  requirement: { label:"Requirements",    bg:"#fef9e7", border:"#c8a84b", header:"#d4ac0d", text:"#7d6608" },
  behaviour:   { label:"Behaviour",       bg:"#eafaf1", border:"#27ae60", header:"#1e8449", text:"#145a32" },
  structure:   { label:"Structure",       bg:"#eaf4fb", border:"#2e86c1", header:"#1a6fa0", text:"#154360" },
  interface:   { label:"Interface",       bg:"#fdf2ee", border:"#ca6f1e", header:"#b05a10", text:"#784212" },
  config:      { label:"Config",          bg:"#f5eef8", border:"#8e44ad", header:"#7d3c98", text:"#4a235a" },
  unknown:     { label:"Unknown",         bg:"#f5f5f5", border:"#999999", header:"#777777", text:"#555555" },
};

const DOMAIN_ORDER = ["requirement","behaviour","structure","interface","config","unknown"];

const EDGE_COLOR = {
  composition:    "#555",
  specialization: "#2e86c1",
  connection:     "#b05a10",
  allocation:     "#7d3c98",
};

const CW     = 178;
const NODE_H = 66;
const NODE_W = 154;
const GAP_X  = 26;
const GAP_Y  = 18;
const PAD_X  = 16;
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
  const baseColor = EDGE_COLOR[kind] ?? "#777";
  const color = active ? baseColor : baseColor + "66";
  const sw    = active ? 1.6 : 1.0;
  const dash  = kind === "specialization" || kind === "allocation" ? "5,4" : undefined;
  const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy);
  if (len < 2) return null;
  const angle = Math.atan2(dy, dx);
  const al = 8, aw = 0.32;
  const ax1 = x2 - al*Math.cos(angle-aw), ay1 = y2 - al*Math.sin(angle-aw);
  const ax2 = x2 - al*Math.cos(angle+aw), ay2 = y2 - al*Math.sin(angle+aw);
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  const perpX = -dy/len*7, perpY = dx/len*7;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeDasharray={dash}/>
      <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color}/>
      {label && active && (
        <text x={mx+perpX} y={my+perpY} textAnchor="middle" fontSize={8.5}
          fontFamily="Arial,sans-serif" fill={color} fontStyle="italic"
          style={{pointerEvents:"none"}}>
          {label}
        </text>
      )}
    </g>
  );
}

function NodeBox({ node, pos, domainCfg, hot, onHover, onClick }) {
  const d  = domainCfg;
  const rx = node.kind === "useCaseDef" ? pos.w/2 : 4;
  const words = node.label.match(/[A-Z][a-z]+|[a-z]+|[A-Z]+(?=[A-Z]|$)/g) ?? [node.label];
  const line1 = words.slice(0, 2).join("");
  const line2 = words.length > 2 ? words.slice(2).join("") : null;
  return (
    <g style={{cursor:"pointer"}}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node)}>
      <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={rx}
        fill={hot ? d.header : "#fff"} stroke={d.border} strokeWidth={hot ? 2.2 : 1.4}/>
      <text x={pos.x+pos.w/2} y={pos.y+13} textAnchor="middle" fontSize={8}
        fontFamily="Arial,sans-serif" fontStyle="italic"
        fill={hot ? "rgba(255,255,255,0.8)" : d.text}>
        {node.stereo ?? ""}
      </text>
      <text x={pos.x+pos.w/2} y={pos.y+25} textAnchor="middle" fontSize={8.5}
        fontFamily="Arial,sans-serif" fontWeight="700"
        fill={hot ? "rgba(255,255,255,0.8)" : d.header}>
        {node.kw}
      </text>
      <line x1={pos.x+6} y1={pos.y+30} x2={pos.x+pos.w-6} y2={pos.y+30}
        stroke={hot ? "rgba(255,255,255,0.3)" : d.border} strokeWidth={0.7}/>
      <text x={pos.x+pos.w/2} y={pos.y+45} textAnchor="middle" fontSize={10.5}
        fontFamily="Arial,sans-serif" fontWeight="800"
        fill={hot ? "#fff" : "#111"}>
        {line1}
      </text>
      {line2 && (
        <text x={pos.x+pos.w/2} y={pos.y+58} textAnchor="middle" fontSize={10}
          fontFamily="Arial,sans-serif" fontWeight="800"
          fill={hot ? "#fff" : "#111"}>
          {line2}
        </text>
      )}
    </g>
  );
}

export default function OverviewView({ nodes, edges, svgRef, exporting }) {
  const [hovered,  setHovered]  = useState(null);
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
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
        color:"#aaa",fontFamily:"Arial,sans-serif",fontSize:14}}>
        Type some SysML V2 in the editor to generate a diagram.
      </div>
    );
  }

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"auto"}}>
      <div style={{background:"#fff",border:"1.5px solid #ccc",borderRadius:8,
        overflow:"auto",boxShadow:"0 4px 20px rgba(0,0,0,0.1)",margin:"0 12px 12px"}}>
        <svg ref={svgRef} width={totalW} height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`} style={{display:"block"}}>

          {activeDomains.map((domain, ci) => {
            const d = DOMAIN_CFG[domain];
            const x = PAD_X + ci * (CW + GAP_X);
            const y = HEADER_H - 20;
            return (
              <g key={domain}>
                <rect x={x} y={y} width={CW} height={colH+20} rx={5}
                  fill={d.bg} stroke={d.border} strokeWidth={1.4} opacity={0.72}/>
                <rect x={x} y={y} width={CW} height={24} rx={5} fill={d.header}/>
                <rect x={x} y={y+12} width={CW} height={12} fill={d.header}/>
                <text x={x+CW/2} y={y+18} textAnchor="middle" fontSize={9.5}
                  fontFamily="Arial,sans-serif" fontWeight="800" fill="#fff" letterSpacing={0.8}>
                  {d.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {edges.map(e => {
            if (activeEdges.has(e.id) && !exporting) return null;
            const fp = positions[e.from], tp = positions[e.to];
            if (!fp || !tp) return null;
            const pts = edgePts(fp, tp);
            return <Arrow key={e.id} {...pts} label={e.label} kind={e.kind} active={exporting}/>;
          })}

          {!exporting && edges.map(e => {
            if (!activeEdges.has(e.id)) return null;
            const fp = positions[e.from], tp = positions[e.to];
            if (!fp || !tp) return null;
            const pts = edgePts(fp, tp);
            return <Arrow key={"a"+e.id} {...pts} label={e.label} kind={e.kind} active={true}/>;
          })}

          {nodes.map(n => {
            const pos = positions[n.id];
            if (!pos) return null;
            const domain = n.domain in DOMAIN_CFG ? n.domain : "unknown";
            return (
              <NodeBox key={n.id} node={n} pos={pos}
                domainCfg={DOMAIN_CFG[domain]}
                hot={hovered===n.id || selected?.id===n.id}
                onHover={setHovered} onClick={setSelected}/>
            );
          })}
        </svg>
      </div>

      {selected && (() => {
        const d = DOMAIN_CFG[selected.domain in DOMAIN_CFG ? selected.domain : "unknown"];
        const relEdges = edges.filter(e => e.from===selected.id || e.to===selected.id);
        return (
          <div style={{margin:"0 12px 12px",background:"#fff",
            border:`2px solid ${d.border}`,borderRadius:7,padding:"12px 18px",
            display:"flex",gap:20,flexWrap:"wrap",
            boxShadow:"0 2px 12px rgba(0,0,0,0.08)",fontFamily:"Arial,sans-serif"}}>
            <div style={{flex:1,minWidth:160}}>
              <div style={{fontSize:8.5,color:"#999",textTransform:"uppercase",
                letterSpacing:1,marginBottom:2}}>{d.label}</div>
              <div style={{fontSize:14,fontWeight:900,color:"#111"}}>{selected.label}</div>
              <code style={{fontSize:10,color:d.header,display:"block",marginTop:3}}>{selected.kw}</code>
            </div>
            <div style={{flex:2,minWidth:240}}>
              <div style={{fontSize:8.5,color:"#999",textTransform:"uppercase",
                letterSpacing:1,marginBottom:6}}>Relationships</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {relEdges.length === 0
                  ? <span style={{fontSize:9.5,color:"#bbb"}}>none</span>
                  : relEdges.map((e,i) => {
                      const otherId = e.from===selected.id ? e.to : e.from;
                      const other   = nodeMap[otherId];
                      const dir     = e.from===selected.id ? "→" : "←";
                      const col     = EDGE_COLOR[e.kind] ?? "#777";
                      return (
                        <span key={i} style={{background:"#f5f5f5",borderRadius:3,
                          padding:"2px 7px",fontSize:9.5,color:col,
                          border:`1px solid ${col}44`}}>
                          {dir} <em>{e.label}</em> {other?.label ?? otherId}
                        </span>
                      );
                    })
                }
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              style={{background:"none",border:"none",cursor:"pointer",
                fontSize:16,color:"#bbb",alignSelf:"flex-start"}}>×</button>
          </div>
        );
      })()}
    </div>
  );
}
