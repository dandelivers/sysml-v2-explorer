import { useState, useMemo } from "react";
import DrilldownDiagram, { buildTree } from "./shared/DrilldownDiagram.jsx";

// ── Column definitions ────────────────────────────────────────────────────────

const ALL_COLS = [
  { id:"keyword",   label:"Keyword",          defaultOn: true  },
  { id:"children",  label:"Sub-requirements", defaultOn: true  },
  { id:"functions", label:"Related Functions", defaultOn: true  },
  { id:"structure", label:"Related Structure", defaultOn: true  },
  { id:"id",        label:"ID",               defaultOn: false },
];

// ── Flatten hierarchy into rows with depth ────────────────────────────────────

function flattenTree(nodes, childrenOf, nodeMap, depth = 0) {
  const rows = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    const children = (childrenOf[node.id] ?? [])
      .map(c => nodeMap[c.id]).filter(Boolean);
    if (children.length) {
      rows.push(...flattenTree(children, childrenOf, nodeMap, depth + 1));
    }
  }
  return rows;
}

// ── Requirements table ────────────────────────────────────────────────────────

function RequirementsTable({ nodes, edges }) {
  const [visibleCols, setVisibleCols] = useState(
    () => new Set(ALL_COLS.filter(c => c.defaultOn).map(c => c.id))
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const [collapsed, setCollapsed] = useState(new Set());

  const { roots, childrenOf, nodeMap } = useMemo(
    () => buildTree(nodes, edges, "requirement"),
    [nodes, edges]
  );

  // Build a lookup: nodeId → related node ids by domain
  const relatedByDomain = useMemo(() => {
    const map = {};
    for (const n of nodes.filter(n => n.domain === "requirement")) {
      const funcRels = edges
        .filter(e => (e.from === n.id || e.to === n.id))
        .map(e => e.from === n.id ? e.to : e.from)
        .filter(id => nodes.find(n2 => n2.id === id && n2.domain === "behaviour"))
        .map(id => nodes.find(n2 => n2.id === id)?.label ?? id);

      const structRels = edges
        .filter(e => (e.from === n.id || e.to === n.id))
        .map(e => e.from === n.id ? e.to : e.from)
        .filter(id => nodes.find(n2 => n2.id === id && n2.domain === "structure"))
        .map(id => nodes.find(n2 => n2.id === id)?.label ?? id);

      map[n.id] = { functions: funcRels, structure: structRels };
    }
    return map;
  }, [nodes, edges]);

  const allRows = useMemo(
    () => flattenTree(roots, childrenOf, nodeMap),
    [roots, childrenOf, nodeMap]
  );

  // Filter out collapsed subtrees
  const visibleRows = useMemo(() => {
    const hidden = new Set();
    const result = [];
    for (const row of allRows) {
      if (hidden.has(row.node.id)) continue;
      result.push(row);
      if (collapsed.has(row.node.id)) {
        // Hide all descendants
        function hideChildren(id) {
          (childrenOf[id] ?? []).forEach(c => {
            hidden.add(c.id);
            hideChildren(c.id);
          });
        }
        hideChildren(row.node.id);
      }
    }
    return result;
  }, [allRows, collapsed, childrenOf]);

  function toggleCollapse(id) {
    setCollapsed(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCol(id) {
    setVisibleCols(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!roots.length) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"#bbb", fontFamily:"Arial,sans-serif", fontSize:13 }}>
        No requirement definitions found in the model.
      </div>
    );
  }

  const thStyle = {
    padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700,
    color:"#555", textTransform:"uppercase", letterSpacing:0.8,
    borderBottom:"2px solid #e0e0e0", background:"#fafafa",
    fontFamily:"Arial,sans-serif", whiteSpace:"nowrap",
  };

  const tdStyle = (depth) => ({
    padding:"7px 12px", fontSize:12, fontFamily:"Arial,sans-serif",
    borderBottom:"1px solid #f0f0f0", verticalAlign:"middle",
    paddingLeft: 12 + depth * 20,
  });

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Toolbar */}
      <div style={{ padding:"8px 16px", display:"flex", justifyContent:"space-between",
        alignItems:"center", flexShrink:0, gap:8 }}>
        <span style={{ fontSize:11, color:"#888", fontFamily:"Arial,sans-serif" }}>
          {allRows.length} requirement{allRows.length !== 1 ? "s" : ""}
        </span>
        <div style={{ position:"relative" }}>
          <button onClick={() => setShowColPicker(s => !s)} style={{
            fontSize:11, fontFamily:"Arial,sans-serif", padding:"4px 12px",
            border:"1.5px solid #ddd", borderRadius:4, background:"#fff",
            cursor:"pointer", color:"#555", fontWeight:600,
          }}>
            Columns ▾
          </button>
          {showColPicker && (
            <div style={{ position:"absolute", right:0, top:"110%", background:"#fff",
              border:"1.5px solid #ddd", borderRadius:6, padding:"8px 0",
              boxShadow:"0 4px 16px rgba(0,0,0,0.12)", zIndex:100, minWidth:180 }}>
              {ALL_COLS.map(col => (
                <label key={col.id} style={{ display:"flex", alignItems:"center",
                  gap:8, padding:"5px 14px", cursor:"pointer",
                  fontFamily:"Arial,sans-serif", fontSize:12, color:"#333",
                  background: visibleCols.has(col.id) ? "#f0f7ff" : "transparent" }}>
                  <input type="checkbox" checked={visibleCols.has(col.id)}
                    onChange={() => toggleCol(col.id)}/>
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflow:"auto", padding:"0 16px 16px" }}
        onClick={() => showColPicker && setShowColPicker(false)}>
        <table style={{ width:"100%", borderCollapse:"collapse",
          background:"#fff", borderRadius:8, overflow:"hidden",
          boxShadow:"0 2px 12px rgba(0,0,0,0.07)", fontSize:12 }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              {ALL_COLS.filter(c => visibleCols.has(c.id)).map(c => (
                <th key={c.id} style={thStyle}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ node, depth }) => {
              const hasChildren = (childrenOf[node.id] ?? []).length > 0;
              const isCollapsed = collapsed.has(node.id);
              const rel         = relatedByDomain[node.id] ?? {};

              return (
                <tr key={node.id}
                  style={{ background: depth % 2 === 0 ? "#fff" : "#fefdf5" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fffbea"}
                  onMouseLeave={e => e.currentTarget.style.background = depth % 2 === 0 ? "#fff" : "#fefdf5"}>

                  {/* Name cell with indent + expand toggle */}
                  <td style={{ ...tdStyle(depth), paddingLeft: 12 + depth * 22 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {/* Expand / collapse toggle */}
                      {hasChildren ? (
                        <button onClick={() => toggleCollapse(node.id)} style={{
                          background:"none", border:"none", cursor:"pointer",
                          fontSize:10, color:"#c8a84b", padding:"0 2px",
                          lineHeight:1, flexShrink:0,
                        }}>
                          {isCollapsed ? "▶" : "▼"}
                        </button>
                      ) : (
                        <span style={{ display:"inline-block", width:14, flexShrink:0 }}/>
                      )}

                      {/* Depth indicator line */}
                      {depth > 0 && (
                        <span style={{ display:"inline-block", width:1, height:14,
                          background:"#e0c060", marginRight:2, borderRadius:1, flexShrink:0 }}/>
                      )}

                      <span style={{ fontWeight: depth === 0 ? 700 : 500, color:"#111" }}>
                        {node.label}
                      </span>
                    </div>
                  </td>

                  {/* Optional columns */}
                  {ALL_COLS.filter(c => visibleCols.has(c.id)).map(col => {
                    let content = null;
                    if (col.id === "keyword") {
                      content = (
                        <code style={{ fontSize:10, color:"#c8a84b", background:"#fef9e7",
                          padding:"2px 6px", borderRadius:3 }}>
                          {node.kw}
                        </code>
                      );
                    } else if (col.id === "id") {
                      content = <span style={{ color:"#aaa", fontSize:10 }}>{node.id}</span>;
                    } else if (col.id === "children") {
                      const count = (childrenOf[node.id] ?? []).length;
                      content = count > 0
                        ? <span style={{ color:"#c8a84b", fontWeight:600 }}>{count}</span>
                        : <span style={{ color:"#ccc" }}>—</span>;
                    } else if (col.id === "functions") {
                      const items = rel.functions ?? [];
                      content = items.length
                        ? <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                            {items.map((f, i) => (
                              <span key={i} style={{ fontSize:9.5, background:"#eafaf1",
                                color:"#1e8449", border:"1px solid #27ae6044",
                                borderRadius:3, padding:"1px 6px" }}>{f}</span>
                            ))}
                          </div>
                        : <span style={{ color:"#ccc" }}>—</span>;
                    } else if (col.id === "structure") {
                      const items = rel.structure ?? [];
                      content = items.length
                        ? <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                            {items.map((s, i) => (
                              <span key={i} style={{ fontSize:9.5, background:"#eaf4fb",
                                color:"#1a6fa0", border:"1px solid #2e86c144",
                                borderRadius:3, padding:"1px 6px" }}>{s}</span>
                            ))}
                          </div>
                        : <span style={{ color:"#ccc" }}>—</span>;
                    }
                    return <td key={col.id} style={tdStyle(0)}>{content}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── RequirementsView ──────────────────────────────────────────────────────────

const TABS = [
  { id:"table",   label:"Table"   },
  { id:"diagram", label:"Diagram" },
];

export default function RequirementsView({ nodes, edges }) {
  const [tab, setTab] = useState("table");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Sub-tab bar */}
      <div style={{ display:"flex", gap:2, padding:"6px 16px 0", flexShrink:0,
        borderBottom:"1.5px solid #e0e0e0" }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:"5px 16px", fontSize:12, fontFamily:"Arial,sans-serif",
              fontWeight: active ? 700 : 400,
              color:       active ? "#d4ac0d" : "#888",
              background:  active ? "#fff"    : "transparent",
              border:"1.5px solid", borderRadius:"6px 6px 0 0",
              borderColor: active ? "#e0e0e0" : "transparent",
              borderBottom: active ? "1.5px solid #fff" : "1.5px solid transparent",
              cursor:"pointer", marginBottom: active ? "-1.5px" : 0,
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
        paddingTop:12 }}>
        {tab === "table"
          ? <RequirementsTable nodes={nodes} edges={edges}/>
          : <DrilldownDiagram  nodes={nodes} edges={edges} domain="requirement"/>
        }
      </div>
    </div>
  );
}
