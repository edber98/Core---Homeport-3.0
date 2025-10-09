import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FlowPathHighlightService {
  // Build a set of "source->target" pairs from events and attempts
  buildPairs(opts: { events?: any[]; attempts?: any[]; explicitPairs?: Set<string> | string[] }): Set<string> {
    const out = new Set<string>();
    const { events, attempts, explicitPairs } = opts || {} as any;
    if (explicitPairs && (explicitPairs as any).size ? (explicitPairs as Set<string>).size > 0 : Array.isArray(explicitPairs) && explicitPairs.length > 0) {
      const src = (explicitPairs instanceof Set) ? Array.from(explicitPairs) : (explicitPairs as string[]);
      for (const p of src) { if (p && typeof p === 'string') out.add(p); }
      return out;
    }
    if (events && Array.isArray(events) && events.length) {
      for (const ev of events) {
        const t = (ev?.type || ev?.eventType);
        if (t !== 'edge.taken') continue;
        const s = String(ev?.data?.sourceId || ev?.sourceId || '');
        const d = String(ev?.data?.targetId || ev?.targetId || '');
        if (s && d && s !== d) out.add(`${s}->${d}`);
      }
      if (out.size > 0) return out;
    }
    if (attempts && Array.isArray(attempts) && attempts.length) {
      for (let i = 1; i < attempts.length; i++) {
        const prev = String(attempts[i - 1]?.nodeId || '');
        const cur = String(attempts[i]?.nodeId || '');
        if (prev && cur && prev !== cur) out.add(`${prev}->${cur}`);
      }
    }
    return out;
  }

  // Return a new edges array with coloring applied per pairs
  decorateEdges(baseEdges: any[], pairs: Set<string>): any[] {
    const BLUE = '#1677ff';
    const GREY = '#b1b1b7';
    return (baseEdges || []).map((e: any) => {
      const took = pairs.has(`${e.source}->${e.target}`);
      const data = { ...(e.data || {}) } as any;
      const end = { ...(e.markers?.end || {}) } as any;
      if (took) {
        data.__taken = true;
        data.error = false;
        data.strokeWidth = 2;
        data.color = BLUE;
        end.type = end.type || 'arrow-closed';
        end.color = BLUE;
      } else {
        delete data.__taken;
        if (data.__baseColor === BLUE) data.__baseColor = GREY;
        if (data.color === BLUE) data.color = GREY;
        if ((data.strokeWidth || 0) > 2) data.strokeWidth = 2;
        if (end.color === BLUE) end.color = GREY;
        end.type = end.type || 'arrow-closed';
      }
      return { ...e, data, markers: { ...(e.markers || {}), end } };
    });
  }

  // Mutate edges in place (keep Vflow entity identity) with coloring per pairs
  applyHighlightsInPlace(edges: any[], pairs: Set<string>): void {
    const BLUE = '#1677ff';
    const GREY = '#b1b1b7';
    (edges || []).forEach((e: any) => {
      const took = pairs.has(`${e.source}->${e.target}`);
      const data = e.data || (e.data = {} as any);
      const end = (e.markers && e.markers.end) ? e.markers.end : {};
      if (took) {
        data.__taken = true;
        data.error = false;
        data.strokeWidth = 2;
        data.color = BLUE;
        const endType = (end && end.type) || 'arrow-closed';
        e.markers = { ...(e.markers || {}), end: { ...end, type: endType, color: BLUE } };
      } else {
        if (data.__taken) delete data.__taken;
        if (data.__baseColor === BLUE) data.__baseColor = GREY;
        if (data.color === BLUE) data.color = GREY;
        if ((data.strokeWidth || 0) > 2) data.strokeWidth = 2;
        if (end && end.color === BLUE) {
          const endType = (end && end.type) || 'arrow-closed';
          e.markers = { ...(e.markers || {}), end: { ...end, type: endType, color: GREY } };
        }
      }
    });
  }
}
