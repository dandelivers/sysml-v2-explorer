import DrilldownDiagram from "./shared/DrilldownDiagram.jsx";

export default function StructureView({ nodes, edges }) {
  return <DrilldownDiagram nodes={nodes} edges={edges} domain="structure"/>;
}
