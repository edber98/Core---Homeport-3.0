import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export type FlowSummary = { id: string; name: string; description?: string };
export type FlowDoc = { id: string; name: string; nodes?: any[]; edges?: any[]; meta?: any; description?: string };

export type FormSummary = { id: string; name: string; description?: string };
export type FormDoc = { id: string; name: string; schema?: any; description?: string };

export type NodeTemplate = {
  id: string;
  type: 'start' | 'function' | 'condition' | 'loop' | 'end';
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
          { id: 'demo-1', name: 'Demo: Envoi d\'email', description: 'Start → SendMail' },
          { id: 'demo-2', name: 'Demo: HTTP + Condition', description: 'Start → HTTP → Condition' },
        ];
        this.save(this.FLOW_LIST_KEY, flows);
        // Seed demo graphs (with minimal template objects for preview/labels)
        const startTpl: any = { id: 'tmpl_start', type: 'start', name: 'Start', title: 'Start', subtitle: 'Trigger', category: 'Core' };
        const sendTpl: any = {
          id: 'tmpl_sendmail', type: 'function', name: 'SendMail', title: 'Send mail', subtitle: 'Gmail', category: 'Email', output: ['Success'], authorize_catch_error: true,
          args: {
            title: 'Send mail', ui: { layout: 'vertical' }, fields: [
              { type: 'text', key: 'dest', label: 'Destinataire', col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, default: '', expression: { allow: true }, validators: [{ type: 'required' }] },
              { type: 'text', key: 'subject', label: 'Sujet', col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, default: '', expression: { allow: true }, validators: [{ type: 'required' }] },
              { type: 'textarea', key: 'message', label: 'Message', col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, default: '', expression: { allow: true } },
              { type: 'checkbox', key: 'acr', label: 'Accusé de réception', col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, default: false }
            ]
          }
        };
        const httpTpl: any = {
          id: 'tmpl_http', type: 'function', name: 'HTTP Request', title: 'HTTP Request', subtitle: 'Call API', category: 'HTTP', output: ['Success'], authorize_catch_error: true,
          args: { title: 'HTTP Request', ui: { layout: 'vertical' }, fields: [
            { type: 'text', key: 'url', label: 'URL', col: { xs: 24 }, default: 'https://api.example.com', expression: { allow: true } },
            { type: 'select', key: 'method', label: 'Method', options: [{label:'GET',value:'GET'},{label:'POST',value:'POST'},{label:'PUT',value:'PUT'},{label:'DELETE',value:'DELETE'}], col: { xs: 24 }, default: 'GET' },
            { type: 'textarea', key: 'body', label: 'Body', col: { xs: 24 }, default: '', expression: { allow: true } }
          ] }
        };
        const condTpl: any = {
          id: 'tmpl_condition', type: 'condition', name: 'Condition', title: 'Condition', subtitle: 'Multi-branch', category: 'Logic', output_array_field: 'items',
          args: { title: 'Conditions', ui: { layout: 'vertical' }, fields: [
            { type: 'section', title: 'Branches', key: 'items', mode: 'array', array: { initialItems: 1, minItems: 0, controls: { add: { kind: 'text', text: 'Ajouter' }, remove: { kind: 'text', text: 'Supprimer' } } },
              fields: [
                { type: 'text', key: 'name', label: 'Nom', col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, default: '', expression: { allow: true }, validators: [{ type: 'required' }] },
                { type: 'text', key: 'condition', label: 'Condition', col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, default: '', expression: { allow: true }, validators: [{ type: 'required' }] }
              ], col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }, grid: { gutter: 16 }, ui: { layout: 'vertical' }
            }
          ] }
        };
        // demo-1: Start -> SendMail
        const d1Nodes: any[] = [
          { id: 'n_start', type: 'html-template', point: { x: 120, y: 100 }, data: { model: { id: 'n_start', name: 'Start', template: startTpl.id, templateObj: startTpl, context: {} } } },
          { id: 'n_send', type: 'html-template', point: { x: 120, y: 260 }, data: { model: { id: 'n_send', name: 'SendMail', template: sendTpl.id, templateObj: sendTpl, context: {} } } },
        ];
        const d1Edges: any[] = [
          { id: 'n_start->n_send:out:', type: 'template', source: 'n_start', target: 'n_send', sourceHandle: 'out', targetHandle: null, edgeLabels: { center: { type: 'html-template', data: { text: 'Succes' } } }, data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } }
        ];
        this.save(this.FLOW_DOC_KEY + 'demo-1', { id: 'demo-1', name: flows[0].name, description: flows[0].description, nodes: d1Nodes, edges: d1Edges, meta: { demo: true } });

        // demo-2: Start -> HTTP -> Condition (2 branches)
        const d2Nodes: any[] = [
          { id: 'n_start', type: 'html-template', point: { x: 100, y: 80 }, data: { model: { id: 'n_start', name: 'Start', template: startTpl.id, templateObj: startTpl, context: {} } } },
          { id: 'n_http', type: 'html-template', point: { x: 100, y: 250 }, data: { model: { id: 'n_http', name: 'HTTP Request', template: httpTpl.id, templateObj: httpTpl, context: {} } } },
          { id: 'n_cond', type: 'html-template', point: { x: 100, y: 430 }, data: { model: { id: 'n_cond', name: 'Condition', template: condTpl.id, templateObj: condTpl, context: { items: [{ _id: 'ok', name: 'OK' }, { _id: 'ko', name: 'KO' }] } } } },
        ];
        const d2Edges: any[] = [
          { id: 'n_start->n_http:out:', type: 'template', source: 'n_start', target: 'n_http', sourceHandle: 'out', targetHandle: null, edgeLabels: { center: { type: 'html-template', data: { text: 'Succes' } } }, data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } },
          { id: 'n_http->n_cond:0:', type: 'template', source: 'n_http', target: 'n_cond', sourceHandle: '0', targetHandle: null, edgeLabels: { center: { type: 'html-template', data: { text: 'Success' } } }, data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } },
        ];
        this.save(this.FLOW_DOC_KEY + 'demo-2', { id: 'demo-2', name: flows[1].name, description: flows[1].description, nodes: d2Nodes, edges: d2Edges, meta: { demo: true } });
      }
      if (force || !this.load<any>(this.FORM_LIST_KEY, null)) {
        const forms: FormSummary[] = [
          { id: 'form-1', name: 'Demande de congés', description: 'Formulaire simple' },
          { id: 'form-2', name: 'Onboarding', description: 'Wizard avec étapes' },
        ];
        this.save(this.FORM_LIST_KEY, forms);
        // Seed doc: congés
        const leaveSchema: any = {
          title: 'Demande de congés',
          ui: { layout: 'vertical' },
          fields: [
            { type: 'date', key: 'start', label: 'Date début', col: { xs: 24 } },
            { type: 'date', key: 'end', label: 'Date fin', col: { xs: 24 } },
            { type: 'select', key: 'type', label: 'Type', options: [{ label: 'CP', value: 'cp' }, { label: 'RTT', value: 'rtt' }], col: { xs: 24 } },
            { type: 'textarea', key: 'reason', label: 'Motif', col: { xs: 24 } }
          ]
        };
        this.save(this.FORM_DOC_KEY + 'form-1', { id: 'form-1', name: 'Demande de congés', description: 'Formulaire simple', schema: leaveSchema });
        // Seed doc: onboarding avec étapes
        const onboarding: any = {
          title: 'Onboarding', ui: { layout: 'vertical' },
          steps: [
            { title: 'Profil', fields: [{ type: 'text', key: 'firstName', label: 'Prénom', col: { xs: 24 } }, { type: 'text', key: 'lastName', label: 'Nom', col: { xs: 24 } }] },
            { title: 'Compte', fields: [{ type: 'text', key: 'email', label: 'Email', col: { xs: 24 } }, { type: 'checkbox', key: 'newsletter', label: 'Newsletter', col: { xs: 24 } }] }
          ]
        };
        this.save(this.FORM_DOC_KEY + 'form-2', { id: 'form-2', name: 'Onboarding', description: 'Wizard avec étapes', schema: onboarding });
      }
      if (force || !this.load<any>(this.TPL_LIST_KEY, null)) {
        // Seed derived from Flow Builder palette
        const tpls: NodeTemplate[] = [
          { id: 'tmpl_start', type: 'start', name: 'Start', category: 'Core', description: 'Début du flow' },
          { id: 'tmpl_condition', type: 'condition', name: 'Condition', category: 'Logic', description: 'Branches multiples via items', args: { "title": "Nouveau formulaire", "fields": [{ "type": "section", "title": "Les conditions", "mode": "array", "key": "items", "array": { "initialItems": 1, "minItems": 0, "controls": { "add": { "kind": "text", "text": "Ajouter" }, "remove": { "kind": "text", "text": "Supprimer" } } }, "fields": [{ "type": "text", "key": "name", "label": "Name", "col": { "xs": 24, "sm": 24, "md": 12, "lg": 12, "xl": 12 }, "default": "", "expression": { "allow": true } }, { "type": "text", "key": "condtion", "label": "Condtion", "col": { "xs": 24, "sm": 24, "md": 12, "lg": 12, "xl": 12 }, "default": "", "expression": { "allow": true } }, { "type": "text", "key": "_id", "label": "Id invisible", "col": { "xs": 24, "sm": 24, "md": 12, "lg": 12, "xl": 12 }, "default": "", "visibleIf": { "==": [{ "var": "name" }, "admin_id_viewer"] } }], "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 }, "description": "Choisir les conditions", "grid": { "gutter": 16 }, "ui": { "layout": "vertical" } }] } },
          { id: 'tmpl_loop', type: 'loop', name: 'Loop', category: 'Core', description: 'Itération' },
          { id: 'tmpl_action', type: 'function', name: 'Action', category: 'Core', description: 'Étape générique', output: ['Success'], authorize_catch_error: true },
          {
            id: 'tmpl_sendmail', type: 'function', name: 'SendMail', category: 'Email', appId: 'gmail', description: 'Envoyer un email via Gmail', args: {
              "title": "Nouveau formulaire",
              "fields": [
                {
                  "type": "section",
                  "title": "Information système",
                  "fields": [
                    {
                      "type": "text",
                      "key": "event_id",
                      "label": "Event ID",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    }
                  ],
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "description": "Les ID à renseigner.",
                  "grid": {
                    "gutter": 16
                  },
                  "mode": "normal"
                },
                {
                  "type": "text",
                  "key": "user_id",
                  "label": "User ID",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                },
                {
                  "type": "section",
                  "title": "Contenu",
                  "fields": [
                    {
                      "type": "checkbox",
                      "key": "acr",
                      "label": "Accusé de reception",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": false,
                      "expression": {
                        "allow": true
                      }
                    },
                    {
                      "type": "text",
                      "key": "message",
                      "label": "Message",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    },
                    {
                      "type": "text",
                      "key": "subject",
                      "label": "Sujet",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    },
                    {
                      "type": "text",
                      "key": "dest",
                      "label": "Dest",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    }
                  ],
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "description": "Le contenu et destinaire du mail",
                  "grid": {
                    "gutter": 16
                  },
                  "mode": "normal"
                },
                {
                  "type": "section",
                  "title": "Dossier",
                  "fields": [
                    {
                      "type": "text",
                      "key": "file",
                      "label": "Fichier à envoyer",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    },
                    {
                      "type": "text",
                      "key": "path",
                      "label": "Chemin",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    },
                    {
                      "type": "text",
                      "key": "value",
                      "label": "Valeur",
                      "col": {
                        "xs": 24,
                        "sm": 24,
                        "md": 24,
                        "lg": 24,
                        "xl": 24
                      },
                      "default": "",
                      "expression": {
                        "allow": true
                      }
                    }
                  ],
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "grid": {
                    "gutter": 16
                  },
                  "mode": "normal"
                }
              ],
              "ui": {
                "layout": "vertical",
                "labelAlign": "left",
                "labelsOnTop": true,
                "labelCol": {
                  "span": 8
                },
                "controlCol": {
                  "span": 16
                },
                "widthPx": 1040,
                "actions": {
                  "showReset": false,
                  "showCancel": false
                }
              },
              "summary": {
                "enabled": false,
                "includeHidden": false,
                "dateFormat": "dd/MM/yyyy"
              }
            }, output: ['Success'], authorize_catch_error: true, tags: ['email', 'gmail'], group: 'Functions'
          },
          { id: 'tmpl_http', type: 'function', name: 'HTTP Request', category: 'HTTP', description: 'Appeler une API HTTP', output: ['Success'], authorize_catch_error: true, tags: ['http', 'api'], group: 'Functions' },
          { id: 'tmpl_slack_post', type: 'function', name: 'Slack Post', category: 'Chat', appId: 'slack', description: 'Poster un message Slack', output: ['Success'], authorize_catch_error: true, tags: ['slack', 'chat'], group: 'Functions' },
          { id: 'tmpl_delay', type: 'function', name: 'Delay', category: 'Core', description: 'Attendre un délai', output: ['Success'], authorize_catch_error: true, tags: ['time', 'delay'], group: 'Functions' },
          { id: 'tmpl_math_add', type: 'function', name: 'Math Add', category: 'Math', description: 'Additionner', output: ['Success'], tags: ['math'], group: 'Functions' },
          { id: 'tmpl_text_upper', type: 'function', name: 'Text Uppercase', category: 'Text', description: 'Mettre en majuscules', output: ['Success'], tags: ['text'], group: 'Functions' },
          { id: 'tmpl_pdf', type: 'function', name: 'PDF', category: 'Docs', appId: 'pdf', description: 'Générer un PDF', output: ['Success'], tags: ['pdf', 'document'], group: 'Functions' },
        ];
        this.save(this.TPL_LIST_KEY, tpls);
      }
      if (force || !this.load<any>(this.APP_LIST_KEY, null)) {
        const apps: AppProvider[] = [
          { id: 'gmail', name: 'Gmail', iconClass: 'fa-solid fa-envelope', color: '#EA4335', tags: ['email', 'google'] },
          { id: 'slack', name: 'Slack', iconClass: 'fa-brands fa-slack', color: '#611f69', tags: ['chat', 'team'] },
          { id: 'pdf', name: 'PDF', iconClass: 'fa-solid fa-file-pdf', color: '#D32F2F', tags: ['document'] },
          { id: 'word', name: 'Word', iconClass: 'fa-solid fa-file-word', color: '#2B579A', tags: ['document', 'office'] },
        ];
        this.save(this.APP_LIST_KEY, apps);
      }
    } catch { }
  }

  private load<T>(key: string, fallback: T): T {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
  }
  private save(key: string, value: any) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
  }
}
