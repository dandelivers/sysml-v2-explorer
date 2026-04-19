import { useState, useMemo } from "react";

const DOMAIN_CFG = {
  requirement: { label:"Requirements", color:"#93c5fd", bg:"rgba(59,130,246,0.1)",  border:"rgba(59,130,246,0.3)"  },
  behaviour:   { label:"Behaviour",    color:"#6ee7b7", bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.3)"  },
  structure:   { label:"Structure",    color:"#67e8f9", bg:"rgba(6,182,212,0.1)",   border:"rgba(6,182,212,0.3)"   },
  interface:   { label:"Interface",    color:"#fcd34d", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.3)"  },
  config:      { label:"Config",       color:"#c4b5fd", bg:"rgba(139,92,246,0.1)",  border:"rgba(139,92,246,0.3)"  },
  unknown:     { label:"Unknown",      color:"#a1a1aa", bg:"rgba(82,82,91,0.1)",    border:"rgba(82,82,91,0.3)"    },
};
const DOMAINS = Object.keys(DOMAIN_CFG);
function dcfg(d) { return DOMAIN_CFG[d] ?? DOMAIN_CFG.unknown; }

function findPipelinePaths(pipeline, nodes, edges, maxHopsPerStep = 4) {
  if (pipeline.length < 2) return [];
  const HARD_CAP = 300;
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const adj = {};
  for (const e of edges) (adj[e.from] = adj[e.from] ?? []).push(e);

  function extendTo(startId, targetDomain, visited, hops) {
    if (hops > maxHopsPerStep) return [];
    const results = [];
    for (const edge of (adj[startId] ?? [])) {
      if (visited.has(edge.to)) continue;
      const node = nodeMap[edge.to];
      if (!node) continue;
      const pair = [{ kind:"edge", edge }, { kind:"node", node }];
      if (node.domain === targetDomain) {
        results.push(pair);
      } else {
        for (const ext of extendTo(edge.to, targetDomain, new Set([...visited, edge.to]), hops + 1)) {
          results.push([...pair, ...ext]);
        }
      }
    }
    return results;
  }

  let paths = nodes
    .filter(n => n.domain === pipeline[0])
    .map(n => [{ kind:"node", node: n }]);

  for (let step = 1; step < pipeline.length; step++) {
    const target = pipeline[step];
    const nextPaths = [];
    for (const path of paths) {
      if (nextPaths.length >= HARD_CAP) break;
      const tail = path[path.length - 1];
      if (tail.kind !== "node") continue;
      for (const ext of extendTo(tail.node.id, target, new Set([tail.node.id]), 0)) {
        nextPaths.push([...path, ...ext]);
      }
    }
    paths = nextPaths;
    if (paths.length === 0) break;
  }
  return paths.slice(0, HARD_CAP);
}

function NodeChip({ node }) {
  const c = dcfg(node.domain);
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background:c.bg, border:`1px solid ${c.border}`,
      borderRadius:5, padding:"3px 9px", whiteSpace:"nowrap",
    }}>
      <span style={{ fontSize:8, color:c.color, opacity:0.7,
        fontFamily:"'JetBrains Mono',monospace", fontStyle:"italic" }}>
        {node.kw}
      </span>
      <span style={{ fontSize:11, fontWeight:600, color:c.color,
        fontFamily:"'Inter',system-ui,sans-serif" }}>
        {node.label}
      </span>
    </span>
  );
}

function EdgeArrow({ edge }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
      <span style={{ color:"#2e2e2e", fontSize:11 }}>──</span>
      <span style={{ fontSize:10, fontStyle:"italic", color:"#444",
        fontFamily:"'JetBrains Mono',monospace" }}>
        {edge.label || edge.kind}
      </span>
      <span style={{ color:"#333", fontSize:12, fontWeight:700 }}>→</span>
    </span>
  );
}

function PipelineEditor({ pipeline, onChange }) {
  const [adding, setAdding] = useState(false);

  return (
    <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4 }}>
      {pipeline.map((domain, i) => {
        const c = dcfg(domain);
        return (
          <span key={i} style={{ display:"inline-flex", alignItems:"center" }}>
            {i > 0 && <span style={{ color:"#2e2e2e", fontSize:14, margin:"0 4px" }}>→</span>}
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              background:c.bg, border:`1px solid ${c.border}`,
              borderRadius:5, padding:"3px 8px 3px 10px",
              fontSize:11, fontWeight:600, color:c.color,
              fontFamily:"'Inter',system-ui,sans-serif",
            }}>
              {c.label}
              {pipeline.length > 2 && (
                <button onClick={() => onChange(pipeline.filter((_, idx) => idx !== i))} style={{
                  background:"none", border:"none", cursor:"pointer",
                  color:c.color, opacity:0.4, fontSize:13, padding:"0 0 0 2px", lineHeight:1,
                }}>×</button>
              )}
            </span>
          </span>
        );
      })}

      <span style={{ color:"#2e2e2e", fontSize:14, margin:"0 4px" }}>→</span>
      {adding ? (
        <span style={{ display:"inline-flex", gap:4, flexWrap:"wrap" }}>
          {DOMAINS.map(d => {
            const c = dcfg(d);
            return (
              <button key={d} onClick={() => { onChange([...pipeline, d]); setAdding(false); }} style={{
                fontSize:11, fontFamily:"'Inter',system-ui,sans-serif", padding:"3px 10px",
                border:`1px solid ${c.border}`, borderRadius:5,
                background:c.bg, color:c.color, cursor:"pointer", fontWeight:600,
              }}>
                {c.label}
              </button>
            );
          })}
          <button onClick={() => setAdding(false)} style={{
            fontSize:11, fontFamily:"'Inter',system-ui,sans-serif", padding:"3px 9px",
            border:"1px solid #2e2e2e", borderRadius:5,
            background:"transparent", color:"#555", cursor:"pointer",
          }}>Cancel</button>
        </span>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          fontSize:11, fontFamily:"'Inter',system-ui,sans-serif", padding:"3px 11px",
          border:"1px dashed #2e2e2e", borderRadius:5,
          background:"transparent", color:"#444", cursor:"pointer",
        }}>
          + Add stop
        </button>
      )}
    </div>
  );
}

const SEL_STYLE = {
  fontSize:11, fontFamily:"'Inter',system-ui,sans-serif", padding:"5px 8px",
  border:"1px solid #2e2e2e", borderRadius:6, background:"#111", color:"#b4b4b4",
  cursor:"pointer",
};

function ChainView({ nodes, edges }) {
  const [pipeline,    setPipeline]    = useState(["requirement", "behaviour", "structure"]);
  const [maxHops,     setMaxHops]     = useState(3);
  const [filterEmpty, setFilterEmpty] = useState(true);

  const paths = useMemo(
    () => findPipelinePaths(pipeline, nodes, edges, maxHops),
    [pipeline, nodes, edges, maxHops]
  );
  const displayed = filterEmpty
    ? paths.filter(p => {
        const stops = p.filter(s => s.kind === "node").map(s => s.node.domain);
        return pipeline.every(d => stops.includes(d));
      })
    : paths;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"12px 18px", display:"flex", flexDirection:"column",
        gap:10, flexShrink:0, borderBottom:"1px solid #1a1a1a", background:"#0f0f0f" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"#444", fontFamily:"'JetBrains Mono',monospace",
            fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", minWidth:56 }}>
            Pipeline
          </span>
          <PipelineEditor pipeline={pipeline} onChange={setPipeline}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:"#555", fontFamily:"'Inter',system-ui,sans-serif" }}>
              Max hops:
            </span>
            <select value={maxHops} onChange={e => setMaxHops(Number(e.target.value))} style={SEL_STYLE}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
            fontSize:11, color:"#555", fontFamily:"'Inter',system-ui,sans-serif" }}>
            <input type="checkbox" checked={filterEmpty}
              onChange={e => setFilterEmpty(e.target.checked)}
              style={{ accentColor:"#3b82f6" }}/>
            Only complete chains
          </label>
          <span style={{ fontSize:11, color:"#333", fontFamily:"'JetBrains Mono',monospace" }}>
            {displayed.length} chain{displayed.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          color:"#333", fontFamily:"'Inter',system-ui,sans-serif", fontSize:13,
          flexDirection:"column", gap:8 }}>
          <span>No chains found through this pipeline.</span>
          <span style={{ fontSize:11, color:"#2a2a2a" }}>
            Try adding relationships between elements, or increase max hops.
          </span>
        </div>
      ) : (
        <div style={{ flex:1, overflow:"auto", padding:"12px 18px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {displayed.map((path, pi) => (
              <div key={pi} style={{
                padding:"9px 14px", borderRadius:6, border:"1px solid #1a1a1a",
                background:"#0f0f0f", display:"flex", alignItems:"center",
                gap:5, flexWrap:"wrap",
                transition:"background 0.12s, border-color 0.12s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background="#141414"; e.currentTarget.style.borderColor="#2a2a2a"; }}
                onMouseLeave={e => { e.currentTarget.style.background="#0f0f0f"; e.currentTarget.style.borderColor="#1a1a1a"; }}>
                {path.map((step, si) =>
                  step.kind === "node"
                    ? <NodeChip key={si} node={step.node}/>
                    : <EdgeArrow key={si} edge={step.edge}/>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectView({ nodes, edges }) {
  const [filterFrom, setFilterFrom] = useState("all");
  const [filterTo,   setFilterTo]   = useState("all");
  const [filterKind, setFilterKind] = useState("all");

  const nodeMap   = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);
  const edgeKinds = useMemo(() => [...new Set(edges.map(e => e.kind))], [edges]);

  const filtered = useMemo(() => edges.filter(e => {
    const f = nodeMap[e.from], t = nodeMap[e.to];
    if (!f || !t) return false;
    if (filterFrom !== "all" && f.domain !== filterFrom) return false;
    if (filterTo   !== "all" && t.domain !== filterTo)   return false;
    if (filterKind !== "all" && e.kind   !== filterKind) return false;
    return true;
  }), [edges, nodeMap, filterFrom, filterTo, filterKind]);

  const TH = { padding:"8px 14px", textAlign:"left", fontSize:10, fontWeight:600,
    color:"#444", textTransform:"uppercase", letterSpacing:"0.08em",
    borderBottom:"1px solid #1f1f1f", background:"#0f0f0f",
    fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap" };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"10px 18px", display:"flex", alignItems:"center",
        gap:10, flexShrink:0, flexWrap:"wrap", borderBottom:"1px solid #1a1a1a",
        background:"#0f0f0f" }}>
        <span style={{ fontSize:11, color:"#444", fontFamily:"'Inter',system-ui,sans-serif" }}>From:</span>
        <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={SEL_STYLE}>
          <option value="all">All</option>
          {DOMAINS.map(d => <option key={d} value={d}>{dcfg(d).label}</option>)}
        </select>
        <span style={{ fontSize:11, color:"#444", fontFamily:"'Inter',system-ui,sans-serif" }}>To:</span>
        <select value={filterTo} onChange={e => setFilterTo(e.target.value)} style={SEL_STYLE}>
          <option value="all">All</option>
          {DOMAINS.map(d => <option key={d} value={d}>{dcfg(d).label}</option>)}
        </select>
        <span style={{ fontSize:11, color:"#444", fontFamily:"'Inter',system-ui,sans-serif" }}>Type:</span>
        <select value={filterKind} onChange={e => setFilterKind(e.target.value)} style={SEL_STYLE}>
          <option value="all">All</option>
          {edgeKinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <span style={{ fontSize:11, color:"#2a2a2a", fontFamily:"'JetBrains Mono',monospace" }}>
          {filtered.length} relationship{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ flex:1, overflow:"auto", padding:"12px 18px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={TH}>Source</th>
              <th style={TH}>Relationship</th>
              <th style={TH}>Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const f = nodeMap[e.from], t = nodeMap[e.to];
              return (
                <tr key={i}
                  style={{ borderBottom:"1px solid #141414", background:"transparent" }}
                  onMouseEnter={ev => ev.currentTarget.style.background = "#0f0f0f"}
                  onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                  <td style={{ padding:"8px 14px" }}>{f && <NodeChip node={f}/>}</td>
                  <td style={{ padding:"8px 14px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:10, fontStyle:"italic", color:"#555",
                        fontFamily:"'JetBrains Mono',monospace" }}>
                        {e.label || e.kind}
                      </span>
                      <span style={{ fontSize:9, color:"#333", background:"#161616",
                        borderRadius:4, padding:"1px 6px", border:"1px solid #2a2a2a",
                        fontFamily:"'JetBrains Mono',monospace" }}>{e.kind}</span>
                    </span>
                  </td>
                  <td style={{ padding:"8px 14px" }}>{t && <NodeChip node={t}/>}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={3} style={{ padding:28, textAlign:"center",
                color:"#2a2a2a", fontFamily:"'Inter',system-ui,sans-serif", fontSize:13 }}>
                No relationships match the filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const VIEW_TABS = [
  { id:"chain",  label:"Trace Chains"          },
  { id:"direct", label:"Direct Relationships"  },
];

export default function TraceabilityView({ nodes, edges }) {
  const [tab, setTab] = useState("chain");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", gap:0, padding:"0 18px",
        flexShrink:0, borderBottom:"1px solid #1a1a1a", background:"#0f0f0f" }}>
        {VIEW_TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              position:"relative", padding:"11px 16px", fontSize:12,
              fontFamily:"'Inter',system-ui,sans-serif",
              fontWeight: active ? 600 : 400,
              color:      active ? "#ececec" : "#555",
              background: "transparent", border:"none", cursor:"pointer",
              letterSpacing:"-0.01em",
              borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
              marginBottom:"-1px",
              transition:"color 0.15s",
            }}>{t.label}</button>
          );
        })}
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {tab === "direct"
          ? <DirectView nodes={nodes} edges={edges}/>
          : <ChainView  nodes={nodes} edges={edges}/>
        }
      </div>
    </div>
  );
}
