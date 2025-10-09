import { Injectable } from '@angular/core';
import { Edge } from 'ngx-vflow';

@Injectable({ providedIn: 'root' })
export class FlowGraphService {
  // Compute output handle ids for a model, optionally preserving connected handles
  outputIds(model: any, edges: Edge[]): string[] {
    const tmpl = model?.templateObj || {};
    switch (tmpl.type) {
      case 'end': return [];
      case 'start':
      case 'start_form':
      case 'event':
      case 'endpoint':
        return ['out'];
      case 'loop': return ['loop_start', 'loop_end', 'end'];
      case 'condition': {
        const field = tmpl.output_array_field || 'items';
        const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const ids = arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
        try {
          const connected = (edges || [])
            .filter(e => String(e.source) === String(model.id))
            .map(e => String(e.sourceHandle ?? ''))
            .filter(h => !!h);
          return Array.from(new Set([...ids, ...connected]));
        } catch {
          return ids;
        }
      }
      case 'function':
      default: {
        const outs: string[] | undefined = Array.isArray(tmpl.output) ? tmpl.output : undefined;
        const n = (outs && outs.length) ? outs.length : 1;
        const base = Array.from({ length: n }, (_, i) => String(i));
        const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
        return enableCatch ? ['err', ...base] : base;
      }
    }
  }

  // Human-readable name for an output handle
  getOutputName(model: any, idxOrId: number | string): string {
    try {
      const tmpl = model?.templateObj || {};
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      if (typeof idxOrId === 'string' && idxOrId === 'err') return 'Error';
      if ((tmpl.type === 'start' || tmpl.type === 'start_form' || tmpl.type === 'event' || tmpl.type === 'endpoint') && String(idxOrId) === 'out') return 'Succes';
      const idx = (typeof idxOrId === 'string' && /^\d+$/.test(idxOrId)) ? parseInt(idxOrId, 10) : (typeof idxOrId === 'number' ? idxOrId : NaN);
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx as number];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? String(idx));
          return String(idx);
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(idxOrId));
        if (!it) return '';
        return (typeof it === 'object') ? (it.name ?? '') : String(it);
      }
      if (Number.isFinite(idx) && idx >= 0 && idx < outs.length) return outs[idx];
      return '';
    } catch { return ''; }
  }

  // Compute label for an edge from source and handle, using current nodes
  computeEdgeLabel(sourceId: string, sourceHandle: any, nodes: any[]): string {
    try {
      const src = (nodes || []).find(n => String(n.id) === String(sourceId));
      const model = src?.data?.model;
      const tmpl = model?.templateObj || {};
      const names: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      if (sourceHandle === 'err') return 'Error';
      if (tmpl.type === 'start' || tmpl.type === 'start_form' || tmpl.type === 'event' || tmpl.type === 'endpoint') return 'Succes';
      const idx = sourceHandle != null && /^\d+$/.test(String(sourceHandle)) ? parseInt(String(sourceHandle), 10) : NaN;
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? '');
          return '';
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(sourceHandle));
        if (!it) return '';
        return (typeof it === 'object') ? (it.name ?? '') : '';
      }
      if (Array.isArray(names) && Number.isFinite(idx) && idx >= 0 && idx < names.length) return names[idx];
      if (Array.isArray(names) && names.length === 1) return names[0] || 'Succes';
      return '';
    } catch { return ''; }
  }
}
