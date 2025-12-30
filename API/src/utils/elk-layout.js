const ELK = require('elkjs');
const elk = new ELK();

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
  return {
    elkOptions: { direction, nodeWidth, nodeHeight, gapX, gapY, borderGapX, borderGapY },
    graph: {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction,
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        'elk.layered.mergeEdges': 'true',
        'elk.layered.crossingMinimization.semiInteractive': 'true',
        'elk.layered.spacing.nodeNodeBetweenLayers': String(borderGapY),
        'elk.spacing.nodeNode': String(borderGapX),
        'elk.edgeRouting': 'ORTHOGONAL',
      },
      children: (nodes || []).map(n => ({ id: String(n.id), width: nodeWidth, height: nodeHeight })),
      edges: (edges || [])
        .filter(e => nodeIds.has(String(e.source)) && nodeIds.has(String(e.target)))
        .map((e, idx) => ({ id: String(e.id || `e${idx}`), sources: [String(e.source)], targets: [String(e.target)] })),
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
  if (normalize){
    const level = computeLevels(elkGraph);
    for (const ch of (laid.children || [])){
      const id = String(ch.id);
      const lv = level.get(id) || 0;
      if (elkOptions.direction === 'DOWN') positions[id] = { x: Math.round(ch.x || 0), y: lv * elkOptions.gapY };
      else positions[id] = { x: lv * elkOptions.gapX, y: Math.round(ch.y || 0) };
    }
  } else {
    for (const ch of (laid.children || [])) positions[String(ch.id)] = { x: Math.round(ch.x || 0), y: Math.round(ch.y || 0) };
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

