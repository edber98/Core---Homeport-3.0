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
  const rawEdges = (edges || [])
    .filter(e => nodeIds.has(String(e.source)) && nodeIds.has(String(e.target)))
    .map((e, idx) => ({ id: String(e.id || `e${idx}`), sources: [String(e.source)], targets: [String(e.target)], _raw: e }));
  // Build node type map and adjacency to detect Loop "return" edges from Each branch
  const nodeByIdFull = new Map((nodes || []).map(n => [String(n.id), n]));
  const isLoopNode = (id) => {
    try { return String(nodeByIdFull.get(String(id))?.data?.model?.templateObj?.type || '').toLowerCase() === 'loop'; } catch { return false; }
  };
  const outAdj = new Map(); // id -> array of {t, raw}
  for (const e of rawEdges){
    const s = String(e.sources[0]); const t = String(e.targets[0]);
    if (!outAdj.has(s)) outAdj.set(s, []);
    outAdj.get(s).push({ t, raw: e._raw });
  }
  const eachSubtree = new Map(); // loopId -> Set of nodes reachable from its 'each' branch
  for (const [id, n] of nodeByIdFull.entries()){
    if (!isLoopNode(id)) continue;
    // seeds: edges from loop with sourceHandle === 'each'
    const seeds = (outAdj.get(id) || []).filter(e => String(e.raw?.sourceHandle || '') === 'each').map(e => String(e.t));
    const vis = new Set(); const q = [...seeds];
    while (q.length){
      const u = q.shift(); if (vis.has(u)) continue; vis.add(u);
      for (const ne of (outAdj.get(u) || [])){
        const v = String(ne.t);
        if (!vis.has(v)) q.push(v);
      }
    }
    eachSubtree.set(id, vis);
  }
  // Filter out edges that return from a loop's Each subtree back into the loop (ignore for placement/levels)
  const elkEdges = rawEdges.filter(e => {
    const s = String(e.sources[0]); const t = String(e.targets[0]);
    if (!isLoopNode(t)) return true;
    const subtree = eachSubtree.get(t);
    if (!subtree) return true;
    return !subtree.has(s);
  });
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
  // Horizontal-specific anchor row for quantization
  let yAnchor = 0;
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

  // Horizontal-specific adjustments disabled (reverted to baseline)
  try { if (elkOptions.direction === 'RIGHT') { /* no-op */ } } catch {}

  // Vertical-specific global alignment: align each level relative to the Start node column
  try {
    if (elkOptions.direction === 'DOWN') {
      // Find the main Start/root node
      let startId = null;
      try {
        for (const n of (nodes || [])){
          const t = String(n?.data?.model?.templateObj?.type || '').toLowerCase();
          if (t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint') { startId = String(n.id); break; }
        }
      } catch {}
      if (!startId) {
        // fallback: node with minimal incoming degree
        const incoming = new Map();
        for (const c of (elkGraph.children || [])) incoming.set(String(c.id), 0);
        for (const e of (elkGraph.edges || [])){
          const t = String(e.targets?.[0] || '');
          if (incoming.has(t)) incoming.set(t, (incoming.get(t) || 0) + 1);
        }
        let min = Infinity; let id = null;
        for (const [k, v] of incoming.entries()) { if (v < min) { min = v; id = k; } }
        startId = id || null;
      }
      if (startId) {
        // Build predecessor map with handle indices
        const inAdj = new Map();
        const outIndex = new Map();
        for (const n of (nodes || [])){
          const ids = computeOutputOrder(n, edges);
          const m = new Map(); ids.forEach((id, i) => m.set(String(id), i));
          outIndex.set(String(n.id), m);
        }
        for (const e of (elkGraph.edges || [])){
          const s = String(e.sources?.[0] || '');
          const t = String(e.targets?.[0] || '');
          if (!s || !t) continue;
          const port = String(e.sourcePort || '');
          const hId = port.startsWith('out:') ? port.slice(4) : '';
          if (!inAdj.has(t)) inAdj.set(t, []);
          const m = outIndex.get(s) || new Map();
          const idx = Number.isFinite(m.get(hId)) ? m.get(hId) : 0;
          inAdj.get(t).push({ s, idx });
        }
        // Compute lexicographic keys from start to each node
        const keyMap = new Map();
        const compare = (a, b) => {
          const n = Math.min(a.length, b.length);
          for (let i = 0; i < n; i++) { if (a[i] !== b[i]) return a[i] - b[i]; }
          return a.length - b.length;
        };
        // Level-order DP
        const maxLevel = (() => { let m = 0; for (const v of level.values()) m = Math.max(m, v || 0); return m; })();
        keyMap.set(String(startId), []);
        for (let lv = 1; lv <= maxLevel; lv++){
          const ids = Array.from(level.entries()).filter(([k, v]) => (v || 0) === lv).map(([k]) => String(k));
          // compute candidate keys from predecessors (prefer preds with defined keys)
          for (const id of ids){
            const preds = (inAdj.get(id) || []).slice();
            let best = null;
            for (const pr of preds){
              const pk = keyMap.get(pr.s);
              if (!pk) continue;
              const cand = pk.concat([pr.idx]);
              if (!best || compare(cand, best) < 0) best = cand;
            }
            if (best) keyMap.set(id, best);
          }
          // Any nodes without a computed key: assign far-right order to keep them after
          const missing = ids.filter(id => !keyMap.has(id));
          for (const id of missing) keyMap.set(id, [Number.MAX_SAFE_INTEGER - 1, 0]);
          // Sort nodes by key and align around the Start column
          const arr = ids.slice().sort((a, b) => {
            const ka = keyMap.get(a) || [Number.MAX_SAFE_INTEGER];
            const kb = keyMap.get(b) || [Number.MAX_SAFE_INTEGER];
            const c = compare(ka, kb);
            return c !== 0 ? c : a.localeCompare(b);
          });
          const center = (arr.length - 1) / 2;
          const startPos = posMap.get(String(startId)) || { x: 0, y: 0 };
          for (let i = 0; i < arr.length; i++){
            const id = arr[i];
            const x = Math.round(startPos.x + (i - center) * elkOptions.gapX);
            posMap.set(id, { x, y: lv * elkOptions.gapY });
          }
        }
      }
    }
  } catch {}
  // Normalize to grid levels
  if (normalize){
    if (elkOptions.direction === 'DOWN') {
      // DOWN: mirror of RIGHT algorithm → keep straight chains for 1->1 and, for fan-outs, center children by handle order horizontally.
      // Build helper maps
      const parents = new Map(); // child -> parents[]
      const outNext = new Map(); // parent -> count of next-level children (lv+1)
      const outIndex = new Map(); // parent -> Map(handleId -> index)
      // Build output index per node based on frontend order
      for (const n of (nodes || [])){
        const ids = computeOutputOrder(n, edges);
        const m = new Map(); ids.forEach((id, i) => m.set(String(id), i));
        outIndex.set(String(n.id), m);
      }
      // Parents and next-level child counts + child handle ids
      const childEdge = new Map(); // child -> { parent, handleIdx }
      for (const e of (elkGraph.edges || [])){
        const s = String(e.sources?.[0] || '');
        const t = String(e.targets?.[0] || '');
        if (!s || !t) continue;
        if (!parents.has(t)) parents.set(t, []);
        parents.get(t).push(s);
        const sl = level.get(s) || 0;
        const tl = level.get(t) || 0;
        if (tl === sl + 1) {
          outNext.set(s, (outNext.get(s) || 0) + 1);
          const port = String(e.sourcePort || '');
          const hId = port.startsWith('out:') ? port.slice(4) : '';
          const m = outIndex.get(s) || new Map();
          const idx = Number.isFinite(m.get(hId)) ? m.get(hId) : 0;
          childEdge.set(t, { parent: s, idx });
        }
      }
      // Group nodes by level (row)
      const byLevel = new Map(); let maxLv = 0;
      for (const ch of (laid.children || [])){
        const id = String(ch.id);
        const lv = level.get(id) || 0;
        if (!byLevel.has(lv)) byLevel.set(lv, []);
        byLevel.get(lv).push(id);
        if (lv > maxLv) maxLv = lv;
      }
      // Process rows top to bottom
      const occ = new Map(); // lv -> Set(laneIndex)
      const lanesOf = (lv) => { if (!occ.has(lv)) occ.set(lv, new Set()); return occ.get(lv); };
      const xAnchor = 0;
      for (let lv = 0; lv <= maxLv; lv++){
        const arr = byLevel.get(lv) || [];
        // First pass: compute target x for each node
        const targetX = new Map();
        for (const id of arr) {
          const p = posMap.get(id) || { x: 0, y: 0 };
          let x = p.x;
          const ps = parents.get(id) || [];
          if (lv > 0 && ps.length === 1) {
            const pid = String(ps[0]);
            const nextCount = outNext.get(pid) || 0;
            const px = (positions[pid]?.x != null) ? positions[pid].x : (posMap.get(pid)?.x || x);
            if (nextCount === 1) {
              // straight chain
              x = px;
            } else if (nextCount > 1) {
              // fan-out: group by output handle index, then place children within each lane by recursive span (mirrored on X)
              // siblings on this level with single-parent
              const sibs = (elkGraph.edges || [])
                .filter(e => String(e.sources?.[0] || '') === pid)
                .map(e => String(e.targets?.[0] || ''))
                .filter(tid => (level.get(tid) || 0) === lv && (parents.get(tid) || []).length === 1);
              const uniq = Array.from(new Set(sibs));
              // Build adjacency of single-parent next-level children
              const nextMap = new Map(); // node -> children[] (single-parent) at next level
              for (const e2 of (elkGraph.edges || [])){
                const s2 = String(e2.sources?.[0] || '');
                const t2 = String(e2.targets?.[0] || '');
                if (!s2 || !t2) continue;
                const sl2 = level.get(s2) || 0; const tl2 = level.get(t2) || 0;
                if (tl2 === sl2 + 1 && (parents.get(t2) || []).length === 1){
                  if (!nextMap.has(s2)) nextMap.set(s2, []);
                  nextMap.get(s2).push(t2);
                }
              }
              // Span of subtree (single-parent chains only)
              const spanMemo = new Map();
              const span = (nid) => {
                if (spanMemo.has(nid)) return spanMemo.get(nid);
                const kids = nextMap.get(nid) || [];
                if (!kids.length) { spanMemo.set(nid, 1); return 1; }
                let ssum = 0; for (const k of kids) ssum += span(k);
                const val = Math.max(1, ssum);
                spanMemo.set(nid, val); return val;
              };
              // Group children by output handle index
              const groupsMap = new Map(); // idx -> tids[]
              for (const tid of uniq){
                const idx = (childEdge.get(tid)?.idx ?? Number.POSITIVE_INFINITY);
                if (!groupsMap.has(idx)) groupsMap.set(idx, []);
                groupsMap.get(idx).push(tid);
              }
              // Order groups by handle index, fallback by average x
              const groups = Array.from(groupsMap.entries()).map(([idx, tids]) => ({ idx, tids }));
              groups.sort((a,b) => {
                if (a.idx === b.idx){
                  const ax = a.tids.reduce((s,t)=>s+(posMap.get(t)?.x ?? px),0)/Math.max(1,a.tids.length);
                  const bx = b.tids.reduce((s,t)=>s+(posMap.get(t)?.x ?? px),0)/Math.max(1,b.tids.length);
                  return ax - bx;
                }
                return a.idx - b.idx;
              });
              // Compute span per child and per group
              const childSpan = new Map();
              for (const tid of uniq) childSpan.set(tid, span(tid));
              const groupSpan = groups.map(g => g.tids.reduce((s,t)=>s+(childSpan.get(t) || 1),0));
              const totalSpan = groupSpan.reduce((a,b)=>a+b,0);
              // Assign positions, then center the longest branch on the parent column
              let accGroups = 0;
              let xAssigned = px;
              for (let gi = 0; gi < groups.length; gi++){
                const g = groups[gi];
                const gSpan = groupSpan[gi];
                const gCenterOffset = (accGroups + gSpan/2) - totalSpan/2;
                const gBaseX = px + gCenterOffset * elkOptions.gapX; // center of group
                // distribute children inside the group by their spans
                let accChild = -gSpan/2;
                for (const tid of g.tids){
                  const cs = childSpan.get(tid) || 1;
                  const cCenter = accChild + cs/2; // relative to group center
                  const xChild = gBaseX + cCenter * elkOptions.gapX;
                  if (tid === id) xAssigned = xChild;
                  accChild += cs;
                }
                accGroups += gSpan;
              }
              // Find child with maximum span and compute delta to center it on px
              let bestTid = null; let bestSpan = -1;
              for (const tid of uniq) { const cs = childSpan.get(tid) || 1; if (cs > bestSpan) { bestSpan = cs; bestTid = tid; } }
              const xBest = (() => {
                // recompute same x positions to fetch best child's x
                let accG = 0; let xB = px;
                for (let gi = 0; gi < groups.length; gi++){
                  const g = groups[gi];
                  const gSpan = groupSpan[gi];
                  const gCenterOffset = (accG + gSpan/2) - totalSpan/2;
                  const gBaseX = px + gCenterOffset * elkOptions.gapX;
                  let accC = -gSpan/2;
                  for (const tid of g.tids){
                    const cs = childSpan.get(tid) || 1;
                    const cCenter = accC + cs/2;
                    const xx = gBaseX + cCenter * elkOptions.gapX;
                    if (tid === bestTid) xB = xx;
                    accC += cs;
                  }
                  accG += gSpan;
                }
                return xB;
              })();
              const delta = px - xBest;
              x = xAssigned + delta;
            }
          }
          targetX.set(id, x);
        }
        // Second pass: snap local per row (stable behavior)
        const orderedIds = arr.slice().sort((a,b) => {
          const xa = targetX.get(a) ?? (posMap.get(a)?.x || 0);
          const xb = targetX.get(b) ?? (posMap.get(b)?.x || 0);
          return xa === xb ? String(a).localeCompare(String(b)) : (xa - xb);
        });
        const set = lanesOf(lv);
        for (const id of orderedIds) {
          const x = targetX.get(id) ?? (posMap.get(id)?.x || 0);
          let lane = Math.round((x - xAnchor) / elkOptions.gapX);
          while (set.has(lane)) lane++;
          set.add(lane);
          const xq = xAnchor + lane * elkOptions.gapX;
          positions[id] = { x: xq, y: lv * elkOptions.gapY };
        }
      }
    } else {
      // RIGHT: keep straight chains for 1->1 and, for fan-outs, center children around the parent's row using output order.
      // Build helper maps
      const parents = new Map(); // child -> parents[]
      const outNext = new Map(); // parent -> count of next-level children
      const outIndex = new Map(); // parent -> Map(handleId -> index)
      // Build output index per node based on frontend order
      for (const n of (nodes || [])){
        const ids = computeOutputOrder(n, edges);
        const m = new Map(); ids.forEach((id, i) => m.set(String(id), i));
        outIndex.set(String(n.id), m);
      }
      // Parents and next-level child counts + child handle ids
      const childEdge = new Map(); // child -> { parent, handleIdx }
      for (const e of (elkGraph.edges || [])){
        const s = String(e.sources?.[0] || '');
        const t = String(e.targets?.[0] || '');
        if (!s || !t) continue;
        if (!parents.has(t)) parents.set(t, []);
        parents.get(t).push(s);
        const sl = level.get(s) || 0;
        const tl = level.get(t) || 0;
        if (tl === sl + 1) {
          outNext.set(s, (outNext.get(s) || 0) + 1);
          const port = String(e.sourcePort || '');
          const hId = port.startsWith('out:') ? port.slice(4) : '';
          const m = outIndex.get(s) || new Map();
          const idx = Number.isFinite(m.get(hId)) ? m.get(hId) : 0;
          childEdge.set(t, { parent: s, idx });
        }
      }
      // Group nodes by level
      const byLevel = new Map(); let maxLv = 0;
      for (const ch of (laid.children || [])){
        const id = String(ch.id);
        const lv = level.get(id) || 0;
        if (!byLevel.has(lv)) byLevel.set(lv, []);
        byLevel.get(lv).push(id);
        if (lv > maxLv) maxLv = lv;
      }
      // Process levels left to right
      const occ = new Map(); // lv -> Set(laneIndex)
      const lanesOf = (lv) => { if (!occ.has(lv)) occ.set(lv, new Set()); return occ.get(lv); };
      for (let lv = 0; lv <= maxLv; lv++){
        const arr = byLevel.get(lv) || [];
        // First pass: compute target y for each node
        const targetY = new Map();
        for (const id of arr) {
          const p = posMap.get(id) || { x: 0, y: 0 };
          let y = p.y;
          const ps = parents.get(id) || [];
          if (lv > 0 && ps.length === 1) {
            const pid = String(ps[0]);
            const nextCount = outNext.get(pid) || 0;
            const py = (positions[pid]?.y != null) ? positions[pid].y : (posMap.get(pid)?.y || y);
            if (nextCount === 1) {
              // straight chain
              y = py;
            } else if (nextCount > 1) {
              // fan-out: group by output handle index (primary lanes), then place children within each lane by recursive span
              // siblings on this level with single-parent
              const sibs = (elkGraph.edges || [])
                .filter(e => String(e.sources?.[0] || '') === pid)
                .map(e => String(e.targets?.[0] || ''))
                .filter(tid => (level.get(tid) || 0) === lv && (parents.get(tid) || []).length === 1);
              const uniq = Array.from(new Set(sibs));
              // Build adjacency of single-parent next-level children
              const nextMap = new Map(); // node -> children[] (single-parent) at next level
              for (const e2 of (elkGraph.edges || [])){
                const s2 = String(e2.sources?.[0] || '');
                const t2 = String(e2.targets?.[0] || '');
                if (!s2 || !t2) continue;
                const sl2 = level.get(s2) || 0; const tl2 = level.get(t2) || 0;
                if (tl2 === sl2 + 1 && (parents.get(t2) || []).length === 1){
                  if (!nextMap.has(s2)) nextMap.set(s2, []);
                  nextMap.get(s2).push(t2);
                }
              }
              // Span of subtree (single-parent chains only)
              const spanMemo = new Map();
              const span = (nid) => {
                if (spanMemo.has(nid)) return spanMemo.get(nid);
                const kids = nextMap.get(nid) || [];
                if (!kids.length) { spanMemo.set(nid, 1); return 1; }
                let ssum = 0; for (const k of kids) ssum += span(k);
                const val = Math.max(1, ssum);
                spanMemo.set(nid, val); return val;
              };
              // Group children by output handle index
              const groupsMap = new Map(); // idx -> tids[]
              for (const tid of uniq){
                const idx = (childEdge.get(tid)?.idx ?? Number.POSITIVE_INFINITY);
                if (!groupsMap.has(idx)) groupsMap.set(idx, []);
                groupsMap.get(idx).push(tid);
              }
              // Order groups by handle index, fallback by average y
              const groups = Array.from(groupsMap.entries()).map(([idx, tids]) => ({ idx, tids }));
              groups.sort((a,b) => {
                if (a.idx === b.idx){
                  const ay = a.tids.reduce((s,t)=>s+(posMap.get(t)?.y ?? py),0)/Math.max(1,a.tids.length);
                  const by = b.tids.reduce((s,t)=>s+(posMap.get(t)?.y ?? py),0)/Math.max(1,b.tids.length);
                  return ay - by;
                }
                return a.idx - b.idx;
              });
              // Compute span per child and per group
              const childSpan = new Map();
              for (const tid of uniq) childSpan.set(tid, span(tid));
              const groupSpan = groups.map(g => g.tids.reduce((s,t)=>s+(childSpan.get(t) || 1),0));
              const totalSpan = groupSpan.reduce((a,b)=>a+b,0);
              // Assign positions
              let accGroups = 0;
              let yAssigned = py;
              for (let gi = 0; gi < groups.length; gi++){
                const g = groups[gi];
                const gSpan = groupSpan[gi];
                const gCenterOffset = (accGroups + gSpan/2) - totalSpan/2;
                const gBaseY = py + gCenterOffset * elkOptions.gapY; // center of group
                // distribute children inside the group by their spans
                let accChild = -gSpan/2;
                for (const tid of g.tids){
                  const cs = childSpan.get(tid) || 1;
                  const cCenter = accChild + cs/2; // relative to group center
                  const yChild = gBaseY + cCenter * elkOptions.gapY;
                  if (tid === id) yAssigned = yChild;
                  accChild += cs;
                }
                accGroups += gSpan;
              }
              y = yAssigned;
            }
          }
          targetY.set(id, y);
        }
        // Second pass: snap to grid around anchor, resolving collisions by pushing downwards
        const set = lanesOf(lv);
        // stable order by targetY then id
        const orderedIds = arr.slice().sort((a,b) => {
          const ya = targetY.get(a) ?? (posMap.get(a)?.y || 0);
          const yb = targetY.get(b) ?? (posMap.get(b)?.y || 0);
          return ya === yb ? String(a).localeCompare(String(b)) : (ya - yb);
        });
        for (const id of orderedIds) {
          const y = targetY.get(id) ?? (posMap.get(id)?.y || 0);
          let lane = Math.round((y - yAnchor) / elkOptions.gapY);
          while (set.has(lane)) lane++;
          set.add(lane);
          const yq = yAnchor + lane * elkOptions.gapY;
          positions[id] = { x: lv * elkOptions.gapX, y: yq };
        }
      }
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
