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
      // Nouvelle implémentation DOWN: layout bottom-up type "tidy tree" (Reingold–Tilford simplifié)
      // Principe: largeur(node) = somme largeurs(enfants au level+1), feuille = 1; x(node) = moyenne(x(enfants))
      try {
        const gapX = elkOptions.gapX, gapY = elkOptions.gapY;
        // 1) Préparer ordre des handles pour trier les enfants
        const outIndex = new Map();
        for (const n of (nodes || [])){
          const ids = computeOutputOrder(n, edges);
          const m = new Map(); ids.forEach((id, i) => m.set(String(id), i));
          outIndex.set(String(n.id), m);
        }
        // 2) Candidats enfants au niveau suivant (level + 1)
        const parentsAll = new Map(); // child -> parents[] (tous)
        const childHandleIdx = new Map(); // key "p->c" -> handle index
        for (const e of (elkGraph.edges || [])){
          const s = String(e.sources?.[0] || '');
          const t = String(e.targets?.[0] || '');
          if (!s || !t) continue;
          const sl = level.get(s) || 0; const tl = level.get(t) || 0;
          if (tl !== sl + 1) continue;
          if (!parentsAll.has(t)) parentsAll.set(t, []);
          parentsAll.get(t).push(s);
          const port = String(e.sourcePort || '');
          const hId = port.startsWith('out:') ? port.slice(4) : '';
          const m = outIndex.get(s) || new Map();
          const idx = Number.isFinite(m.get(hId)) ? m.get(hId) : 0;
          childHandleIdx.set(`${s}=>${t}`, idx);
        }
        // 3) Construire une arborescence primaire (un seul parent par enfant): parent avec plus petit handle index
        const primaryParent = new Map(); // child -> parent
        const childrenByParent = new Map(); // parent -> children[] (au level+1)
        for (const [t, ps] of parentsAll.entries()){
          let bestP = null; let bestIdx = Number.POSITIVE_INFINITY;
          for (const p of ps){
            const idx = childHandleIdx.get(`${p}=>${t}`);
            if (idx < bestIdx || (idx === bestIdx && String(p) < String(bestP || ''))){ bestIdx = idx; bestP = p; }
          }
          if (bestP){
            primaryParent.set(String(t), String(bestP));
            if (!childrenByParent.has(String(bestP))) childrenByParent.set(String(bestP), []);
            childrenByParent.get(String(bestP)).push(String(t));
          }
        }
        // 4) Ordonner les enfants par index de handle
        for (const [p, arr] of childrenByParent.entries()){
          arr.sort((a,b) => {
            const ia = childHandleIdx.get(`${p}=>${a}`);
            const ib = childHandleIdx.get(`${p}=>${b}`);
            if (ia !== ib) return ia - ib;
            return String(a).localeCompare(String(b));
          });
          childrenByParent.set(p, arr);
        }
        // 5) Racines (no primary parent)
        const allIds = new Set(Array.from(level.keys()).map(String));
        const hasParent = new Map(); for (const id of allIds) hasParent.set(id, false);
        for (const [c,p] of primaryParent.entries()) hasParent.set(String(c), true);
        // privilégier le Start si présent
        let startId = null; try { for (const n of (nodes || [])) { const t = String(n?.data?.model?.templateObj?.type || '').toLowerCase(); if (t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint') { startId = String(n.id); break; } } } catch {}
        const roots = [];
        if (startId && hasParent.get(String(startId)) === false) roots.push(String(startId));
        for (const id of allIds){ if (hasParent.get(id) === false && id !== startId) roots.push(id); }
        // 6) Post-ordre: largeur et x lanes (feuille=1, parent=sum, x=avg)
        const width = new Map();
        const xlane = new Map();
        let nextSlot = 0;
        const visited = new Set();
        const orderChildren = (p) => (childrenByParent.get(String(p)) || []).slice();
        const dfs = (u) => {
          const id = String(u);
          if (visited.has(id)) return; // éviter boucles éventuelles
          visited.add(id);
          const kids = orderChildren(id);
          if (!kids.length){
            width.set(id, 1);
            xlane.set(id, nextSlot);
            nextSlot += 1;
            return;
          }
          for (const v of kids) dfs(v);
          // centre = moyenne des x enfants
          let sumX = 0; let sumWint = 0;
          for (const v of kids){ sumX += (xlane.get(String(v)) || 0); const wv = (width.get(String(v)) || 1); sumWint += wv; }
          const xavg = sumX / Math.max(1, kids.length);
          xlane.set(id, xavg);
          width.set(id, sumWint);
        };
        for (const r of roots) dfs(r);
        // 7) Convertir en positions: x par lanes, y par level
        for (const id of allIds){
          const lv = level.get(String(id)) || 0;
          const xL = xlane.has(String(id)) ? xlane.get(String(id)) : 0;
          const x = Math.round(xL * gapX);
          positions[String(id)] = { x, y: lv * gapY };
        }
        return { positions, options: elkOptions };
      } catch (e) {
        // En cas d'erreur, on retombe sur l'ancienne logique plus bas
      }

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
      // Build global single-parent next-level adjacency to evaluate subtree/path lengths
      const nextMapGlobal = new Map(); // node -> children[] at next level (single-parent only)
      const inDegree = new Map();
      for (const ch of (laid.children || [])) inDegree.set(String(ch.id), 0);
      for (const e of (elkGraph.edges || [])){
        const t = String(e.targets?.[0] || '');
        if (inDegree.has(t)) inDegree.set(t, (inDegree.get(t) || 0) + 1);
      }
      for (const e2 of (elkGraph.edges || [])){
        const s2 = String(e2.sources?.[0] || '');
        const t2 = String(e2.targets?.[0] || '');
        if (!s2 || !t2) continue;
        const sl2 = level.get(s2) || 0; const tl2 = level.get(t2) || 0;
        if (tl2 === sl2 + 1 && (inDegree.get(t2) || 0) === 1){
          if (!nextMapGlobal.has(s2)) nextMapGlobal.set(s2, []);
          nextMapGlobal.get(s2).push(t2);
        }
      }
      // Parent->child handle index map for tie-breaking
      const parentChildHandleIdx = new Map(); // parent -> Map(child -> idx)
      for (const [cid, info] of childEdge.entries()){
        const pid = String(info.parent); const idx = Number(info.idx) || 0;
        if (!parentChildHandleIdx.has(pid)) parentChildHandleIdx.set(pid, new Map());
        parentChildHandleIdx.get(pid).set(String(cid), idx);
      }

      // Compute longest path lengths (by node count) from each node downwards
      const pathLenMemoGlobal = new Map();
      const pathLenGlobal = (nid) => {
        const key = String(nid);
        if (pathLenMemoGlobal.has(key)) return pathLenMemoGlobal.get(key);
        const kids = nextMapGlobal.get(key) || [];
        if (!kids.length) { pathLenMemoGlobal.set(key, 1); return 1; }
        let m = 0; for (const k of kids) m = Math.max(m, pathLenGlobal(k));
        const val = 1 + m; pathLenMemoGlobal.set(key, val); return val;
      };

      // Determine Start anchor column (used to align the global longest path)
      const byLevel = new Map(); let maxLv = 0;
      for (const ch of (laid.children || [])){
        const id = String(ch.id);
        const lv = level.get(id) || 0;
        if (!byLevel.has(lv)) byLevel.set(lv, []);
        byLevel.get(lv).push(id);
        if (lv > maxLv) maxLv = lv;
      }
      let startIdDown = null;
      try {
        for (const n of (nodes || [])){
          const t = String(n?.data?.model?.templateObj?.type || '').toLowerCase();
          if (t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint') { startIdDown = String(n.id); break; }
        }
      } catch {}
      if (!startIdDown) {
        const incoming = new Map();
        for (const c of (laid.children || [])) incoming.set(String(c.id), 0);
        for (const e of (elkGraph.edges || [])){
          const t = String(e.targets?.[0] || '');
          if (incoming.has(t)) incoming.set(t, (incoming.get(t) || 0) + 1);
        }
        let min = Infinity; let id = null;
        for (const [k, v] of incoming.entries()) { if (v < min) { min = v; id = k; } }
        startIdDown = id || null;
      }
      const startAnchorPosDown = startIdDown ? (posMap.get(String(startIdDown)) || { x: 0, y: 0 }) : { x: 0, y: 0 };
      const startAnchorX = startAnchorPosDown.x || 0;
      const startAnchorLane = Math.round(startAnchorX / (elkOptions.gapX || 1));

      // Compute the global primary path (longest path by node count) from Start
      const primarySet = new Set();
      if (startIdDown){
        let cur = String(startIdDown);
        primarySet.add(cur);
        for (let lv = 0; lv < maxLv; lv++){
          const kids = (nextMapGlobal.get(cur) || []).slice();
          if (!kids.length) break;
          kids.sort((a,b) => {
            const pa = pathLenGlobal(a); const pb = pathLenGlobal(b);
            if (pa !== pb) return pb - pa; // desc
            const ma = (parentChildHandleIdx.get(cur) || new Map()).get(String(a));
            const mb = (parentChildHandleIdx.get(cur) || new Map()).get(String(b));
            const ia = Number.isFinite(ma) ? ma : 0; const ib = Number.isFinite(mb) ? mb : 0;
            return ia === ib ? String(a).localeCompare(String(b)) : (ia - ib);
          });
          cur = String(kids[0]);
          primarySet.add(cur);
        }
      }
      // Process rows top to bottom
      const occ = new Map(); // lv -> Set(laneIndex)
      const lanesOf = (lv) => { if (!occ.has(lv)) occ.set(lv, new Set()); return occ.get(lv); };
      const xAnchor = 0;
      for (let lv = 0; lv <= maxLv; lv++){
        const arr = byLevel.get(lv) || [];
        // First pass: compute target x for each node
        const targetX = new Map();
        const lockedLane = new Map(); // id -> lane index we must prioritize (align with parent column)
        const rowChildrenByParent = new Map(); // parentId -> ids[] at this row (single-parent only)
        for (const id of arr) {
          const p = posMap.get(id) || { x: 0, y: 0 };
          let x = p.x;
          const ps = parents.get(id) || [];
          if (lv > 0 && ps.length === 1) {
            const pid = String(ps[0]);
            if (!rowChildrenByParent.has(pid)) rowChildrenByParent.set(pid, []);
            rowChildrenByParent.get(pid).push(String(id));
            const nextCount = outNext.get(pid) || 0;
            const px = (positions[pid]?.x != null) ? positions[pid].x : (posMap.get(pid)?.x || x);
            if (nextCount === 1) {
              // straight chain aligned to parent column
              x = px;
              const laneP = Math.round((px - xAnchor) / elkOptions.gapX);
              lockedLane.set(String(id), laneP);
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
              // Span of subtree (single-parent chains only, with 1-lane gaps) and longest path length (by node count)
              const spanMemo = new Map();
              const pathLenMemo = new Map();
              const span = (nid) => {
                if (spanMemo.has(nid)) return spanMemo.get(nid);
                const kids = nextMap.get(nid) || [];
                if (!kids.length) { spanMemo.set(nid, 1); return 1; }
                let ssum = 0; for (const k of kids) ssum += span(k);
                const val = Math.max(1, ssum + Math.max(0, kids.length - 1));
                spanMemo.set(nid, val); return val;
              };
              const pathLen = (nid) => {
                if (pathLenMemo.has(nid)) return pathLenMemo.get(nid);
                const kids = nextMap.get(nid) || [];
                if (!kids.length) { pathLenMemo.set(nid, 1); return 1; }
                let m = 0; for (const k of kids) m = Math.max(m, pathLen(k));
                const val = 1 + m; pathLenMemo.set(nid, val); return val;
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
              // Compute span per child and per group (with 1-lane gaps between siblings and groups)
              const childSpan = new Map();
              for (const tid of uniq) childSpan.set(tid, span(tid));
              const groupSpan = groups.map(g => g.tids.reduce((s,t)=>s+(childSpan.get(t) || 1),0) + Math.max(0, g.tids.length - 1));
              const totalSpan = groupSpan.reduce((a,b)=>a+b,0) + Math.max(0, groups.length - 1);
              // Determine child with maximum path length (by node count), tie-break by span
              let bestTid = null; let bestLen = -1; let bestSpan = -1;
              for (const tid of uniq) {
                const pl = pathLen(tid);
                const cs = childSpan.get(tid) || 1;
                if (pl > bestLen || (pl === bestLen && cs > bestSpan)) { bestLen = pl; bestSpan = cs; bestTid = tid; }
              }
              // Assign positions: place bestTid group centered on px, other groups packed left/right with 1-lane gaps (minimal width)
              let xAssigned = px;
              let xBestCandidate = px;
              const bestGroupIdx = groups.findIndex(g => g.tids.includes(bestTid));
              const leftIdxs = groups.map((g,idx)=>idx).filter(idx => idx < bestGroupIdx);
              const rightIdxs = groups.map((g,idx)=>idx).filter(idx => idx > bestGroupIdx);
              leftIdxs.sort((a,b) => (groupSpan[b] - groupSpan[a]) || (a-b));
              rightIdxs.sort((a,b) => (groupSpan[b] - groupSpan[a]) || (a-b));
              const totalLeftUnits = leftIdxs.reduce((s,idx)=>s+groupSpan[idx],0) + (leftIdxs.length>0 ? leftIdxs.length : 0);
              const totalRightUnits = rightIdxs.reduce((s,idx)=>s+groupSpan[idx],0) + (rightIdxs.length>0 ? rightIdxs.length : 0);
              let leftCursor = - totalLeftUnits;
              let rightCursor = + totalRightUnits;
              const groupBaseX = new Map();
              groupBaseX.set(bestGroupIdx, px);
              for (const idx of leftIdxs){
                const w = groupSpan[idx];
                const center = leftCursor + (w/2);
                groupBaseX.set(idx, px + center * elkOptions.gapX);
                leftCursor += w + 1;
              }
              for (const idx of rightIdxs){
                const w = groupSpan[idx];
                const center = rightCursor - (w/2);
                groupBaseX.set(idx, px + center * elkOptions.gapX);
                rightCursor -= w + 1;
              }
              for (let gi = 0; gi < groups.length; gi++){
                const g = groups[gi];
                const gSpanVal = groupSpan[gi];
                const gBaseX = groupBaseX.get(gi);
                // Distribute children inside the group by their subtree spans with 1-lane gaps (place farthest first to reduce crossings)
                const tidsInGroup = g.tids.slice();
                const sizeOf = (t) => (childSpan.get(t) || 1);
                const hasBestHere = tidsInGroup.includes(bestTid);
                const others = tidsInGroup.filter(t => t !== bestTid)
                  .sort((a,b) => (sizeOf(b) - sizeOf(a)) || String(a).localeCompare(String(b)));
                // Far-edge placement: start from group extremes and move inward
                let leftEdge = -(gSpanVal/2);   // leftmost used position
                let rightEdge = +(gSpanVal/2);  // rightmost used position
                const centersRel = new Map();
                if (hasBestHere){
                  centersRel.set(bestTid, 0);
                }
                const isLeftGroup = (gi < bestGroupIdx);
                let preferLeft = isLeftGroup; // first secondary goes farthest from parent: left for left groups, right for right groups
                for (const t of others){
                  const w = sizeOf(t);
                  if (preferLeft){
                    const c = leftEdge + w/2; centersRel.set(t, c); leftEdge += w + 1;
                  } else {
                    const c = rightEdge - w/2; centersRel.set(t, c); rightEdge -= w + 1;
                  }
                  preferLeft = !preferLeft; // alternate to keep filling from far edges inward
                }
                // If best child is in this group, shift base so its center aligns parent column
                let gBaseShifted = gBaseX;
                if (hasBestHere){
                  const cBest = centersRel.get(bestTid) || 0;
                  gBaseShifted = gBaseX - cBest * elkOptions.gapX;
                }
                for (const t of tidsInGroup){
                  const rel = centersRel.has(t) ? centersRel.get(t) : 0;
                  const xChild = gBaseShifted + rel * elkOptions.gapX;
                  if (t === id) xAssigned = xChild;
                  if (t === bestTid) xBestCandidate = xChild;
                }
              }
              // With best tid centered on px in its group, xBestCandidate === px, so no delta needed
              x = xAssigned;
              // Lock the longest branch child on parent's lane
              const laneP = Math.round((px - xAnchor) / elkOptions.gapX);
              if (bestTid) lockedLane.set(String(bestTid), laneP);
            }
          }
          targetX.set(id, x);
        }
        // Second pass: snap local per row with locked lanes first, then grouped by parent to preserve reserved lanes
        const set = lanesOf(lv);
        const items = arr.map(id => ({
          id: String(id),
          desiredLane: Math.round(((targetX.get(id) ?? (posMap.get(id)?.x || 0)) - xAnchor) / elkOptions.gapX),
          locked: lockedLane.has(String(id)),
          lockLane: lockedLane.get(String(id)),
          parent: (parents.get(String(id)) || [])[0] ? String((parents.get(String(id)) || [])[0]) : null,
        }));
        const lockedItems = items.filter(it => it.locked).sort((a,b) => (a.lockLane === b.lockLane ? a.id.localeCompare(b.id) : a.lockLane - b.lockLane));
        // Build parent groups for free items (single-parent groups first)
        const freeItems = items.filter(it => !it.locked);
        const groups = [];
        // parents that have multiple children at this row
        const multiParents = Array.from(rowChildrenByParent.entries())
          .filter(([pid, ids]) => ids.length > 1)
          .map(([pid, ids]) => pid);
        // place groups: multiParents first, then other parents, then null parents
        const parentOrder = [
          ...multiParents,
          ...Array.from(rowChildrenByParent.keys()).filter(pid => !multiParents.includes(pid)),
        ];
        for (const pid of parentOrder){
          const gi = freeItems.filter(it => it.parent === pid);
          gi.sort((a,b) => (a.desiredLane === b.desiredLane ? a.id.localeCompare(b.id) : a.desiredLane - b.desiredLane));
          if (gi.length) groups.push(gi);
        }
        const noParent = freeItems.filter(it => !it.parent);
        noParent.sort((a,b) => (a.desiredLane === b.desiredLane ? a.id.localeCompare(b.id) : a.desiredLane - b.desiredLane));
        if (noParent.length) groups.push(noParent);
        const placeExactOrNearest = (lane) => {
          if (!set.has(lane)) return lane;
          const MAX = 1000;
          for (let off = 1; off < MAX; off++){
            const r = lane + off; if (!set.has(r)) return r;
            const l = lane - off; if (!set.has(l)) return l;
          }
          return lane;
        };
        for (const it of lockedItems){ const lane = placeExactOrNearest(it.lockLane); set.add(lane); const xq = xAnchor + lane * elkOptions.gapX; positions[it.id] = { x: xq, y: lv * elkOptions.gapY }; }
        // Place groups as contiguous blocks to avoid scattering and preserve reserved empty lanes
        const placeBlock = (minLane, maxLane) => {
          const width = maxLane - minLane + 1;
          const MAX = 1000;
          // try minimal shift around minLane
          if ([...Array(width)].every((_,i)=>!set.has(minLane+i))) return minLane;
          for (let off = 1; off < MAX; off++){
            const startR = minLane + off;
            if ([...Array(width)].every((_,i)=>!set.has(startR+i))) return startR;
            const startL = minLane - off;
            if ([...Array(width)].every((_,i)=>!set.has(startL+i))) return startL;
          }
          return minLane;
        };
        for (const grp of groups){
          const free = grp.filter(it => !positions[it.id]);
          if (!free.length) continue;
          free.sort((a,b) => a.desiredLane - b.desiredLane);
          const minLane = free[0].desiredLane;
          const maxLane = free[free.length-1].desiredLane;
          const start = placeBlock(minLane, maxLane);
          for (const it of free){
            const lane = start + (it.desiredLane - minLane);
            set.add(lane);
            const xq = xAnchor + lane * elkOptions.gapX;
            positions[it.id] = { x: xq, y: lv * elkOptions.gapY };
          }
        }
      }
    } else {
      // RIGHT: tidy tree bottom-up (Reingold–Tilford simplifié)
      try {
        const gapX = elkOptions.gapX, gapY = elkOptions.gapY;
        // 1) Ordre des handles
        const outIndex = new Map();
        for (const n of (nodes || [])){
          const ids = computeOutputOrder(n, edges);
          const m = new Map(); ids.forEach((id, i) => m.set(String(id), i));
          outIndex.set(String(n.id), m);
        }
        // 2) Enfants au niveau suivant
        const parentsAll = new Map();
        const childHandleIdx = new Map();
        for (const e of (elkGraph.edges || [])){
          const s = String(e.sources?.[0] || '');
          const t = String(e.targets?.[0] || '');
          if (!s || !t) continue;
          const sl = level.get(s) || 0; const tl = level.get(t) || 0;
          if (tl !== sl + 1) continue;
          if (!parentsAll.has(t)) parentsAll.set(t, []);
          parentsAll.get(t).push(s);
          const port = String(e.sourcePort || '');
          const hId = port.startsWith('out:') ? port.slice(4) : '';
          const m = outIndex.get(s) || new Map();
          const idx = Number.isFinite(m.get(hId)) ? m.get(hId) : 0;
          childHandleIdx.set(`${s}=>${t}`, idx);
        }
        // 3) Parent primaire min handle index
        const primaryParent = new Map();
        const childrenByParent = new Map();
        for (const [t, ps] of parentsAll.entries()){
          let bestP = null; let bestIdx = Number.POSITIVE_INFINITY;
          for (const p of ps){
            const idx = childHandleIdx.get(`${p}=>${t}`);
            if (idx < bestIdx || (idx === bestIdx && String(p) < String(bestP || ''))){ bestIdx = idx; bestP = p; }
          }
          if (bestP){
            primaryParent.set(String(t), String(bestP));
            if (!childrenByParent.has(String(bestP))) childrenByParent.set(String(bestP), []);
            childrenByParent.get(String(bestP)).push(String(t));
          }
        }
        for (const [p, arr] of childrenByParent.entries()){
          arr.sort((a,b) => {
            const ia = childHandleIdx.get(`${p}=>${a}`);
            const ib = childHandleIdx.get(`${p}=>${b}`);
            if (ia !== ib) return ia - ib;
            return String(a).localeCompare(String(b));
          });
          childrenByParent.set(p, arr);
        }
        // 4) Racines
        const allIds = new Set(Array.from(level.keys()).map(String));
        const hasParent = new Map(); for (const id of allIds) hasParent.set(id, false);
        for (const [c,p] of primaryParent.entries()) hasParent.set(String(c), true);
        let startId = null; try { for (const n of (nodes || [])) { const t = String(n?.data?.model?.templateObj?.type || '').toLowerCase(); if (t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint') { startId = String(n.id); break; } } } catch {}
        const roots = [];
        if (startId && hasParent.get(String(startId)) === false) roots.push(String(startId));
        for (const id of allIds){ if (hasParent.get(id) === false && id !== startId) roots.push(id); }
        // 5) Post-ordre: hauteur et y-lanes
        const height = new Map();
        const ylane = new Map();
        let nextSlot = 0;
        const visited = new Set();
        const orderChildren = (p) => (childrenByParent.get(String(p)) || []).slice();
        const dfs = (u) => {
          const id = String(u);
          if (visited.has(id)) return;
          visited.add(id);
          const kids = orderChildren(id);
          if (!kids.length){
            height.set(id, 1);
            ylane.set(id, nextSlot);
            nextSlot += 1;
            return;
          }
          for (const v of kids) dfs(v);
          let sumY = 0; let sumH = 0;
          for (const v of kids){ sumY += (ylane.get(String(v)) || 0); sumH += (height.get(String(v)) || 1); }
          const yavg = sumY / Math.max(1, kids.length);
          ylane.set(id, yavg);
          height.set(id, sumH);
        };
        for (const r of roots) dfs(r);
        // 6) Positions
        for (const id of allIds){
          const lv = level.get(String(id)) || 0;
          const yL = ylane.has(String(id)) ? ylane.get(String(id)) : 0;
          const y = Math.round(yL * gapY);
          positions[String(id)] = { x: lv * gapX, y };
        }
        return { positions, options: elkOptions };
      } catch (e) {}
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
