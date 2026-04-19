/**
 * transform.js
 *
 * Converts a parsed SysML V2 AST into a flat { nodes, edges } structure
 * ready for layout and rendering.
 *
 * Node kinds map to diagram domains:
 *   partDef / itemDef          → Structure
 *   actionDef / useCaseDef     → Behaviour
 *   requirementDef             → Requirements
 *   interfaceDef / connectionDef → Interface / Connection
 *   metadataDef                → Config
 *
 * Edge kinds:
 *   composition   → solid arrow  (part usage inside a def)
 *   specialization → dashed arrow (`:>`)
 *   connection    → solid arrow  (connection def ends)
 *   allocation    → dashed arrow (allocate usage)
 */

const KIND_META = {
  partDef:        { kw: 'part def',         domain: 'structure' },
  actionDef:      { kw: 'action def',       domain: 'behaviour' },
  useCaseDef:     { kw: 'use case def',     domain: 'behaviour' },
  requirementDef: { kw: 'requirement def',  domain: 'requirement' },
  interfaceDef:   { kw: 'interface def',    domain: 'interface' },
  connectionDef:  { kw: 'connection def',   domain: 'interface' },
  flowDef:        { kw: 'flow def',         domain: 'interface' },
  stateDef:       { kw: 'state def',        domain: 'behaviour' },
  metadataDef:    { kw: 'metadata def',     domain: 'config' },
  itemDef:        { kw: 'item def',         domain: 'structure' },
  attributeDef:   { kw: 'attribute def',    domain: 'structure' },
};

export function transform(ast) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  // ── Unique ID generation ────────────────────────────────────────────────────

  function makeId(name, parentId) {
    return parentId ? `${parentId}::${name}` : name;
  }

  function ensureNode(id, label, kind, domain, kw) {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, label, kind, domain, kw });
    }
  }

  // ── Walk the AST ────────────────────────────────────────────────────────────

  function walkElements(elements, parentId = null) {
    for (const el of elements) {
      if (!el) continue;
      walkElement(el, parentId);
    }
  }

  function walkElement(el, parentId) {
    const { nodeType } = el;

    // Unwrap package — packages are namespaces, not diagram nodes
    if (nodeType === 'Package') {
      walkElements(el.members, parentId);
      return;
    }

    if (nodeType === 'Root') {
      walkElements(el.elements, parentId);
      return;
    }

    // ── Definitions ──────────────────────────────────────────────────────────

    const defMatch = nodeType.match(/^(\w+)Def$/);
    if (defMatch) {
      const kind = defMatch[0]; // e.g. "partDef"
      const meta = KIND_META[kind] ?? { kw: kind, domain: 'unknown' };
      const id = makeId(el.name, parentId);

      ensureNode(id, el.name, kind, meta.domain, meta.kw);

      // Specialization edge  Vehicle :> MachineSystem
      if (el.specializes) {
        edges.push({
          id:   `${id}__specializes__${el.specializes}`,
          from: id,
          to:   el.specializes,
          label: 'specializes',
          kind: 'specialization',
        });
      }

      // Connection def: collect `end` members → association edges
      if (kind === 'connectionDef') {
        const ends = (el.members ?? []).filter(m => m?.nodeType === 'EndUsage' && m.typeName);
        if (ends.length >= 2) {
          for (let i = 0; i < ends.length - 1; i++) {
            for (let j = i + 1; j < ends.length; j++) {
              edges.push({
                id:   `${id}__connects__${ends[i].typeName}__${ends[j].typeName}`,
                from: ends[i].typeName,
                to:   ends[j].typeName,
                label: el.name,
                kind: 'connection',
              });
            }
          }
        }
      }

      // Walk members (nested defs + usages)
      walkMembers(el.members ?? [], id);
      return;
    }

    // ── Usages (part, action, requirement, etc.) ─────────────────────────────

    const usageMatch = nodeType.match(/^(\w+)Usage$/);
    if (usageMatch) {
      if (el.typeName && parentId) {
        // Composition edge: parentId --[name]--> typeName
        edges.push({
          id:    `${parentId}__${el.name ?? ''}__${el.typeName}`,
          from:  parentId,
          to:    el.typeName,
          label: el.name ?? '',
          kind:  'composition',
          multiplicity: el.multiplicity ?? null,
        });
      }
      // Walk nested members (inline anonymous body)
      if (el.members?.length) walkMembers(el.members, parentId);
      return;
    }
  }

  function walkMembers(members, parentId) {
    for (const m of members) {
      if (!m) continue;
      walkElement(m, parentId);
    }
  }

  // ── Entry point ─────────────────────────────────────────────────────────────

  walkElement(ast, null);

  // ── Post-process: add placeholder nodes for referenced but undeclared types ─

  const declaredIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    for (const endKey of ['from', 'to']) {
      const id = edge[endKey];
      if (id && !declaredIds.has(id)) {
        nodes.push({ id, label: id, kind: 'unknown', domain: 'unknown', kw: '?' });
        declaredIds.add(id);
      }
    }
  }

  return { nodes, edges };
}
