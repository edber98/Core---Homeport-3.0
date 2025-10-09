import { Injectable } from '@angular/core';
import { Edge } from 'ngx-vflow';
import { FlowGraphService } from './flow-graph.service';

@Injectable({ providedIn: 'root' })
export class FlowBuilderUtilsService {
  constructor(private graph: FlowGraphService) {}

  normalizeTemplate(t: any) {
    return t && typeof t === 'object' ? t : { id: String(t || ''), type: 'function', title: 'Node', output: [], args: {} };
  }

  generateNodeId(tpl: any, fallbackName: string, usedIds: Set<string>): string {
    const type = String((tpl?.type || 'node')).toLowerCase();
    const rawName = String((tpl?.name || tpl?.title || fallbackName || '') || '').trim();
    const nameSlug = rawName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, ' ')
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'node';
    let id = '';
    do {
      const s1 = Date.now().toString(36).slice(-4);
      const s2 = Math.random().toString(36).slice(2, 6);
      id = `${type}_${nameSlug}_${s1}_${s2}`;
    } while (usedIds.has(id));
    return id;
  }

  // Convert screen-relative point to world coordinates given viewport state
  screenToWorld(relX: number, relY: number, vp: { zoom: number; x: number; y: number }) {
    const scale = vp.zoom || 1;
    return { x: ((relX - vp.x) / scale), y: ((relY - vp.y) / scale) };
  }

  // Compute drop point in world coords near pointer
  computeDropPointFromMouse(ev: MouseEvent, hostRect: DOMRect, vp: { zoom: number; x: number; y: number }) {
    const rel = { x: ev.clientX - hostRect.left, y: ev.clientY - hostRect.top };
    const w = this.screenToWorld(rel.x, rel.y, vp);
    return { x: w.x - 90, y: w.y - 60 };
  }

  // Compute world center from viewport + host rect
  viewportCenterWorld(vp: { zoom: number; x: number; y: number }, hostRect: DOMRect) {
    const centerScreenX = hostRect.width / 2;
    const centerScreenY = hostRect.height / 2;
    const wx = (centerScreenX - vp.x) / (vp.zoom || 1);
    const wy = (centerScreenY - vp.y) / (vp.zoom || 1);
    return { x: wx, y: wy };
  }

  // Return new viewport state to center on given world point
  centerViewportOnWorldPoint(vp: { zoom: number; x: number; y: number }, hostRect: DOMRect, wx: number, wy: number) {
    const x = (hostRect.width / 2) - (wx * vp.zoom);
    const y = (hostRect.height / 2) - (wy * vp.zoom);
    return { x, y, zoom: vp.zoom };
  }

  computeNewNodePosition(source: any | null, center: { x: number; y: number }): { x: number; y: number } {
    if (!source) return { x: center.x - 90, y: center.y - 60 };
    const p = source.point || { x: center.x - 90, y: center.y - 60 };
    return { x: p.x + 240, y: p.y + 40 };
  }

  findBestSourceNode(nodes: any[], wx: number, wy: number): any | null {
    try {
      let best: any = null;
      let bestDist = Infinity;
      for (const n of nodes || []) {
        const model = n?.data?.model;
        const outs = this.graph.outputIds(model, []);
        if (!outs || outs.length === 0) continue;
        const p = n?.point || { x: 0, y: 0 };
        const dx = (p.x - wx);
        const dy = (p.y - wy);
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) { best = n; bestDist = d2; }
      }
      return best;
    } catch { return null; }
  }

  findFreeOutputHandle(node: any, edges: Edge[], onlyNonError = true, errorNodes?: Set<string>, targetWorldX?: number): string | null {
    try {
      const model = node?.data?.model; const outs = this.graph.outputIds(model, edges) || [];
      if (!outs.length) return null;
      const used = new Set((edges || []).filter(e => String(e.source) === String(node.id)).map(e => String(e.sourceHandle ?? '')));
      const candidates = outs.filter(h => !used.has(String(h)));
      if (!candidates.length) return null;
      if (!onlyNonError) return candidates[0];
      const filtered = candidates.filter(h => String(h) !== 'err');
      if (!filtered.length) return null;
      if (typeof targetWorldX === 'number') {
        // Prefer handle index closest to target X if indices, else first
        const numeric = filtered.map(h => ({ h, i: /^\d+$/.test(String(h)) ? parseInt(String(h), 10) : NaN }));
        const valid = numeric.filter(x => Number.isFinite(x.i));
        if (valid.length) {
          valid.sort((a, b) => a.i - b.i);
          return valid[0].h;
        }
      }
      return filtered[0];
    } catch { return null; }
  }

  // Helpers for condition outputs
  getConditionItems(model: any): string[] {
    try {
      const field = model?.templateObj?.output_array_field || 'items';
      const arr: any[] = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      return arr.map((it, i) => (typeof it === 'object' && it && typeof it.name === 'string') ? it.name : (typeof it === 'string' ? it : String(i)));
    } catch { return []; }
  }
  getConditionItemsFull(model: any): Array<{ id: string; name: string }> {
    try {
      const field = model?.templateObj?.output_array_field || 'items';
      const arr: any[] = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      return arr.map((it, i) => {
        if (it && typeof it === 'object') {
          const id = String((it as any)._id || i);
          const name = typeof it.name === 'string' ? it.name : String(i);
          return { id, name };
        }
        return { id: String(i), name: typeof it === 'string' ? it : String(i) };
      });
    } catch { return []; }
  }

  ensureStableConditionIds(oldModel: any | undefined | null, model: any | undefined | null) {
    try {
      const tmpl = model?.templateObj;
      if (!tmpl || tmpl.type !== 'condition') return model;
      const field = tmpl.output_array_field || 'items';
      const newModel = JSON.parse(JSON.stringify(model || {}));
      const newArr: any[] = (newModel?.context && Array.isArray(newModel.context[field])) ? newModel.context[field] : [];
      const oldArr: any[] = (oldModel?.context && Array.isArray(oldModel.context?.[field])) ? oldModel.context[field] : [];
      const used = new Set<string>(newArr.map(it => (it && typeof it === 'object' && it._id) ? String(it._id) : '').filter(Boolean));
      for (let i = 0; i < Math.min(oldArr.length, newArr.length); i++) {
        const oldIt = oldArr[i];
        const newIt = newArr[i];
        if (!newIt || typeof newIt !== 'object') continue;
        if (newIt._id) continue;
        const oldId = oldIt && typeof oldIt === 'object' ? String(oldIt._id || '') : '';
        if (oldId && !used.has(oldId)) { newIt._id = oldId; used.add(oldId); }
      }
      const nameToIds = new Map<string, string[]>();
      for (let i = 0; i < oldArr.length; i++) {
        const it = oldArr[i];
        if (!(it && typeof it === 'object' && it._id)) continue;
        const name = it.name || (typeof it === 'string' ? it : '');
        const id = String(it._id);
        if (!nameToIds.has(name)) nameToIds.set(name, []);
        nameToIds.get(name)!.push(id);
      }
      for (const it of newArr) {
        if (!(it && typeof it === 'object') || it._id) continue;
        const name = it.name || '';
        const list = nameToIds.get(name) || [];
        while (list.length) {
          const candidate = list.shift()!;
          if (!used.has(candidate)) { (it as any)._id = candidate; used.add(candidate); break; }
        }
      }
      for (const it of newArr) {
        if (!(it && typeof it === 'object')) continue;
        if (!it._id) {
          let id = '';
          do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id));
          (it as any)._id = id; used.add(id);
        }
      }
      return newModel;
    } catch { return model; }
  }

  // Reconcile edges after a node model change (returns newEdges and ids removed)
  reconcileEdgesForNode(model: any, oldModel: any, edges: Edge[], computeEdgeLabel: (sourceId: string, handle: string) => string) {
    try {
      const nodeId = model?.id;
      if (!nodeId) return { edges, deletedEdgeIds: [] };
      const type = model?.templateObj?.type;
      const before = edges.length;
      let outEdges = edges.slice();

      if (type === 'condition') {
        const oldFull = this.getConditionItemsFull(oldModel);
        const full = this.getConditionItemsFull(model);
        const idSet = new Set(full.map(it => it.id));
        const nameToId = new Map<string, string>();
        full.forEach(it => { if (it.name && !nameToId.has(it.name)) nameToId.set(it.name, it.id); });
        const oldIdToName = new Map<string, string>();
        oldFull.forEach(it => oldIdToName.set(it.id, it.name));
        const oldIdSet = new Set(oldFull.map(it => it.id));
        const deletedIds = new Set<string>([...oldIdSet].filter(id => !idSet.has(id)));

        const deletedEdgeIds: string[] = [];
        outEdges = outEdges.reduce((acc: Edge[], e) => {
          if (String(e.source) !== String(nodeId)) { acc.push(e); return acc; }
          const handle = String(e.sourceHandle ?? '');
          let newHandle: string | null = null;
          if (handle && !/^\d+$/.test(handle)) {
            if (deletedIds.has(handle)) { deletedEdgeIds.push(e.id as any); return acc; }
            if (idSet.has(handle)) newHandle = handle; else {
              const oldName = oldIdToName.get(handle) || '';
              if (oldName && nameToId.has(oldName)) newHandle = nameToId.get(oldName)!;
            }
          } else {
            const oldIdx = /^\d+$/.test(handle) ? parseInt(handle, 10) : -1;
            if (oldIdx >= 0) {
              const oldName = (oldFull[oldIdx]?.name) || '';
              if (oldName && nameToId.has(oldName)) newHandle = nameToId.get(oldName)!;
              if (!newHandle && oldIdx < full.length) newHandle = full[oldIdx].id;
              if (!newHandle) {
                const oldIdAtIdx = oldFull[oldIdx]?.id;
                if (oldIdAtIdx && deletedIds.has(String(oldIdAtIdx))) { deletedEdgeIds.push(e.id as any); return acc; }
              }
            }
          }
          if (!newHandle) { acc.push(e); return acc; }
          const txt = computeEdgeLabel(nodeId, newHandle);
          const center = { type: 'html-template', data: { text: txt } } as any;
          const edgeLabels = { ...(e as any).edgeLabels, center } as any;
          const ne: Edge = { ...(e as any), sourceHandle: newHandle, id: `${e.source}->${e.target}:${newHandle}:${e.targetHandle}`, edgeLabels } as any;
          acc.push(ne);
          return acc;
        }, [] as Edge[]);
        return { edges: outEdges, deletedEdgeIds };
      }

      // Non-condition: remove edges to non-existent handles
      const newOut = (this.graph.outputIds(model, outEdges) || []).map((x: any) => String(x));
      const allowed = new Set(newOut);
      const updated = outEdges.filter(e => (String(e.source) !== String(nodeId)) || allowed.has(String(e.sourceHandle ?? '')));
      return { edges: updated, deletedEdgeIds: [] };
    } catch { return { edges, deletedEdgeIds: [] }; }
  }

  // Recompute error-branch propagation; returns updated edges styles and errorNodes set
  recomputeErrorPropagation(edges: Edge[]) {
    try {
      const adj = new Map<string, string[]>();
      for (const e of edges) {
        const s = String(e.source);
        const t = String(e.target);
        if (!adj.has(s)) adj.set(s, []);
        adj.get(s)!.push(t);
      }
      const next = new Set<string>();
      const queue: string[] = [];
      for (const e of edges) {
        if (String(e.sourceHandle) === 'err') {
          const t = String(e.target);
          if (!next.has(t)) { next.add(t); queue.push(t); }
        }
      }
      while (queue.length) {
        const n = queue.shift()!;
        const outs = adj.get(n) || [];
        for (const to of outs) {
          if (!next.has(to)) { next.add(to); queue.push(to); }
        }
      }
      const newEdges: Edge[] = (edges as any[]).map((e: any) => {
        const isErr = String(e.sourceHandle) === 'err' || next.has(String(e.source));
        const prevData = e.data || {};
        const baseWidth = (typeof prevData.__baseWidth === 'number') ? prevData.__baseWidth : (prevData.strokeWidth ?? 2);
        // Avoid capturing transient highlight blue as base color
        const computedBaseColor = (typeof prevData.__baseColor === 'string')
          ? prevData.__baseColor
          : (prevData.__taken ? '#b1b1b7' : (prevData.color ?? '#b1b1b7'));
        const isTaken = !!prevData.__taken; // preserve blue highlight if set by overlays
        const newData: any = { ...prevData };
        if (typeof newData.__baseWidth !== 'number') newData.__baseWidth = baseWidth;
        if (typeof newData.__baseColor !== 'string') newData.__baseColor = computedBaseColor;
        // If edge is currently highlighted as taken, do not mark as error nor override its blue color
        if (isTaken) {
          newData.__taken = true; // keep flag across recomputation
          newData.error = false;
          // keep stroke width at least 2 and color blue
          newData.strokeWidth = Math.max(2, Number(newData.strokeWidth ?? 2));
          newData.color = '#1677ff';
        } else if (isErr) {
          newData.error = true;
          newData.strokeWidth = 1;
          newData.color = '#f759ab';
        } else {
          newData.error = false;
          newData.strokeWidth = baseWidth;
          newData.color = newData.__baseColor;
        }
        return { ...e, data: newData } as Edge;
      });
      return { edges: newEdges, errorNodes: next };
    } catch { return { edges, errorNodes: new Set<string>() }; }
  }

  // Build a small default graph from available palette items
  buildDefaultGraphFromPalette(items: any[]): { nodes: any[]; edges: Edge[] } {
    try {
      const findByType = (t: string) => (items.find(it => it?.template?.type === t)?.template);
      const startT = findByType('start') || { id: 'tmpl_start', name: 'Start', type: 'start', title: 'Start', subtitle: 'Trigger', icon: 'fa-solid fa-play', args: {} };
      const condT = findByType('condition') || { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: {}, output_array_field: 'items' };
      const functionItems = items.filter(it => it?.template?.type === 'function').map(it => it.template);
      const fnT1 = functionItems[0] || { id: 'tmpl_fn1', name: 'Function', type: 'function', icon: 'fa-solid fa-cog', title: 'Function', subtitle: 'Step', output: [], args: {} };
      const fnT2 = functionItems[1] || { id: 'tmpl_fn2', name: 'Function 2', type: 'function', icon: 'fa-solid fa-bolt', title: 'Function 2', subtitle: 'Step', output: [], args: {} };

      const startModel = { id: 'node_start', name: startT.name || 'Start', template: startT.id, templateObj: startT, context: {} };
      const fn1Model = { id: 'node_fn1', name: fnT1.name || 'Function', template: fnT1.id, templateObj: fnT1, context: {} };
      const fn2Model: any = { id: 'node_fn2', name: fnT2.name || 'Function', template: fnT2.id, templateObj: fnT2, context: {} };
      try { if (fnT2?.authorize_catch_error) fn2Model.catch_error = true; } catch { }
      const condModel = { id: 'node_cond', name: condT.name || 'Condition', template: condT.id, templateObj: condT, context: { items: [{ name: 'A', condition: '' }, { name: 'B', condition: '' }, { name: 'C', condition: '' }] } } as any;

      const startVNode = { id: startModel.id, point: { x: 380, y: 140 }, type: 'html-template', data: { model: startModel } };
      const fn1VNode = { id: fn1Model.id, point: { x: 180, y: 320 }, type: 'html-template', data: { model: fn1Model } };
      const fn2VNode = { id: fn2Model.id, point: { x: 380, y: 320 }, type: 'html-template', data: { model: fn2Model } };
      const condVNode = { id: condModel.id, point: { x: 600, y: 320 }, type: 'html-template', data: { model: condModel } };
      const nodes = [startVNode, fn1VNode, fn2VNode, condVNode];
      const edge1: Edge = {
        type: 'template', id: `${startModel.id}->${fn2Model.id}:out:in`, source: startModel.id, target: fn2Model.id,
        sourceHandle: 'out' as any, targetHandle: 'in' as any,
        edgeLabels: { center: { type: 'html-template', data: { text: this.graph.computeEdgeLabel(startModel.id, 'out', nodes) } } } as any,
        data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } as any
      } as any;
      const edge2: Edge = {
        type: 'template', id: `${startModel.id}->${fn1Model.id}:out:in`, source: startModel.id, target: fn1Model.id,
        sourceHandle: 'out' as any, targetHandle: 'in' as any,
        edgeLabels: { center: { type: 'html-template', data: { text: this.graph.computeEdgeLabel(startModel.id, 'out', nodes) } } } as any,
        data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } as any
      } as any;
      return { nodes, edges: [edge1, edge2] };
    } catch { return { nodes: [], edges: [] } }
  }

  // ===== Checksums (stable stringify + 32-bit hash) =====
  private stableStringify(obj: any): string {
    const seen = new WeakSet();
    const sort = (x: any): any => {
      if (x === null || typeof x !== 'object') return x;
      if (seen.has(x)) return undefined; // drop cycles
      seen.add(x);
      if (Array.isArray(x)) return x.map(sort);
      const out: any = {};
      Object.keys(x).sort().forEach(k => { out[k] = sort(x[k]); });
      return out;
    };
    try { return JSON.stringify(sort(obj)); } catch { return JSON.stringify(obj || {}); }
  }
  argsChecksum(args: any): string {
    const str = this.stableStringify(args || {});
    // DJB2 32-bit
    let h = 5381 >>> 0;
    for (let i = 0; i < str.length; i++) { h = (((h << 5) + h) + str.charCodeAt(i)) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  // Compute a short signature for template feature flags that affect node behavior
  featureChecksum(tpl: any): string {
    try {
      const a = !!(tpl && tpl.authorize_catch_error);
      const s = !!(tpl && (tpl as any).authorize_skip_error);
      // pack two booleans into a short string
      return (a ? '1' : '0') + (s ? '1' : '0');
    } catch { return '00'; }
  }
}
