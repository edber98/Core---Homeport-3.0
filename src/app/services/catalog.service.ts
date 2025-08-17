import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export type FlowSummary = { id: string; name: string; description?: string };
export type FlowDoc = { id: string; name: string; nodes?: any[]; edges?: any[]; meta?: any; description?: string };

export type FormSummary = { id: string; name: string; description?: string };
export type FormDoc = { id: string; name: string; schema?: any; description?: string };

export type NodeTemplate = {
  id: string;
  type: 'start'|'function'|'condition'|'loop'|'end';
  name: string;
  category?: string;      // fonctionnel (Email, Docs, Calendar...)
  appId?: string;         // logiciel / intégration (ex: 'gmail')
  tags?: string[];        // recherche libre
  group?: string;         // grouping UI facultatif
  description?: string;
  args?: any;
  output?: string[];
  authorize_catch_error?: boolean;
};

export type AppProvider = {
  id: string;             // ex: 'gmail'
  name: string;           // ex: 'Gmail'
  title?: string;         // affichage alternatif
  iconClass?: string;     // ex: 'fa-brands fa-google'
  iconUrl?: string;       // PNG/SVG
  color?: string;         // brand color
  tags?: string[];        // recherche
};

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private static readonly LATENCY = 0; // simulate HTTP latency (ms); set to 0 for instant UX
  private FLOW_LIST_KEY = 'catalog.flows';
  private FLOW_DOC_KEY = 'catalog.flow.'; // + id
  private FORM_LIST_KEY = 'catalog.forms';
  private FORM_DOC_KEY = 'catalog.form.'; // + id
  private TPL_LIST_KEY = 'catalog.nodeTemplates';
  private APP_LIST_KEY = 'catalog.apps';

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

  // ===== Public API (Apps / Providers)
  listApps(): Observable<AppProvider[]> { return of(this.load<AppProvider[]>(this.APP_LIST_KEY, [])).pipe(delay(CatalogService.LATENCY)); }
  getApp(id: string): Observable<AppProvider | undefined> {
    const list = this.load<AppProvider[]>(this.APP_LIST_KEY, []);
    return of(list.find(x => x.id === id)).pipe(delay(CatalogService.LATENCY));
  }
  saveApp(app: AppProvider): Observable<AppProvider> {
    if (!app?.id) return throwError(() => new Error('Missing id'));
    const list = this.load<AppProvider[]>(this.APP_LIST_KEY, []);
    const idx = list.findIndex(x => x.id === app.id);
    if (idx >= 0) list[idx] = app; else list.push(app);
    this.save(this.APP_LIST_KEY, list);
    return of(app).pipe(delay(CatalogService.LATENCY));
  }
  deleteApp(id: string): Observable<boolean> {
    const list = this.load<AppProvider[]>(this.APP_LIST_KEY, []);
    const next = list.filter(x => x.id !== id);
    this.save(this.APP_LIST_KEY, next);
    return of(true).pipe(delay(CatalogService.LATENCY));
  }

  // ===== Admin / Settings
  resetAll(): Observable<boolean> {
    try {
      localStorage.removeItem(this.FLOW_LIST_KEY);
      localStorage.removeItem(this.FORM_LIST_KEY);
      localStorage.removeItem(this.TPL_LIST_KEY);
      localStorage.removeItem(this.APP_LIST_KEY);
      // Also clear individual docs we may have stored during sessions
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(this.FLOW_DOC_KEY) || k.startsWith(this.FORM_DOC_KEY)) localStorage.removeItem(k);
      });
      this.ensureSeed(true);
      return of(true).pipe(delay(CatalogService.LATENCY));
    } catch {
      return of(false).pipe(delay(CatalogService.LATENCY));
    }
  }

  // ===== Export / Import
  exportData(): Observable<string> {
    try {
      const flows = this.load<FlowSummary[]>(this.FLOW_LIST_KEY, []);
      const forms = this.load<FormSummary[]>(this.FORM_LIST_KEY, []);
      const templates = this.load<NodeTemplate[]>(this.TPL_LIST_KEY, []);
      const apps = this.load<AppProvider[]>(this.APP_LIST_KEY, []);
      // Collect docs by scanning storage to be robust even if lists are outdated
      const flowDocs: Record<string, FlowDoc> = {};
      const formDocs: Record<string, FormDoc> = {};
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(this.FLOW_DOC_KEY)) {
          const id = k.slice(this.FLOW_DOC_KEY.length);
          const doc = this.load<FlowDoc | null>(k, null);
          if (doc && id) flowDocs[id] = doc;
        }
        if (k.startsWith(this.FORM_DOC_KEY)) {
          const id = k.slice(this.FORM_DOC_KEY.length);
          const doc = this.load<FormDoc | null>(k, null);
          if (doc && id) formDocs[id] = doc;
        }
      });
      const payload = {
        kind: 'homeport-catalog',
        version: 1,
        exportedAt: new Date().toISOString(),
        flows,
        flowDocs,
        forms,
        formDocs,
        templates,
        apps,
      } as const;
      return of(JSON.stringify(payload, null, 2)).pipe(delay(CatalogService.LATENCY));
    } catch {
      return throwError(() => new Error('Export failed'));
    }
  }

  importData(data: any, mode: 'replace' | 'merge' = 'replace'): Observable<boolean> {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      if (!payload || typeof payload !== 'object') return throwError(() => new Error('Invalid payload'));
      const flows = Array.isArray(payload.flows) ? payload.flows as FlowSummary[] : [];
      const forms = Array.isArray(payload.forms) ? payload.forms as FormSummary[] : [];
      const templates = Array.isArray(payload.templates) ? payload.templates as NodeTemplate[] : [];
      const apps = Array.isArray(payload.apps) ? payload.apps as AppProvider[] : [];
      const flowDocs = (payload.flowDocs && typeof payload.flowDocs === 'object') ? payload.flowDocs as Record<string, FlowDoc> : {};
      const formDocs = (payload.formDocs && typeof payload.formDocs === 'object') ? payload.formDocs as Record<string, FormDoc> : {};

      if (mode === 'replace') {
        // Clear all known keys
        localStorage.removeItem(this.FLOW_LIST_KEY);
        localStorage.removeItem(this.FORM_LIST_KEY);
        localStorage.removeItem(this.TPL_LIST_KEY);
        localStorage.removeItem(this.APP_LIST_KEY);
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(this.FLOW_DOC_KEY) || k.startsWith(this.FORM_DOC_KEY)) localStorage.removeItem(k);
        });
      }
      // Save lists
      this.save(this.FLOW_LIST_KEY, flows);
      this.save(this.FORM_LIST_KEY, forms);
      this.save(this.TPL_LIST_KEY, templates);
      this.save(this.APP_LIST_KEY, apps);
      // Save docs
      Object.keys(flowDocs || {}).forEach(id => this.save(this.FLOW_DOC_KEY + id, flowDocs[id]));
      Object.keys(formDocs || {}).forEach(id => this.save(this.FORM_DOC_KEY + id, formDocs[id]));
      return of(true).pipe(delay(CatalogService.LATENCY));
    } catch (e) {
      return throwError(() => new Error('Import failed'));
    }
  }

  // ===== Helpers (seed, storage)
  private ensureSeed(force = false) {
    try {
      if (force || !this.load<any>(this.FLOW_LIST_KEY, null)) {
        const flows: FlowSummary[] = [
          { id: 'demo-1', name: 'Demo: Envoi d\'email', description: 'Start → SendMail → Condition' },
          { id: 'demo-2', name: 'Demo: HTTP + Condition', description: 'Start → HTTP → Condition' },
        ];
        this.save(this.FLOW_LIST_KEY, flows);
        // Seed minimal docs
        flows.forEach((f, i) => this.save(this.FLOW_DOC_KEY + f.id, { id: f.id, name: f.name, description: f.description, nodes: [], edges: [], meta: { demo: true, idx: i } } as FlowDoc));
      }
      if (force || !this.load<any>(this.FORM_LIST_KEY, null)) {
        const forms: FormSummary[] = [
          { id: 'form-1', name: 'Demande de congés', description: 'Formulaire simple' },
          { id: 'form-2', name: 'Onboarding', description: 'Wizard avec étapes' },
        ];
        this.save(this.FORM_LIST_KEY, forms);
        forms.forEach((f, i) => this.save(this.FORM_DOC_KEY + f.id, { id: f.id, name: f.name, description: f.description, schema: { title: f.name, fields: [] } } as FormDoc));
      }
      if (force || !this.load<any>(this.TPL_LIST_KEY, null)) {
        // Seed derived from Flow Builder palette
        const tpls: NodeTemplate[] = [
          { id: 'tmpl_start', type: 'start', name: 'Start', category: 'Core', description: 'Début du flow' },
          { id: 'tmpl_condition', type: 'condition', name: 'Condition', category: 'Logic', description: 'Branches multiples via items', args: { title: 'Conditions', fields: [] } },
          { id: 'tmpl_loop', type: 'loop', name: 'Loop', category: 'Core', description: 'Itération' },
          { id: 'tmpl_action', type: 'function', name: 'Action', category: 'Core', description: 'Étape générique', output: ['Success'], authorize_catch_error: true },
          { id: 'tmpl_sendmail', type: 'function', name: 'SendMail', category: 'Email', appId: 'gmail', description: 'Envoyer un email via Gmail', output: ['Success'], authorize_catch_error: true, tags: ['email','gmail'], group: 'Functions' },
          { id: 'tmpl_http', type: 'function', name: 'HTTP Request', category: 'HTTP', description: 'Appeler une API HTTP', output: ['Success'], authorize_catch_error: true, tags: ['http','api'], group: 'Functions' },
          { id: 'tmpl_slack_post', type: 'function', name: 'Slack Post', category: 'Chat', appId: 'slack', description: 'Poster un message Slack', output: ['Success'], authorize_catch_error: true, tags: ['slack','chat'], group: 'Functions' },
          { id: 'tmpl_delay', type: 'function', name: 'Delay', category: 'Core', description: 'Attendre un délai', output: ['Success'], authorize_catch_error: true, tags: ['time','delay'], group: 'Functions' },
          { id: 'tmpl_math_add', type: 'function', name: 'Math Add', category: 'Math', description: 'Additionner', output: ['Success'], tags: ['math'], group: 'Functions' },
          { id: 'tmpl_text_upper', type: 'function', name: 'Text Uppercase', category: 'Text', description: 'Mettre en majuscules', output: ['Success'], tags: ['text'], group: 'Functions' },
          { id: 'tmpl_pdf', type: 'function', name: 'PDF', category: 'Docs', appId: 'pdf', description: 'Générer un PDF', output: ['Success'], tags: ['pdf','document'], group: 'Functions' },
        ];
        this.save(this.TPL_LIST_KEY, tpls);
      }
      if (force || !this.load<any>(this.APP_LIST_KEY, null)) {
        const apps: AppProvider[] = [
          { id: 'gmail', name: 'Gmail', iconClass: 'fa-solid fa-envelope', color: '#EA4335', tags: ['email','google'] },
          { id: 'slack', name: 'Slack', iconClass: 'fa-brands fa-slack', color: '#611f69', tags: ['chat','team'] },
          { id: 'pdf', name: 'PDF', iconClass: 'fa-solid fa-file-pdf', color: '#D32F2F', tags: ['document'] },
          { id: 'word', name: 'Word', iconClass: 'fa-solid fa-file-word', color: '#2B579A', tags: ['document','office'] },
        ];
        this.save(this.APP_LIST_KEY, apps);
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
