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
        if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
          // Only real outputs (exclude link handles which declare accepts/arrayField)
          return (tmpl.outputHandles as any[])
            .filter((h:any) => !Array.isArray(h?.accepts) && !h?.arrayField)
            .map((h:any) => String(h.id));
        }
        return ['out'];
      case 'loop': {
        // Prefer declared v2 handles on the template
        if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
          return (tmpl.outputHandles as any[])
            .filter((h:any) => !Array.isArray(h?.accepts) && !h?.arrayField)
            .map((h:any) => String(h.id));
        }
        // Fallback to standard loop handles
        return ['each', 'after'];
      }
      case 'condition': {
        const field = tmpl.output_array_field || 'items';
        const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const ids = arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && !ids.includes(elseId)) ids.push(elseId);
        } catch {}
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
      default: {
        // Dynamic outputs: function with output_array_field (like condition but for functions)
        const dynField = tmpl.output_array_field;
        if (dynField) {
          const arr = (model?.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];
          const ids = arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
          try {
            const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
            if (elseId && !ids.includes(elseId)) ids.push(elseId);
          } catch {}
          const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
          const base = enableCatch ? ['err', ...ids] : ids;
          try {
            const connected = (edges || [])
              .filter(e => String(e.source) === String(model.id))
              .map(e => String(e.sourceHandle ?? ''))
              .filter(h => !!h);
            return Array.from(new Set([...base, ...connected]));
          } catch { return base; }
        }
        if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
          const ids = (tmpl.outputHandles as any[])
            .filter((h:any) => !Array.isArray(h?.accepts) && !h?.arrayField)
            .map((h:any) => String(h.id));
          const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
          return enableCatch ? ['err', ...ids] : ids;
        }
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
      if (typeof idxOrId === 'string' && idxOrId === 'err') return 'Error';
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Success'];
      if ((tmpl.type === 'start' || tmpl.type === 'start_form' || tmpl.type === 'event' || tmpl.type === 'endpoint') && String(idxOrId) === 'out') return 'Success';
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
        if (it) return (typeof it === 'object') ? (it.name ?? '') : String(it);
        // Else branch label
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && String(idxOrId) === elseId) return 'Else';
        } catch {}
        return '';
      }
      // Dynamic outputs for functions with output_array_field
      const dynField = tmpl.output_array_field;
      if (dynField && tmpl.type !== 'condition') {
        const arr = (model.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx as number];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? String(idx));
          return String(idx);
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(idxOrId));
        if (it) return (typeof it === 'object') ? (it.name ?? '') : String(it);
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && String(idxOrId) === elseId) return 'Else';
        } catch {}
        return '';
      }
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
        // Back-compat for legacy loop handle ids
        if (tmpl.type === 'loop'){
          const legacy = String(idxOrId);
          if (legacy === 'loop_start') return 'Each';
          if (legacy === 'loop_end' || legacy === 'end') return 'After';
        }
        const h = (tmpl.outputHandles as any[])
          .filter((x:any) => !Array.isArray(x?.accepts) && !x?.arrayField)
          .find((hh:any) => String(hh.id) === String(idxOrId));
        return h?.name || '';
      }
      if (Number.isFinite(idx) && idx >= 0 && idx < outs.length) return outs[idx];
      return '';
    } catch { return ''; }
  }

  // Human-readable name for an input handle
  getInputName(model: any, id: string): string {
    try {
      const tmpl = model?.templateObj || {};
      const arr: any[] = Array.isArray(tmpl.inputHandles) ? (tmpl.inputHandles as any[]) : [];
      if (arr.length) {
        const h = arr.find((hh:any) => String(hh.id) === String(id));
        return h?.name || '';
      }
      // Default single input id is 'in'
      if (String(id) === 'in') return 'In';
      return '';
    } catch { return ''; }
  }

  // Compute label for an edge from source and handle, using current nodes
  computeEdgeLabel(sourceId: string, sourceHandle: any, nodes: any[]): string {
    try {
      const src = (nodes || []).find(n => String(n.id) === String(sourceId));
      const model = src?.data?.model;
      const tmpl = model?.templateObj || {};
      const names: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Success'];
      if (sourceHandle === 'err') return 'Error';
      if (tmpl.type === 'start' || tmpl.type === 'start_form' || tmpl.type === 'event' || tmpl.type === 'endpoint') return 'Success';
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
        if (it) return (typeof it === 'object') ? (it.name ?? '') : '';
        // Else branch label
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && String(sourceHandle) === elseId) return 'Else';
        } catch {}
        return '';
      }
      // Dynamic outputs for functions with output_array_field
      const dynField = tmpl.output_array_field;
      if (dynField && tmpl.type !== 'condition') {
        const arr = (model?.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? '');
          return '';
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(sourceHandle));
        if (it) return (typeof it === 'object') ? (it.name ?? '') : '';
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && String(sourceHandle) === elseId) return 'Else';
        } catch {}
        return '';
      }
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
        // Back-compat for legacy loop handle ids
        if (tmpl.type === 'loop'){
          const legacy = String(sourceHandle);
          if (legacy === 'loop_start') return 'Each';
          if (legacy === 'loop_end' || legacy === 'end') return 'After';
        }
        const h = (tmpl.outputHandles as any[])
          .filter((x:any) => !Array.isArray(x?.accepts) && !x?.arrayField)
          .find((hh:any) => String(hh.id) === String(sourceHandle));
        return h?.name || '';
      }
      if (Array.isArray(names) && Number.isFinite(idx) && idx >= 0 && idx < names.length) return names[idx];
      if (Array.isArray(names) && names.length === 1) return names[0] || 'Succes';
      return '';
    } catch { return ''; }
  }
}
