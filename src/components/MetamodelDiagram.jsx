import { useState, useMemo } from 'react'
import { ReactFlow, Background, Controls, MiniMap, Position, ReactFlowProvider } from '@xyflow/react'
import Dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'
import { metamodelNodes, metamodelEdges, LAYER_COLORS, LAYER_LABELS } from '../data/sysmlMetamodel'
import MetamodelNode from './MetamodelNode'
import GeneralizationEdge from './GeneralizationEdge'
import './MetamodelDiagram.css'

const NODE_WIDTH = 195
const NODE_HEIGHT = 40

const nodeTypes = { metamodelNode: MetamodelNode }
const edgeTypes = { generalization: GeneralizationEdge }

// Map from parsed model node kind → metamodel node ID
const KIND_TO_METAMODEL = {
  partDef:        'PartDefinition',
  actionDef:      'ActionDefinition',
  useCaseDef:     'UseCaseDefinition',
  requirementDef: 'RequirementDefinition',
  interfaceDef:   'InterfaceDefinition',
  connectionDef:  'ConnectionDefinition',
  flowDef:        'FlowConnectionDefinition',
  stateDef:       'StateDefinition',
  metadataDef:    'MetadataDefinition',
  itemDef:        'ItemDefinition',
  attributeDef:   'AttributeDefinition',
}

// Walk up generalization edges to collect all ancestor IDs
function withAncestors(startIds, edges) {
  const parentMap = {}
  for (const e of edges) {
    if (!parentMap[e.source]) parentMap[e.source] = []
    parentMap[e.source].push(e.target)
  }
  const visited = new Set(startIds)
  const queue = [...startIds]
  while (queue.length) {
    const id = queue.shift()
    for (const parent of (parentMap[id] ?? [])) {
      if (!visited.has(parent)) {
        visited.add(parent)
        queue.push(parent)
      }
    }
  }
  return visited
}

// Pre-computed once at module load — avoids dagre re-run on initial render
let _fullLayout = null
function getFullLayout() {
  if (!_fullLayout) _fullLayout = computeLayout(metamodelNodes, metamodelEdges)
  return _fullLayout
}

function computeLayout(nodes, edges) {
  const g = new Dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'BT', ranksep: 60, nodesep: 12 })
  nodes.forEach(nd => g.setNode(nd.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(ed => g.setEdge(ed.source, ed.target))
  Dagre.layout(g)
  return nodes.map(nd => {
    const { x, y } = g.node(nd.id)
    return {
      ...nd,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      sourcePosition: Position.Top,
      targetPosition: Position.Bottom,
    }
  })
}

function MetamodelDiagramInner({ modelNodes, text }) {
  const [showAll, setShowAll] = useState(false)

  // Determine which metamodel IDs are directly used in the model
  const usedIds = useMemo(() => {
    const direct = new Set()
    for (const n of (modelNodes ?? [])) {
      const metamodelId = KIND_TO_METAMODEL[n.kind]
      if (metamodelId) direct.add(metamodelId)
    }
    // Include Package if the model text uses the package keyword
    if (text && /\bpackage\b/.test(text)) direct.add('Package')
    return direct
  }, [modelNodes, text])

  const visibleIds = useMemo(
    () => showAll ? null : withAncestors([...usedIds], metamodelEdges),
    [usedIds, showAll],
  )

  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (!visibleIds) return { visibleNodes: metamodelNodes, visibleEdges: metamodelEdges }
    const vNodes = metamodelNodes.filter(nd => visibleIds.has(nd.id))
    const vIds = new Set(vNodes.map(nd => nd.id))
    return {
      visibleNodes: vNodes,
      visibleEdges: metamodelEdges.filter(ed => vIds.has(ed.source) && vIds.has(ed.target)),
    }
  }, [visibleIds])

  const layoutedNodes = useMemo(() => {
    if (!visibleIds) return getFullLayout()
    return computeLayout(visibleNodes, visibleEdges)
  }, [visibleIds, visibleNodes, visibleEdges])

  const isEmpty = usedIds.size === 0 && !showAll

  return (
    <div className="metamodel-diagram">
      <aside className="metamodel-legend">
        <div className="legend-title">SysML v2 Metamodel</div>
        <div className="legend-subtitle">
          {isEmpty
            ? 'No model types yet'
            : `${visibleNodes.length} types · ${visibleEdges.length} generalizations`}
        </div>

        <div className="legend-section-label" style={{ marginTop: 16 }}>Display</div>
        <label className="legend-layer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
          />
          <span className="legend-layer-name">Show full metamodel</span>
        </label>

        {!showAll && usedIds.size > 0 && (
          <>
            <div className="legend-section-label" style={{ marginTop: 16 }}>Used in model</div>
            {[...usedIds].map(id => (
              <div key={id} className="legend-used-type">{id}</div>
            ))}
          </>
        )}

        <div className="legend-section-label" style={{ marginTop: 16 }}>Key</div>
        <div className="legend-key-row">
          <span className="key-box key-concrete" />
          Concrete type
        </div>
        <div className="legend-key-row">
          <span className="key-box key-abstract" />
          <em>Abstract type</em>
        </div>
        <div className="legend-key-row">
          <span className="key-arrow">—▷</span>
          Generalization
        </div>

        <div className="legend-section-label" style={{ marginTop: 16 }}>Layers</div>
        {Object.entries(LAYER_LABELS).map(([, label]) => (
          <div key={label} className="legend-layer-name" style={{ fontSize: 11, padding: '2px 0' }}>
            {label}
          </div>
        ))}
      </aside>

      {isEmpty ? (
        <div className="metamodel-empty">
          <div className="metamodel-empty-icon">◻</div>
          <div className="metamodel-empty-title">Add types to see the metamodel</div>
          <div className="metamodel-empty-body">
            As you write <code>part def</code>, <code>requirement def</code>, <code>action def</code>,
            and other SysML definitions in the Model tab, the relevant metamodel types and
            their generalization hierarchy will appear here.
          </div>
          <button className="metamodel-show-all-btn" onClick={() => setShowAll(true)}>
            Show full metamodel
          </button>
        </div>
      ) : (
        <ReactFlow
          nodes={layoutedNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.05}
          maxZoom={2}
        >
          <Background color="#e5e7eb" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={nd => LAYER_COLORS[nd.data?.layer] ?? '#ccc'}
            nodeStrokeWidth={0}
            maskColor="rgba(0,0,0,0.06)"
            style={{ bottom: 60 }}
          />
        </ReactFlow>
      )}
    </div>
  )
}

export default function MetamodelDiagram({ modelNodes, text }) {
  return (
    <ReactFlowProvider>
      <MetamodelDiagramInner modelNodes={modelNodes} text={text} />
    </ReactFlowProvider>
  )
}
