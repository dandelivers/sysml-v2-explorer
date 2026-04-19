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

const REQ_C    = { bg:"rgba(59,130,246,0.08)",  border:"rgba(59,130,246,0.25)",  text:"#93c5fd", header:"#3b82f6" };
const FN_C     = { bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.25)",  text:"#6ee7b7", header:"#10b981" };
const STRUCT_C = { bg:"rgba(6,182,212,0.08)",   border:"rgba(6,182,212,0.25)",   text:"#67e8f9", header:"#06b6d4" };

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
        fill={active ? cfg.bg : "#0f0f0f99"}
        stroke={active ? cfg.border : cfg.border + "55"}
        strokeWidth={active ? 1.5 : 1}/>

      {/* Keyword tag */}
      <text x={x + (side === "left" ? w - 4 : 4)}
        y={y + 12} textAnchor={side === "left" ? "end" : "start"}
        fontSize={7.5} fontFamily="'JetBrains Mono',monospace"
        fill={active ? cfg.text : cfg.text + "55"} fontStyle="italic">
        {node.kw}
      </text>

      {/* Label */}
      <text x={x + w / 2} y={y + (line2 ? 24 : 26)} textAnchor="middle"
        fontSize={10} fontFamily="'Inter',system-ui,sans-serif" fontWeight="600"
        fill={active ? "#ececec" : "#777"}>
        {line1}
      </text>
      {line2 && (
        <text x={x + w / 2} y={y + 36} textAnchor="middle"
          fontSize={9.5} fontFamily="'Inter',system-ui,sans-serif" fontWeight="600"
          fill={active ? "#ececec" : "#777"}>
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

      {/* Glow */}
      {isHot && (
        <rect x={x-1} y={y-1} width={FN_W+2} height={FN_H+2} rx={8}
          fill="none" stroke={FN_C.header + "44"} strokeWidth={6}/>
      )}

      {/* Main box */}
      <rect x={x} y={y} width={FN_W} height={FN_H} rx={7}
        fill={isHot ? FN_C.header + "22" : "#0f0f0f"}
        stroke={isHot ? FN_C.header : FN_C.border}
        strokeWidth={isHot ? 1.5 : 1}/>

      {/* Icon strip */}
      <rect x={x} y={y} width={28} height={FN_H} rx={7} fill={FN_C.header + (isHot ? "cc" : "88")}/>
      <rect x={x+21} y={y} width={7} height={FN_H} fill={FN_C.header + (isHot ? "cc" : "88")}/>

      {/* ƒ glyph */}
      <text x={x+14} y={y + FN_H/2 + 5} textAnchor="middle"
        fontSize={16} fontFamily="'Inter',system-ui,sans-serif" fontWeight="700"
        fill="rgba(255,255,255,0.9)">
        ƒ
      </text>

      {/* Keyword */}
      <text x={x + FN_W/2 + 8} y={y + 18} textAnchor="middle"
        fontSize={8} fontFamily="'JetBrains Mono',monospace"
        fill={isHot ? FN_C.text : FN_C.text + "88"} fontStyle="italic">
        {fn.kw}
      </text>

      {/* Label */}
      <text x={x + FN_W/2 + 8} y={y + (line2 ? 33 : 40)} textAnchor="middle"
        fontSize={12} fontFamily="'Inter',system-ui,sans-serif" fontWeight="700"
        fill={isHot ? "#ececec" : "#b4b4b4"}>
        {line1}
      </text>
      {line2 && (
        <text x={x + FN_W/2 + 8} y={y + 48} textAnchor="middle"
          fontSize={11.5} fontFamily="'Inter',system-ui,sans-serif" fontWeight="700"
          fill={isHot ? "#ececec" : "#b4b4b4"}>
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
      fill={active ? "rgba(16,185,129,0.05)" : "#0f0f0f"}
      stroke={active ? "rgba(16,185,129,0.2)" : "#1a1a1a"}
      strokeWidth={1}/>
  );
}

// ── Column headers ────────────────────────────────────────────────────────────

function ColumnHeaders() {
  const hStyle = { fontSize:8.5, fontFamily:"'JetBrains Mono',monospace", fontWeight:600,
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
  const lbl = { fontSize:9, color:"#444", textTransform:"uppercase",
    letterSpacing:"0.08em", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" };
  const pill = (color, bg, border) => ({
    fontSize:11, background:bg, color, border:`1px solid ${border}`,
    borderRadius:5, padding:"2px 9px", fontFamily:"'Inter',system-ui,sans-serif",
  });

  return (
    <div style={{ borderTop:`1px solid ${FN_C.border}`, padding:"12px 20px",
      background:"#0f0f0f", display:"flex", gap:20, flexWrap:"wrap", flexShrink:0 }}>

      <div style={{ minWidth:160 }}>
        <div style={lbl}>Function</div>
        <div style={{ fontSize:15, fontWeight:700, color:"#ececec", letterSpacing:"-0.02em",
          fontFamily:"'Inter',system-ui,sans-serif" }}>{fn.label}</div>
        <div style={{ fontSize:10, color:FN_C.header, marginTop:2,
          fontFamily:"'JetBrains Mono',monospace" }}>{fn.kw}</div>
      </div>

      <div style={{ flex:1, minWidth:160 }}>
        <div style={lbl}>Driven by requirements</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          {inputItems.length === 0
            ? <span style={{ fontSize:11, color:"#333", fontFamily:"'JetBrains Mono',monospace" }}>none</span>
            : inputItems.map((inp, i) => (
              <span key={i} style={pill(REQ_C.text, REQ_C.bg, REQ_C.border)}>
                {inp.node.label}
              </span>
            ))
          }
        </div>
      </div>

      <div style={{ flex:1, minWidth:160 }}>
        <div style={lbl}>Allocated to structure</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          {outputItems.length === 0
            ? <span style={{ fontSize:11, color:"#333", fontFamily:"'JetBrains Mono',monospace" }}>none</span>
            : outputItems.map((out, i) => (
              <span key={i} style={pill(STRUCT_C.text, STRUCT_C.bg, STRUCT_C.border)}>
                {out.node.label}
              </span>
            ))
          }
        </div>
      </div>

      <button onClick={onClose} style={{ background:"none", border:"none",
        cursor:"pointer", fontSize:18, color:"#333", alignSelf:"flex-start", lineHeight:1 }}>×</button>
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
        color:"#333", fontFamily:"Inter,system-ui,sans-serif", fontSize:13 }}>
        No behaviour nodes found — add <code style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,background:"rgba(59,130,246,0.1)",color:"#93c5fd",padding:"1px 6px",borderRadius:4}}>action def</code> or <code style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,background:"rgba(59,130,246,0.1)",color:"#93c5fd",padding:"1px 6px",borderRadius:4}}>use case def</code> to the model.
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* SVG diagram */}
      <div style={{ flex:1, overflow:"auto", padding:"16px" }}>
        <svg width={TOTAL_W} height={totalH + 20} style={{ display:"block" }}>
          <rect width={TOTAL_W} height={totalH + 20} fill="#080808"/>

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
