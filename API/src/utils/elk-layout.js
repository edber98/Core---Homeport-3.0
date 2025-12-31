const ELK = require('elkjs');
const elk = new ELK();

// Compute ordered output handle ids for a node model, mirroring Flow Builder logic.
function computeOutputOrder(node, edges){
  try {
    const model = node?.data?.model || node?.model || node || {};
    const tmpl = model?.templateObj || {};
    // Condition: outputs come from context array items (+ optional else)
    if (String(tmpl.type) === 'condition'){
      const field = tmpl.output_array_field || 'items';
      const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      const ids = arr.map((it, i) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
      try {
        const elseId = (model?.context?.else && model.context.else._id) ? String(model.context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
        if (elseId && !ids.includes(elseId)) ids.push(elseId);
      } catch {}
      // Preserve connected handles as well (stable union)
      const connected = [];
      for (const e of (edges || [])){
        if (String(e.source) === String(node.id)){
          const h = e.sourceHandle != null ? String(e.sourceHandle) : '';
          if (h) connected.push(h);
        }
      }
      const merged = [];
      for (const k of [...ids, ...connected]){ if (k && !merged.includes(String(k))) merged.push(String(k)); }
      return merged;
    }
    // Loop: prefer declared outputHandles (excluding link/arrayField), else legacy handles
    if (String(tmpl.type) === 'loop'){
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length){
        return tmpl.outputHandles
          .filter(h => !Array.isArray(h?.accepts) && !h?.arrayField)
          .map(h => String(h.id));
      }
      return ['each','after'];
    }
    // Start-like nodes: single named output
    if (['start','start_form','event','endpoint'].includes(String(tmpl.type))){
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length){
        return tmpl.outputHandles
          .filter(h => !Array.isArray(h?.accepts) && !h?.arrayField)
          .map(h => String(h.id));
      }
      return ['out'];
    }
    // Generic templates with declared outputHandles
    if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length){
      const ids = tmpl.outputHandles
        .filter(h => !Array.isArray(h?.accepts) && !h?.arrayField)
        .map(h => String(h.id));
      const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
      return enableCatch ? ['err', ...ids] : ids;
    }
    // Legacy array-based outputs
    const outs = Array.isArray(tmpl.output) ? tmpl.output : undefined;
    const n = (outs && outs.length) ? outs.length : 1;
    const base = Array.from({ length: n }, (_, i) => String(i));
    const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
    return enableCatch ? ['err', ...base] : base;
  } catch {
    // Fallback to whatever handles are seen on edges (in order of appearance)
    const seen = [];
    for (const e of (edges || [])){
      if (String(e.source) === String(node?.id)){
        const h = e.sourceHandle != null ? String(e.sourceHandle) : '';
        if (h && !seen.includes(h)) seen.push(h);
      }
    }
    return seen.length ? seen : ['0'];
  }
}

function computeInputOrder(node){
  try {
    const model = node?.data?.model || node?.model || node || {};
    const tmpl = model?.templateObj || {};
    const arr = Array.isArray(tmpl.inputHandles) ? tmpl.inputHandles : [];
    if (arr.length) return arr.map(h => String(h.id));
  } catch {}
  return ['in'];
}

function buildElkGraph(nodes, edges, opts){
  const orientation = String(opts.orientation || 'vertical').toLowerCase();
  const direction = orientation === 'horizontal' ? 'RIGHT' : 'DOWN';
  const nodeWidth = Number(opts.nodeWidth) || 250;
  const nodeHeight = Number(opts.nodeHeight) || 110;
  const gapX = Number(opts.gapX) || 260;
  const gapY = Number(opts.gapY) || 160;
  const borderGapX = Math.max(0, gapX - nodeWidth);
  const borderGapY = Math.max(0, gapY - nodeHeight);
  const nodeIds = new Set((nodes || []).map(n => String(n.id)));
  // Precompute edges and a provisional graph to get levels and ordering hints
  const elkEdges = (edges || [])
    .filter(e => nodeIds.has(String(e.source)) && nodeIds.has(String(e.target)))
    .map((e, idx) => ({ id: String(e.id || `e${idx}`), sources: [String(e.source)], targets: [String(e.target)], _raw: e }));
  const tempGraph = { id: 'root', children: (nodes || []).map(n => ({ id: String(n.id), width: nodeWidth, height: nodeHeight })), edges: elkEdges };
  const levels = computeLevels(tempGraph);
  // For each node, build output index mapping based on frontend order
  const outIndexMapByNode = new Map();
  for (const n of (nodes || [])){
    const outIds = computeOutputOrder(n, edges);
    const map = new Map();
    outIds.forEach((id, i) => map.set(String(id), i));
    outIndexMapByNode.set(String(n.id), map);
  }
  // Compute an ordering key per node within its level: minimal outgoing port index from its predecessors
  const orderKey = new Map();
  for (const e of elkEdges){
    const s = String(e.sources[0]);
    const t = String(e.targets[0]);
    const handle = e._raw && e._raw.sourceHandle != null ? String(e._raw.sourceHandle) : '';
    const idxMap = outIndexMapByNode.get(s) || new Map();
    const idx = Number.isFinite(idxMap.get(handle)) ? idxMap.get(handle) : 0;
    const cur = orderKey.get(t);
    orderKey.set(t, cur == null ? idx : Math.min(cur, idx));
  }

  // Build children with fixed layer-aware order
  const nodeById = new Map((nodes || []).map(n => [String(n.id), n]));
  const childrenOrdered = (nodes || []).slice().sort((a, b) => {
    const la = levels.get(String(a.id)) || 0;
    const lb = levels.get(String(b.id)) || 0;
    if (la !== lb) return la - lb;
    const oa = orderKey.get(String(a.id));
    const ob = orderKey.get(String(b.id));
    if (oa == null && ob == null) return 0;
    if (oa == null) return -1;
    if (ob == null) return 1;
    if (oa !== ob) return oa - ob;
    return String(a.id).localeCompare(String(b.id));
  }).map(n => ({ id: String(n.id), width: nodeWidth, height: nodeHeight }));

  return {
    elkOptions: { direction, nodeWidth, nodeHeight, gapX, gapY, borderGapX, borderGapY },
    graph: {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction,
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.layered.mergeEdges': 'true',
        'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
        'elk.layered.considerModelOrder': 'NODES_AND_PORTS',
        'elk.layered.spacing.nodeNodeBetweenLayers': String(borderGapY),
        'elk.spacing.nodeNode': String(borderGapX),
        'elk.edgeRouting': 'ORTHOGONAL',
        'org.eclipse.elk.direction': direction,
        'org.eclipse.elk.layered.considerModelOrder': 'NODES_AND_PORTS',
        'org.eclipse.elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
      },
      children: childrenOrdered.map(c => {
        const orig = nodeById.get(String(c.id));
        const outIds = computeOutputOrder(orig, edges);
        const inIds = computeInputOrder(orig);
        // Ports with fixed order mirroring frontend
        const ports = [];
        // Inputs on NORTH (vertical) or WEST (horizontal)
        for (let i = 0; i < inIds.length; i++){
          const pid = String(inIds[i]);
          ports.push({
            id: `in:${pid}`,
            layoutOptions: {
              'elk.port.side': (direction === 'DOWN' ? 'NORTH' : 'WEST'),
              'elk.port.index': i,
              'org.eclipse.elk.port.side': (direction === 'DOWN' ? 'NORTH' : 'WEST'),
              'org.eclipse.elk.port.index': i
            }
          });
        }
        // Outputs on SOUTH (vertical) or EAST (horizontal)
        // Keep the exact frontend order for port indices
        const outOrdered = outIds.slice();
        for (let i = 0; i < outOrdered.length; i++){
          const pid = String(outOrdered[i]);
          ports.push({
            id: `out:${pid}`,
            layoutOptions: {
              'elk.port.side': (direction === 'DOWN' ? 'SOUTH' : 'EAST'),
              'elk.port.index': i,
              'org.eclipse.elk.port.side': (direction === 'DOWN' ? 'SOUTH' : 'EAST'),
              'org.eclipse.elk.port.index': i
            }
          });
        }
        return {
          id: String(c.id),
          width: nodeWidth,
          height: nodeHeight,
          layoutOptions: { 'elk.portConstraints': 'FIXED_ORDER', 'org.eclipse.elk.portConstraints': 'FIXED_ORDER' },
          ports
        };
      }),
      edges: elkEdges.map((e, idx) => {
        const ee = { id: String(e.id || `e${idx}`), sources: e.sources, targets: e.targets };
        const raw = e._raw || {};
        if (raw.sourceHandle != null) ee.sourcePort = `out:${String(raw.sourceHandle)}`;
        if (raw.targetHandle != null) ee.targetPort = `in:${String(raw.targetHandle)}`;
        return ee;
      }),
    }
  };
}

function computeLevels(graph){
  const ids = new Set();
  const outs = new Map();
  const incoming = new Map();
  for (const c of (graph.children || [])) { const id = String(c.id); ids.add(id); outs.set(id, []); incoming.set(id, 0); }
  for (const e of (graph.edges || [])){
    const s = String(e.sources?.[0] || '');
    const t = String(e.targets?.[0] || '');
    if (!ids.has(s) || !ids.has(t)) continue;
    outs.get(s).push(t);
    incoming.set(t, (incoming.get(t) || 0) + 1);
  }
  const q = []; const level = new Map();
  ids.forEach(id => { if ((incoming.get(id) || 0) === 0) q.push(id); level.set(id, 0); });
  while (q.length){
    const u = q.shift();
    for (const v of (outs.get(u) || [])){
      level.set(v, Math.max(level.get(v) || 0, (level.get(u) || 0) + 1));
      incoming.set(v, (incoming.get(v) || 0) - 1);
      if ((incoming.get(v) || 0) === 0) q.push(v);
    }
  }
  return level;
}

async function layoutGraph(graph, opts = {}){
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const { elkOptions, graph: elkGraph } = buildElkGraph(nodes, edges, opts);
  const laid = await elk.layout(elkGraph);
  const positions = {};
  const normalize = opts.normalizeLevels !== false; // default true
  const level = computeLevels(elkGraph);
  // Start from ELK output
  const posMap = new Map();
  for (const ch of (laid.children || [])) posMap.set(String(ch.id), { x: Math.round(ch.x || 0), y: Math.round(ch.y || 0) });
  // Adjust fan-out ordering to avoid crossings: place next-layer targets in the order of source handles
  try {
    const incoming = new Map();
    for (const c of (elkGraph.children || [])) incoming.set(String(c.id), 0);
    for (const e of (elkGraph.edges || [])){
      const t = String(e.targets?.[0] || '');
      if (incoming.has(t)) incoming.set(t, (incoming.get(t) || 0) + 1);
    }
    // Build output index maps per node (frontend order)
    const outIndex = new Map();
    for (const n of (nodes || [])){
      const ids = computeOutputOrder(n, edges);
      const m = new Map(); ids.forEach((id, i) => m.set(String(id), i));
      outIndex.set(String(n.id), m);
    }
    // Adjacency from elk edges to read bound ports
    const adj = new Map();
    for (const e of (elkGraph.edges || [])){
      const s = String(e.sources?.[0] || '');
      const t = String(e.targets?.[0] || '');
      if (!s || !t) continue;
      const port = String(e.sourcePort || '');
      const hId = port.startsWith('out:') ? port.slice(4) : '';
      if (!adj.has(s)) adj.set(s, []);
      adj.get(s).push({ t, h: hId });
    }
    const gapX = elkOptions.gapX, gapY = elkOptions.gapY;
    for (const [s, arr] of adj.entries()){
      const sLevel = level.get(s) || 0;
      const sPos = posMap.get(s) || { x: 0, y: 0 };
      const ts = arr.filter(it => (level.get(it.t) || 0) === sLevel + 1 && (incoming.get(it.t) || 0) === 1).slice();
      if (ts.length <= 1) continue;
      const map = outIndex.get(s) || new Map();
      ts.sort((a, b) => {
        const ia = Number.isFinite(map.get(a.h)) ? map.get(a.h) : 0;
        const ib = Number.isFinite(map.get(b.h)) ? map.get(b.h) : 0;
        return ia === ib ? a.t.localeCompare(b.t) : ia - ib;
      });
      const center = (ts.length - 1) / 2;
      if (elkOptions.direction === 'DOWN'){
        for (let i = 0; i < ts.length; i++){
          const tgt = ts[i].t; const x = Math.round(sPos.x + (i - center) * gapX);
          posMap.set(tgt, { x, y: (sLevel + 1) * gapY });
        }
      } else {
        for (let i = 0; i < ts.length; i++){
          const tgt = ts[i].t; const y = Math.round(sPos.y + (i - center) * gapY);
          posMap.set(tgt, { x: (sLevel + 1) * gapX, y });
        }
      }
    }
  } catch {}
  // Normalize to grid levels
  if (normalize){
    for (const ch of (laid.children || [])){
      const id = String(ch.id);
      const lv = level.get(id) || 0;
      const p = posMap.get(id) || { x: Math.round(ch.x || 0), y: Math.round(ch.y || 0) };
      if (elkOptions.direction === 'DOWN') positions[id] = { x: p.x, y: lv * elkOptions.gapY };
      else positions[id] = { x: lv * elkOptions.gapX, y: Math.round(Math.round(p.y / elkOptions.gapY) * elkOptions.gapY) };
    }
  } else {
    for (const [id, p] of posMap.entries()) positions[id] = p;
  }
  return { positions, options: elkOptions };
}

async function layoutGraphApplyToNodes(g, opts = {}){
  const nodes = Array.isArray(g?.nodes) ? g.nodes.slice() : [];
  const edges = Array.isArray(g?.edges) ? g.edges.slice() : [];
  const { positions } = await layoutGraph({ nodes, edges }, opts);
  const byId = new Map(nodes.map(n => [String(n.id), JSON.parse(JSON.stringify(n))]));
  for (const [id, p] of Object.entries(positions)){
    const n = byId.get(String(id)); if (n) { n.point = { x: p.x, y: p.y }; byId.set(String(id), n); }
  }
  return Array.from(byId.values());
}

module.exports = { layoutGraph, layoutGraphApplyToNodes };
