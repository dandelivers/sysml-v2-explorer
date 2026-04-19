import { useState, useMemo } from "react";

// ── Domain config ─────────────────────────────────────────────────────────────

const DOMAIN_CFG = {
  requirement: { label:"Requirements", color:"#d4ac0d", bg:"#fef9e7", border:"#c8a84b" },
  behaviour:   { label:"Behaviour",    color:"#1e8449", bg:"#eafaf1", border:"#27ae60" },
  structure:   { label:"Structure",    color:"#1a6fa0", bg:"#eaf4fb", border:"#2e86c1" },
  interface:   { label:"Interface",    color:"#b05a10", bg:"#fdf2ee", border:"#ca6f1e" },
  config:      { label:"Config",       color:"#7d3c98", bg:"#f5eef8", border:"#8e44ad" },
  unknown:     { label:"Unknown",      color:"#777",    bg:"#f5f5f5", border:"#999"    },
};
const DOMAINS = Object.keys(DOMAIN_CFG);
function dcfg(d) { return DOMAIN_CFG[d] ?? DOMAIN_CFG.unknown; }

// ── Pipeline path finder ──────────────────────────────────────────────────────
//
// Given an ordered array of domain stops, finds all paths that traverse each
// stop in sequence. Returns an array of paths where each path is an array of
// alternating { kind:'node', node } / { kind:'edge', edge } steps.

function findPipelinePaths(pipeline, nodes, edges, maxHopsPerStep = 4) {
  if (pipeline.length < 2) return [];
  const HARD_CAP = 300;

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const adj     = {};
  for (const e of edges) (adj[e.from] = adj[e.from] ?? []).push(e);

  // From a given node, find all edge+node extension sequences that reach
  // a node in `targetDomain`. Returns arrays of steps NOT including the
  // start node itself (i.e., starts with an edge step).
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
        // Traverse through intermediate nodes
        for (const ext of extendTo(edge.to, targetDomain, new Set([...visited, edge.to]), hops + 1)) {
          results.push([...pair, ...ext]);
        }
      }
    }
    return results;
  }

  // Seed: one path per node in the first pipeline domain
  let paths = nodes
    .filter(n => n.domain === pipeline[0])
    .map(n => [{ kind:"node", node: n }]);

  // Walk each subsequent stop
  for (let step = 1; step < pipeline.length; step++) {
    const target   = pipeline[step];
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

// ── Element chip ──────────────────────────────────────────────────────────────

function NodeChip({ node }) {
  const c = dcfg(node.domain);
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      background:c.bg, border:`1.5px solid ${c.border}`,
      borderRadius:5, padding:"3px 9px", whiteSpace:"nowrap",
    }}>
      <span style={{ fontSize:8.5, color:c.color, opacity:0.8, fontFamily:"Arial,sans-serif" }}>
        {node.kw}
      </span>
      <span style={{ fontSize:11, fontWeight:700, color:c.color, fontFamily:"Arial,sans-serif" }}>
        {node.label}
      </span>
    </span>
  );
}

function EdgeArrow({ edge }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3,
      fontFamily:"Arial,sans-serif", whiteSpace:"nowrap" }}>
      <span style={{ color:"#ccc", fontSize:11 }}>──</span>
      <span style={{ fontSize:10, fontStyle:"italic", color:"#666" }}>
        {edge.label || edge.kind}
      </span>
      <span style={{ color:"#999", fontSize:12, fontWeight:700 }}>→</span>
    </span>
  );
}

// ── Pipeline editor ───────────────────────────────────────────────────────────

function PipelineEditor({ pipeline, onChange }) {
  const [adding, setAdding] = useState(false);

  function removeStop(i) {
    onChange(pipeline.filter((_, idx) => idx !== i));
  }

  function addStop(domain) {
    onChange([...pipeline, domain]);
    setAdding(false);
  }

  return (
    <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4 }}>
      {pipeline.map((domain, i) => {
        const c = dcfg(domain);
        return (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:0 }}>
            {i > 0 && (
              <span style={{ color:"#bbb", fontSize:16, margin:"0 2px" }}>→</span>
            )}
            <span style={{
              display:"inline-flex", alignItems:"center", gap:5,
              background:c.bg, border:`1.5px solid ${c.border}`,
              borderRadius:5, padding:"3px 8px 3px 10px",
              fontSize:11, fontWeight:700, color:c.color,
              fontFamily:"Arial,sans-serif",
            }}>
              {c.label}
              {pipeline.length > 2 && (
                <button onClick={() => removeStop(i)} style={{
                  background:"none", border:"none", cursor:"pointer",
                  color:c.color, opacity:0.5, fontSize:13, padding:"0 0 0 2px",
                  lineHeight:1,
                }}>×</button>
              )}
            </span>
          </span>
        );
      })}

      {/* Add stop button */}
      <span style={{ color:"#bbb", fontSize:16, margin:"0 2px" }}>→</span>
      {adding ? (
        <span style={{ display:"inline-flex", gap:3, flexWrap:"wrap" }}>
          {DOMAINS.map(d => {
            const c = dcfg(d);
            return (
              <button key={d} onClick={() => addStop(d)} style={{
                fontSize:10, fontFamily:"Arial,sans-serif", padding:"3px 9px",
                border:`1.5px solid ${c.border}`, borderRadius:4,
                background:c.bg, color:c.color, cursor:"pointer", fontWeight:600,
              }}>
                {c.label}
              </button>
            );
          })}
          <button onClick={() => setAdding(false)} style={{
            fontSize:10, fontFamily:"Arial,sans-serif", padding:"3px 8px",
            border:"1.5px solid #ddd", borderRadius:4,
            background:"#fff", color:"#aaa", cursor:"pointer",
          }}>Cancel</button>
        </span>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          fontSize:11, fontFamily:"Arial,sans-serif", padding:"3px 10px",
          border:"1.5px dashed #ccc", borderRadius:5,
          background:"transparent", color:"#aaa", cursor:"pointer",
        }}>
          + Add stop
        </button>
      )}
    </div>
  );
}

// ── Trace chains tab ──────────────────────────────────────────────────────────

function ChainView({ nodes, edges }) {
  const [pipeline,     setPipeline]     = useState(["requirement", "behaviour", "structure"]);
  const [maxHops,      setMaxHops]      = useState(3);
  const [filterEmpty,  setFilterEmpty]  = useState(true);

  const paths = useMemo(
    () => findPipelinePaths(pipeline, nodes, edges, maxHops),
    [pipeline, nodes, edges, maxHops]
  );

  // Optionally hide paths shorter than the full pipeline
  const displayed = filterEmpty
    ? paths.filter(p => {
        const domainStops = p.filter(s => s.kind === "node").map(s => s.node.domain);
        return pipeline.every(d => domainStops.includes(d));
      })
    : paths;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Controls */}
      <div style={{ padding:"10px 16px", display:"flex", flexDirection:"column",
        gap:10, flexShrink:0, borderBottom:"1px solid #eee" }}>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif",
            fontWeight:600, minWidth:60 }}>Pipeline:</span>
          <PipelineEditor pipeline={pipeline} onChange={setPipeline}/>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif" }}>
              Max hops per step:
            </span>
            <select value={maxHops} onChange={e => setMaxHops(Number(e.target.value))}
              style={{ fontSize:11, fontFamily:"Arial,sans-serif", padding:"3px 6px",
                border:"1.5px solid #ddd", borderRadius:4, background:"#fff" }}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <label style={{ display:"flex", alignItems:"center", gap:5,
            fontSize:11, color:"#888", fontFamily:"Arial,sans-serif", cursor:"pointer" }}>
            <input type="checkbox" checked={filterEmpty}
              onChange={e => setFilterEmpty(e.target.checked)}/>
            Only show complete chains
          </label>

          <span style={{ fontSize:11, color:"#bbb", fontFamily:"Arial,sans-serif" }}>
            {displayed.length} chain{displayed.length !== 1 ? "s" : ""} found
          </span>
        </div>
      </div>

      {/* Results */}
      {displayed.length === 0 ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          color:"#bbb", fontFamily:"Arial,sans-serif", fontSize:13, flexDirection:"column", gap:8 }}>
          <span>No chains found through this pipeline.</span>
          <span style={{ fontSize:11 }}>Try adding relationships between elements in different domains,
            or increase max hops.</span>
        </div>
      ) : (
        <div style={{ flex:1, overflow:"auto", padding:"8px 16px 16px" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff",
            borderRadius:8, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
            <tbody>
              {displayed.map((path, pi) => (
                <tr key={pi} style={{ borderBottom:"1px solid #f0f0f0" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding:"9px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:5, flexWrap:"wrap" }}>
                      {path.map((step, si) =>
                        step.kind === "node"
                          ? <NodeChip key={si} node={step.node}/>
                          : <EdgeArrow key={si} edge={step.edge}/>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Direct relationships tab ──────────────────────────────────────────────────

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

  const sel = {
    fontSize:11, fontFamily:"Arial,sans-serif", padding:"4px 8px",
    border:"1.5px solid #ddd", borderRadius:4, background:"#fff", color:"#333",
  };
  const th = {
    padding:"8px 14px", textAlign:"left", fontSize:10, fontWeight:700,
    color:"#555", textTransform:"uppercase", letterSpacing:0.8,
    borderBottom:"2px solid #e8e8e8", background:"#fafafa",
    fontFamily:"Arial,sans-serif", whiteSpace:"nowrap",
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"8px 16px", display:"flex", alignItems:"center",
        gap:10, flexShrink:0, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif" }}>From:</span>
        <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={sel}>
          <option value="all">All</option>
          {DOMAINS.map(d => <option key={d} value={d}>{dcfg(d).label}</option>)}
        </select>
        <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif" }}>To:</span>
        <select value={filterTo} onChange={e => setFilterTo(e.target.value)} style={sel}>
          <option value="all">All</option>
          {DOMAINS.map(d => <option key={d} value={d}>{dcfg(d).label}</option>)}
        </select>
        <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif" }}>Type:</span>
        <select value={filterKind} onChange={e => setFilterKind(e.target.value)} style={sel}>
          <option value="all">All</option>
          {edgeKinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <span style={{ fontSize:11, color:"#bbb", fontFamily:"Arial,sans-serif" }}>
          {filtered.length} relationship{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ flex:1, overflow:"auto", padding:"0 16px 16px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", background:"#fff",
          borderRadius:8, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <thead>
            <tr>
              <th style={th}>Source</th>
              <th style={th}>Relationship</th>
              <th style={th}>Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const f = nodeMap[e.from], t = nodeMap[e.to];
              return (
                <tr key={i} style={{ borderBottom:"1px solid #f0f0f0" }}
                  onMouseEnter={ev => ev.currentTarget.style.background = "#f8f8f8"}
                  onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                  <td style={{ padding:"8px 14px" }}>{f && <NodeChip node={f}/>}</td>
                  <td style={{ padding:"8px 14px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
                      fontFamily:"Arial,sans-serif" }}>
                      <span style={{ fontSize:10, fontStyle:"italic", color:"#555" }}>
                        {e.label || e.kind}
                      </span>
                      <span style={{ fontSize:9, color:"#bbb", background:"#f5f5f5",
                        borderRadius:3, padding:"1px 5px" }}>{e.kind}</span>
                    </span>
                  </td>
                  <td style={{ padding:"8px 14px" }}>{t && <NodeChip node={t}/>}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={3} style={{ padding:24, textAlign:"center",
                color:"#bbb", fontFamily:"Arial,sans-serif", fontSize:13 }}>
                No relationships match the current filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TraceabilityView ──────────────────────────────────────────────────────────

const TABS = [
  { id:"direct", label:"Direct Relationships" },
  { id:"chain",  label:"Trace Chains"         },
];

export default function TraceabilityView({ nodes, edges }) {
  const [tab, setTab] = useState("chain");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", gap:2, padding:"6px 16px 0",
        flexShrink:0, borderBottom:"1.5px solid #e0e0e0" }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:"5px 16px", fontSize:12, fontFamily:"Arial,sans-serif",
              fontWeight: active ? 700 : 400,
              color:       active ? "#555" : "#888",
              background:  active ? "#fff" : "transparent",
              border:"1.5px solid", borderRadius:"6px 6px 0 0",
              borderColor: active ? "#e0e0e0" : "transparent",
              borderBottom: active ? "1.5px solid #fff" : "1.5px solid transparent",
              cursor:"pointer", marginBottom: active ? "-1.5px" : 0,
            }}>{t.label}</button>
          );
        })}
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column",
        overflow:"hidden", paddingTop:12 }}>
        {tab === "direct"
          ? <DirectView nodes={nodes} edges={edges}/>
          : <ChainView  nodes={nodes} edges={edges}/>
        }
      </div>
    </div>
  );
}
