import { useState, useMemo } from "react";

// ── Layout constants ──────────────────────────────────────────────────────────

const REQ_COL_X    = 16;
const REQ_W        = 164;
const REQ_H        = 40;
const FN_COL_X     = 230;
const FN_W         = 190;
const FN_H         = 68;
const STRUCT_COL_X = 466;
const STRUCT_W     = 170;
const STRUCT_H     = 40;
const ITEM_GAP     = 12;
const SECTION_PAD  = 18;
const SECTION_GAP  = 14;
const TOTAL_W      = STRUCT_COL_X + STRUCT_W + 20;

// ── Colours ───────────────────────────────────────────────────────────────────

const REQ_C    = { bg:"#fef9e7", border:"#c8a84b", text:"#7d6608", header:"#d4ac0d" };
const FN_C     = { bg:"#eafaf1", border:"#27ae60", text:"#145a32", header:"#1e8449" };
const STRUCT_C = { bg:"#eaf4fb", border:"#2e86c1", text:"#154360", header:"#1a6fa0" };

// ── Build function data ───────────────────────────────────────────────────────

function buildFnData(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const fns     = nodes.filter(n => n.domain === "behaviour");

  return fns.map(fn => {
    const inputs = [], outputs = [];
    for (const e of edges) {
      const otherId = e.from === fn.id ? e.to : e.to === fn.id ? e.from : null;
      if (!otherId) continue;
      const other = nodeMap[otherId];
      if (!other) continue;
      if (other.domain === "requirement") inputs.push({ node: other, edge: e });
      if (other.domain === "structure")   outputs.push({ node: other, edge: e });
    }
    return { fn, inputs, outputs };
  });
}

// ── Compute layout ────────────────────────────────────────────────────────────

function computeLayout(fnData) {
  let y = 20;
  return fnData.map(({ fn, inputs, outputs }) => {
    const rows    = Math.max(inputs.length, outputs.length, 1);
    const sectionH = rows * (REQ_H + ITEM_GAP) - ITEM_GAP + SECTION_PAD * 2;
    const fnY     = y + (sectionH - FN_H) / 2;

    const inputItems = inputs.map((inp, i) => ({
      ...inp,
      x: REQ_COL_X,
      y: y + SECTION_PAD + i * (REQ_H + ITEM_GAP),
    }));
    const outputItems = outputs.map((out, i) => ({
      ...out,
      x: STRUCT_COL_X,
      y: y + SECTION_PAD + i * (REQ_H + ITEM_GAP),
    }));

    const section = { fn, fnX: FN_COL_X, fnY, sectionY: y, sectionH, inputItems, outputItems };
    y += sectionH + SECTION_GAP;
    return section;
  });
}

// ── Bezier connector ──────────────────────────────────────────────────────────

function Connector({ x1, y1, x2, y2, color, active }) {
  const mid = (x1 + x2) / 2;
  const d   = `M ${x1} ${y1} C ${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`;
  return (
    <path d={d} fill="none"
      stroke={active ? color : color + "55"}
      strokeWidth={active ? 1.8 : 1.2}
      strokeDasharray={active ? undefined : "4,3"}/>
  );
}

// ── Side chip (req or struct) ─────────────────────────────────────────────────

function SideChip({ item, x, y, w, h, cfg, active, side }) {
  const { node } = item;
  const words = node.label.match(/[A-Z][a-z]+|[A-Z]+(?=[A-Z]|$)/g) ?? [node.label];
  const line1 = words.slice(0, 2).join("");
  const line2 = words.length > 2 ? words.slice(2).join("") : null;

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={active ? cfg.bg : "#fff"}
        stroke={active ? cfg.border : cfg.border + "66"}
        strokeWidth={active ? 1.5 : 1}/>

      {/* Keyword tag */}
      <text x={x + (side === "left" ? w - 4 : 4)}
        y={y + 12} textAnchor={side === "left" ? "end" : "start"}
        fontSize={7.5} fontFamily="Arial,sans-serif"
        fill={active ? cfg.text : cfg.text + "88"} fontStyle="italic">
        {node.kw}
      </text>

      {/* Label */}
      <text x={x + w / 2} y={y + (line2 ? 24 : 26)} textAnchor="middle"
        fontSize={10} fontFamily="Arial,sans-serif" fontWeight="700"
        fill={active ? cfg.text : "#999"}>
        {line1}
      </text>
      {line2 && (
        <text x={x + w / 2} y={y + 36} textAnchor="middle"
          fontSize={9.5} fontFamily="Arial,sans-serif" fontWeight="700"
          fill={active ? cfg.text : "#999"}>
          {line2}
        </text>
      )}
    </g>
  );
}

// ── Function box ──────────────────────────────────────────────────────────────

function FnBox({ fn, x, y, active, onClick }) {
  const [hot, setHot] = useState(false);
  const isHot = active || hot;
  const words = fn.label.match(/[A-Z][a-z]+|[A-Z]+(?=[A-Z]|$)/g) ?? [fn.label];
  const line1 = words.slice(0, 2).join("");
  const line2 = words.length > 2 ? words.slice(2).join("") : null;

  return (
    <g style={{ cursor:"pointer" }}
       onClick={onClick}
       onMouseEnter={() => setHot(true)}
       onMouseLeave={() => setHot(false)}>

      {/* Drop shadow */}
      {isHot && (
        <rect x={x+2} y={y+3} width={FN_W} height={FN_H} rx={7}
          fill={FN_C.header + "22"}/>
      )}

      {/* Main box */}
      <rect x={x} y={y} width={FN_W} height={FN_H} rx={7}
        fill={isHot ? FN_C.header : "#fff"}
        stroke={FN_C.border}
        strokeWidth={isHot ? 2.2 : 1.5}/>

      {/* Icon strip */}
      <rect x={x} y={y} width={28} height={FN_H} rx={7} fill={FN_C.header + (isHot ? "ff" : "cc")}/>
      <rect x={x+21} y={y} width={7} height={FN_H} fill={FN_C.header + (isHot ? "ff" : "cc")}/>

      {/* ƒ glyph */}
      <text x={x+14} y={y + FN_H/2 + 5} textAnchor="middle"
        fontSize={16} fontFamily="Arial,sans-serif" fontWeight="900"
        fill="rgba(255,255,255,0.85)">
        ƒ
      </text>

      {/* Keyword */}
      <text x={x + FN_W/2 + 8} y={y + 18} textAnchor="middle"
        fontSize={8.5} fontFamily="Arial,sans-serif"
        fill={isHot ? "rgba(255,255,255,0.7)" : FN_C.text} fontStyle="italic">
        {fn.kw}
      </text>

      {/* Label */}
      <text x={x + FN_W/2 + 8} y={y + (line2 ? 33 : 40)} textAnchor="middle"
        fontSize={12} fontFamily="Arial,sans-serif" fontWeight="800"
        fill={isHot ? "#fff" : "#111"}>
        {line1}
      </text>
      {line2 && (
        <text x={x + FN_W/2 + 8} y={y + 48} textAnchor="middle"
          fontSize={11.5} fontFamily="Arial,sans-serif" fontWeight="800"
          fill={isHot ? "#fff" : "#111"}>
          {line2}
        </text>
      )}
    </g>
  );
}

// ── Section background ────────────────────────────────────────────────────────

function SectionBg({ y, h, active }) {
  return (
    <rect x={0} y={y} width={TOTAL_W} height={h} rx={6}
      fill={active ? "#f0faf4" : "#f9f9f9"}
      stroke={active ? "#27ae6033" : "#eee"}
      strokeWidth={1}/>
  );
}

// ── Column headers ────────────────────────────────────────────────────────────

function ColumnHeaders() {
  const hStyle = { fontSize:9, fontFamily:"Arial,sans-serif", fontWeight:700,
    textTransform:"uppercase", letterSpacing:1 };
  return (
    <g>
      <text x={REQ_COL_X + REQ_W/2} y={12} textAnchor="middle"
        {...hStyle} fill={REQ_C.header}>Requirements</text>
      <text x={FN_COL_X + FN_W/2} y={12} textAnchor="middle"
        {...hStyle} fill={FN_C.header}>Functions</text>
      <text x={STRUCT_COL_X + STRUCT_W/2} y={12} textAnchor="middle"
        {...hStyle} fill={STRUCT_C.header}>Structure</text>
    </g>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ section, onClose }) {
  const { fn, inputItems, outputItems } = section;
  return (
    <div style={{ margin:"8px 12px 12px", padding:"12px 18px",
      background:"#fff", border:`2px solid ${FN_C.border}`,
      borderRadius:7, boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
      fontFamily:"Arial,sans-serif", display:"flex", gap:20, flexWrap:"wrap" }}>

      <div style={{ minWidth:160 }}>
        <div style={{ fontSize:8.5, color:"#999", textTransform:"uppercase",
          letterSpacing:1, marginBottom:3 }}>Function</div>
        <div style={{ fontSize:15, fontWeight:900, color:"#111" }}>{fn.label}</div>
        <code style={{ fontSize:10, color:FN_C.header, display:"block", marginTop:2 }}>
          {fn.kw}
        </code>
      </div>

      <div style={{ flex:1, minWidth:160 }}>
        <div style={{ fontSize:8.5, color:"#999", textTransform:"uppercase",
          letterSpacing:1, marginBottom:6 }}>Driven by requirements</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          {inputItems.length === 0
            ? <span style={{ fontSize:10, color:"#ccc" }}>none</span>
            : inputItems.map((inp, i) => (
              <span key={i} style={{ fontSize:10, background:REQ_C.bg,
                color:REQ_C.text, border:`1px solid ${REQ_C.border}44`,
                borderRadius:3, padding:"2px 8px" }}>
                {inp.node.label}
              </span>
            ))
          }
        </div>
      </div>

      <div style={{ flex:1, minWidth:160 }}>
        <div style={{ fontSize:8.5, color:"#999", textTransform:"uppercase",
          letterSpacing:1, marginBottom:6 }}>Allocated to structure</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          {outputItems.length === 0
            ? <span style={{ fontSize:10, color:"#ccc" }}>none</span>
            : outputItems.map((out, i) => (
              <span key={i} style={{ fontSize:10, background:STRUCT_C.bg,
                color:STRUCT_C.text, border:`1px solid ${STRUCT_C.border}44`,
                borderRadius:3, padding:"2px 8px" }}>
                {out.node.label}
              </span>
            ))
          }
        </div>
      </div>

      <button onClick={onClose} style={{ background:"none", border:"none",
        cursor:"pointer", fontSize:18, color:"#ccc", alignSelf:"flex-start" }}>×</button>
    </div>
  );
}

// ── FunctionView ──────────────────────────────────────────────────────────────

export default function FunctionView({ nodes, edges }) {
  const [selectedId, setSelectedId] = useState(null);

  const fnData  = useMemo(() => buildFnData(nodes, edges),   [nodes, edges]);
  const sections = useMemo(() => computeLayout(fnData),       [fnData]);

  const totalH = sections.length
    ? sections[sections.length - 1].sectionY +
      sections[sections.length - 1].sectionH + 20
    : 100;

  const selectedSection = sections.find(s => s.fn.id === selectedId) ?? null;

  if (!sections.length) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"#bbb", fontFamily:"Arial,sans-serif", fontSize:13 }}>
        No behaviour (action def / use case def) nodes found in the model.
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* SVG diagram */}
      <div style={{ flex:1, overflow:"auto", padding:"0 12px" }}>
        <svg width={TOTAL_W} height={totalH + 20} style={{ display:"block" }}>

          <ColumnHeaders/>

          {sections.map(sec => {
            const active = sec.fn.id === selectedId;
            const fnMidY = sec.fnY + FN_H / 2;

            return (
              <g key={sec.fn.id}>
                <SectionBg y={sec.sectionY} h={sec.sectionH} active={active}/>

                {/* Input connectors (req → function) */}
                {sec.inputItems.map((inp, i) => {
                  const chipMidY = inp.y + REQ_H / 2;
                  return (
                    <Connector key={i}
                      x1={REQ_COL_X + REQ_W} y1={chipMidY}
                      x2={FN_COL_X}           y2={fnMidY}
                      color={REQ_C.header} active={active}/>
                  );
                })}

                {/* Output connectors (function → struct) */}
                {sec.outputItems.map((out, i) => {
                  const chipMidY = out.y + STRUCT_H / 2;
                  return (
                    <Connector key={i}
                      x1={FN_COL_X + FN_W}   y1={fnMidY}
                      x2={STRUCT_COL_X}       y2={chipMidY}
                      color={STRUCT_C.header} active={active}/>
                  );
                })}

                {/* Input chips */}
                {sec.inputItems.map((inp, i) => (
                  <SideChip key={i} item={inp}
                    x={REQ_COL_X} y={inp.y} w={REQ_W} h={REQ_H}
                    cfg={REQ_C} active={active} side="left"/>
                ))}

                {/* Output chips */}
                {sec.outputItems.map((out, i) => (
                  <SideChip key={i} item={out}
                    x={STRUCT_COL_X} y={out.y} w={STRUCT_W} h={STRUCT_H}
                    cfg={STRUCT_C} active={active} side="right"/>
                ))}

                {/* Function box */}
                <FnBox fn={sec.fn} x={sec.fnX} y={sec.fnY}
                  active={active}
                  onClick={() => setSelectedId(id => id === sec.fn.id ? null : sec.fn.id)}/>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedSection && (
        <DetailPanel section={selectedSection} onClose={() => setSelectedId(null)}/>
      )}
    </div>
  );
}
