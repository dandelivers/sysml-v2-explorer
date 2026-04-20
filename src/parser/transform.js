/**
 * transform.js
 * Converts a parsed SysML V2 AST into a flat { nodes, edges } structure.
 *
 * Node kinds → diagram domains:
 *   partDef / itemDef / occurrenceDef / individualDef  → structure
 *   actionDef / useCaseDef / calcDef                   → behaviour
 *   requirementDef / constraintDef                     → requirement
 *   interfaceDef / connectionDef / flowDef             → interface
 *   metadataDef                                        → config
 *
 * Edge kinds:
 *   composition    – part usage inside a def
 *   specialization – :>  (generalisation)
 *   redefines      – :>> (redefinition)
 *   subsets        – subsets keyword
 *   connection     – connection def ends
 *   satisfaction   – satisfy keyword
 *   verification   – verify keyword
 *   allocation     – allocate keyword
 */

const KIND_META = {
  partDef:         { kw: 'part def',         domain: 'structure'    },
  actionDef:       { kw: 'action def',       domain: 'behaviour'    },
  useCaseDef:      { kw: 'use case def',     domain: 'behaviour'    },
  calcDef:         { kw: 'calc def',         domain: 'behaviour'    },
  requirementDef:  { kw: 'requirement def',  domain: 'requirement'  },
  constraintDef:   { kw: 'constraint def',   domain: 'requirement'  },
  interfaceDef:    { kw: 'interface def',    domain: 'interface'    },
  connectionDef:   { kw: 'connection def',   domain: 'interface'    },
  flowDef:         { kw: 'flow def',         domain: 'interface'    },
  stateDef:        { kw: 'state def',        domain: 'behaviour'    },
  metadataDef:     { kw: 'metadata def',     domain: 'config'       },
  itemDef:         { kw: 'item def',         domain: 'structure'    },
  attributeDef:    { kw: 'attribute def',    domain: 'structure'    },
  occurrenceDef:   { kw: 'occurrence def',   domain: 'structure'    },
  individualDef:   { kw: 'individual def',   domain: 'structure'    },
};

export function transform(ast) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  function makeId(name, parentId) {
    return parentId ? `${parentId}::${name}` : name;
  }

  function ensureNode(id, label, kind, domain, kw, abstract = false) {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, label, kind, domain, kw, abstract });
    }
  }

  function walkElements(elements, parentId = null) {
    for (const el of elements) {
      if (!el) continue;
      walkElement(el, parentId);
    }
  }

  function walkElement(el, parentId) {
    const { nodeType } = el;

    if (nodeType === 'Root')    { walkElements(el.elements, parentId); return; }
    if (nodeType === 'Package') { walkElements(el.members,  parentId); return; }

    // ── Definitions ──────────────────────────────────────────────────────────

    const defMatch = nodeType.match(/^(\w+)Def$/);
    if (defMatch) {
      const kind = defMatch[0];
      const meta = KIND_META[kind] ?? { kw: kind, domain: 'unknown' };
      const id   = makeId(el.name, parentId);

      ensureNode(id, el.name, kind, meta.domain, meta.kw, el.abstract ?? false);

      // Specialization edges (:>)  — now an array
      for (const sup of (el.specializes ?? [])) {
        edges.push({
          id:    `${id}__specializes__${sup}`,
          from:  id,
          to:    sup,
          label: 'specializes',
          kind:  'specialization',
        });
      }

      // Redefines edge (:>>)
      if (el.redefines) {
        edges.push({
          id:    `${id}__redefines__${el.redefines}`,
          from:  id,
          to:    el.redefines,
          label: 'redefines',
          kind:  'redefines',
        });
      }

      // Subsets edge
      if (el.subsets) {
        edges.push({
          id:    `${id}__subsets__${el.subsets}`,
          from:  id,
          to:    el.subsets,
          label: 'subsets',
          kind:  'subsets',
        });
      }

      // Connection def: end pairs → association edges
      if (kind === 'connectionDef') {
        const ends = (el.members ?? []).filter(m => m?.nodeType === 'EndUsage' && m.typeName);
        if (ends.length >= 2) {
          for (let i = 0; i < ends.length - 1; i++) {
            for (let j = i + 1; j < ends.length; j++) {
              edges.push({
                id:    `${id}__connects__${ends[i].typeName}__${ends[j].typeName}`,
                from:  ends[i].typeName,
                to:    ends[j].typeName,
                label: el.name,
                kind:  'connection',
              });
            }
          }
        }
      }

      walkMembers(el.members ?? [], id);
      return;
    }

    // ── Usages ───────────────────────────────────────────────────────────────

    const usageMatch = nodeType.match(/^(\w+)Usage$/);
    if (usageMatch) {
      // Satisfy: parentId satisfies el.target
      if (nodeType === 'SatisfyUsage') {
        const target = el.target;
        if (target && parentId) {
          edges.push({
            id:    `${parentId}__satisfies__${target}`,
            from:  parentId,
            to:    target,
            label: 'satisfies',
            kind:  'satisfaction',
          });
        }
        return;
      }

      // Verify: parentId verifies el.target
      if (nodeType === 'VerifyUsage') {
        const target = el.target;
        if (target && parentId) {
          edges.push({
            id:    `${parentId}__verifies__${target}`,
            from:  parentId,
            to:    target,
            label: 'verifies',
            kind:  'verification',
          });
        }
        return;
      }

      // Allocate: el.from allocated to el.to
      if (nodeType === 'AllocateUsage') {
        const from = el.from ? (parentId ? `${parentId}::${el.from}` : el.from) : parentId;
        const to   = el.to;
        if (from && to) {
          edges.push({
            id:    `${from}__allocates__${to}`,
            from:  from,
            to:    to,
            label: 'allocate',
            kind:  'allocation',
          });
        }
        return;
      }

      // Composition usage: parentId --[name]--> typeName
      if (el.typeName && parentId) {
        edges.push({
          id:           `${parentId}__${el.name ?? ''}__${el.typeName}`,
          from:         parentId,
          to:           el.typeName,
          label:        el.name ?? '',
          kind:         'composition',
          multiplicity: el.multiplicity ?? null,
        });
      }

      // Redefines / subsets on usage
      if (el.redefines && parentId) {
        edges.push({
          id:    `${parentId}__redefines__${el.redefines}`,
          from:  parentId,
          to:    el.redefines,
          label: 'redefines',
          kind:  'redefines',
        });
      }
      if (el.subsets && parentId) {
        edges.push({
          id:    `${parentId}__subsets__${el.subsets}`,
          from:  parentId,
          to:    el.subsets,
          label: 'subsets',
          kind:  'subsets',
        });
      }

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

  walkElement(ast, null);

  // Add placeholder nodes for referenced-but-undeclared types
  const declaredIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    for (const endKey of ['from', 'to']) {
      const id = edge[endKey];
      if (id && !declaredIds.has(id)) {
        nodes.push({ id, label: id, kind: 'unknown', domain: 'unknown', kw: '?', abstract: false });
        declaredIds.add(id);
      }
    }
  }

  return { nodes, edges };
}
