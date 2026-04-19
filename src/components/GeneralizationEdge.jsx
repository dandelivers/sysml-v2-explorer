import { getBezierPath } from '@xyflow/react'

const MARKER_ID = 'uml-generalization'

export default function GeneralizationEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
}) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <defs>
        <marker
          id={MARKER_ID}
          markerWidth="10"
          markerHeight="8"
          refX="9"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 9 4 L 0 8 Z" fill="var(--bg, #fff)" stroke="#6b7280" strokeWidth="1.2" />
        </marker>
      </defs>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
        markerEnd={`url(#${MARKER_ID})`}
      />
    </>
  )
}
