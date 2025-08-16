import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export type FlowSummary = { id: string; name: string; description?: string };
export type FlowDoc = { id: string; name: string; nodes?: any[]; edges?: any[]; meta?: any; description?: string };

export type FormSummary = { id: string; name: string; description?: string };
export type FormDoc = { id: string; name: string; schema?: any; description?: string };

export type NodeTemplate = { id: string; type: 'start'|'function'|'condition'|'loop'|'end'; name: string; category?: string; description?: string; args?: any; output?: string[]; authorize_catch_error?: boolean };

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private static readonly LATENCY = 0; // simulate HTTP latency (ms); set to 0 for instant UX
  private FLOW_LIST_KEY = 'catalog.flows';
  private FLOW_DOC_KEY = 'catalog.flow.'; // + id
  private FORM_LIST_KEY = 'catalog.forms';
  private FORM_DOC_KEY = 'catalog.form.'; // + id
  private TPL_LIST_KEY = 'catalog.nodeTemplates';

  constructor() { this.ensureSeed(); }

  // ===== Public API (Flows)
  listFlows(): Observable<FlowSummary[]> { return of(this.load<FlowSummary[]>(this.FLOW_LIST_KEY, [])).pipe(delay(CatalogService.LATENCY)); }
  getFlow(id: string): Observable<FlowDoc> {
    const doc = this.load<FlowDoc | null>(this.FLOW_DOC_KEY + id, null);
    return doc ? of(doc).pipe(delay(CatalogService.LATENCY)) : throwError(() => new Error('Flow not found'));
  }
  saveFlow(doc: FlowDoc): Observable<FlowDoc> {
    if (!doc?.id) return throwError(() => new Error('Missing id'));
    this.save(this.FLOW_DOC_KEY + doc.id, doc);
    const list = this.load<FlowSummary[]>(this.FLOW_LIST_KEY, []);
    const idx = list.findIndex(x => x.id === doc.id);
    const summary: FlowSummary = { id: doc.id, name: doc.name || doc.id, description: doc.description };
    if (idx >= 0) list[idx] = summary; else list.push(summary);
    this.save(this.FLOW_LIST_KEY, list);
    return of(doc).pipe(delay(CatalogService.LATENCY));
  }

  // ===== Public API (Forms)
  listForms(): Observable<FormSummary[]> { return of(this.load<FormSummary[]>(this.FORM_LIST_KEY, [])).pipe(delay(CatalogService.LATENCY)); }
  getForm(id: string): Observable<FormDoc> {
    const doc = this.load<FormDoc | null>(this.FORM_DOC_KEY + id, null);
    return doc ? of(doc).pipe(delay(CatalogService.LATENCY)) : throwError(() => new Error('Form not found'));
    }
  saveForm(doc: FormDoc): Observable<FormDoc> {
    if (!doc?.id) return throwError(() => new Error('Missing id'));
    this.save(this.FORM_DOC_KEY + doc.id, doc);
    const list = this.load<FormSummary[]>(this.FORM_LIST_KEY, []);
    const idx = list.findIndex(x => x.id === doc.id);
    const summary: FormSummary = { id: doc.id, name: doc.name || doc.id, description: doc.description };
    if (idx >= 0) list[idx] = summary; else list.push(summary);
    this.save(this.FORM_LIST_KEY, list);
    return of(doc).pipe(delay(CatalogService.LATENCY));
  }

  // ===== Public API (Node Templates)
  listNodeTemplates(): Observable<NodeTemplate[]> { return of(this.load<NodeTemplate[]>(this.TPL_LIST_KEY, [])).pipe(delay(CatalogService.LATENCY)); }
  getNodeTemplate(id: string): Observable<NodeTemplate | undefined> {
    const list = this.load<NodeTemplate[]>(this.TPL_LIST_KEY, []);
    return of(list.find(x => x.id === id)).pipe(delay(CatalogService.LATENCY));
  }
  saveNodeTemplate(tpl: NodeTemplate): Observable<NodeTemplate> {
    if (!tpl?.id) return throwError(() => new Error('Missing id'));
    const list = this.load<NodeTemplate[]>(this.TPL_LIST_KEY, []);
    const idx = list.findIndex(x => x.id === tpl.id);
    if (idx >= 0) list[idx] = tpl; else list.push(tpl);
    this.save(this.TPL_LIST_KEY, list);
    return of(tpl).pipe(delay(CatalogService.LATENCY));
  }

  // ===== Helpers (seed, storage)
  private ensureSeed() {
    try {
      if (!this.load<any>(this.FLOW_LIST_KEY, null)) {
        const flows: FlowSummary[] = [
          { id: 'demo-1', name: 'Demo: Envoi d\'email', description: 'Start → SendMail → Condition' },
          { id: 'demo-2', name: 'Demo: HTTP + Condition', description: 'Start → HTTP → Condition' },
        ];
        this.save(this.FLOW_LIST_KEY, flows);
        // Seed minimal docs
        flows.forEach((f, i) => this.save(this.FLOW_DOC_KEY + f.id, { id: f.id, name: f.name, description: f.description, nodes: [], edges: [], meta: { demo: true, idx: i } } as FlowDoc));
      }
      if (!this.load<any>(this.FORM_LIST_KEY, null)) {
        const forms: FormSummary[] = [
          { id: 'form-1', name: 'Demande de congés', description: 'Formulaire simple' },
          { id: 'form-2', name: 'Onboarding', description: 'Wizard avec étapes' },
        ];
        this.save(this.FORM_LIST_KEY, forms);
        forms.forEach((f, i) => this.save(this.FORM_DOC_KEY + f.id, { id: f.id, name: f.name, description: f.description, schema: { title: f.name, fields: [] } } as FormDoc));
      }
      if (!this.load<any>(this.TPL_LIST_KEY, null)) {
        const tpls: NodeTemplate[] = [
          { id: 'tmpl_start', type: 'start', name: 'Start', description: 'Début du flow' },
          { id: 'tmpl_action', type: 'function', name: 'Action', category: 'Core', description: 'Étape générique', output: ['Succes'] },
          { id: 'tmpl_condition', type: 'condition', name: 'Condition', description: 'Branches multiples via items' },
          { id: 'tmpl_loop', type: 'loop', name: 'Loop', description: 'Itération' },
        ];
        this.save(this.TPL_LIST_KEY, tpls);
      }
    } catch {}
  }

  private load<T>(key: string, fallback: T): T {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
  }
  private save(key: string, value: any) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
}
