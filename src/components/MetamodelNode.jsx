import { Handle, Position } from '@xyflow/react'
import { LAYER_COLORS } from '../data/sysmlMetamodel'

export default function MetamodelNode({ data }) {
  const accentColor = LAYER_COLORS[data.layer] ?? '#888'

  return (
    <div
      className="metamodel-node"
      style={{ borderColor: accentColor }}
      title={`${data.abstract ? '(abstract) ' : ''}${data.label}`}
    >
      <Handle type="target" position={Position.Bottom} />
      <div className="metamodel-node-accent" style={{ background: accentColor }} />
      <span className={data.abstract ? 'metamodel-node-label abstract' : 'metamodel-node-label'}>
        {data.label}
      </span>
      <Handle type="source" position={Position.Top} />
    </div>
  )
}
