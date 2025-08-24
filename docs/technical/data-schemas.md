# Homeport Data Schemas

This document describes the data structures used by the demo frontend. It serves as a contract to implement a backend API later. All entities are currently persisted in `localStorage` via services; the same interfaces should be kept when moving to HTTP.

## Conventions
- IDs: stable strings (kebab-case preferred). Generated from names plus a timestamp when creating via UI.
- All entities have a summary list and a document payload. Services should provide both list and doc endpoints.
- Workspaces and ACL: a lightweight mapping associates resources to a workspace and defines allowlists (e.g., allowed node-templates per workspace).

## Flows

- Summary: minimal cards in `/flows`.
```
type FlowSummary = {
  id: string;
  name: string;
  description?: string;
};
```

- Document: edited in Flow Builder (`/flow-builder/editor?flow=<id>`).
```
type FlowDoc = {
  id: string;
  name: string;
  description?: string;
  nodes?: any[];   // vflow nodes (HTML template nodes)
  edges?: any[];   // vflow edges (with labels + error meta)
  meta?: any;      // reserved for builder/runtime metadata
};
```

Example:
```
{
  "id": "notify-client-krx1s8",
  "name": "Notify client",
  "description": "Start → HTTP → Condition",
  "nodes": [ { "id": "start-1", "type": "html-template", "data": { "model": { /* ... */ } } } ],
  "edges": [ { "id": "start-1->fn-2:next:", "source": "start-1", "target": "fn-2" } ],
  "meta": { "version": 1 }
}
```

## Forms

- Summary: list in `/forms`.
```
type FormSummary = {
  id: string;
  name: string;
  description?: string;
};
```

- Document: edited in Dynamic Form Builder (`/dynamic-form?form=<id>`).
```
type FormDoc = {
  id: string;
  name: string;
  description?: string;
  schema?: FormSchema; // see Dynamic Form schema below
};
```

### Dynamic Form Schema

```
type FormSchema = {
  title?: string;
  ui?: {
    layout?: 'horizontal'|'vertical'|'inline';
    labelAlign?: 'left'|'right';
    labelsOnTop?: boolean;
    labelCol?: { span?: number; offset?: number };
    controlCol?: { span?: number; offset?: number };
    widthPx?: number;
    containerStyle?: Record<string, any>;
    actions?: { showReset?: boolean; showCancel?: boolean; submitText?: string; cancelText?: string; resetText?: string; actionsStyle?: Record<string, any>; buttonStyle?: Record<string, any> } & {
      submitBtn?: ButtonUI; cancelBtn?: ButtonUI; resetBtn?: ButtonUI;
    };
  };
  steps?: StepConfig[];
  fields?: FieldConfig[];   // flat mode
  summary?: { enabled: boolean; title?: string; includeHidden?: boolean; dateFormat?: string };
};

type StepConfig = { key?: string; title: string; visibleIf?: any; fields?: FieldConfig[]; prevBtn?: ButtonUI; nextBtn?: ButtonUI };

type FieldConfig =
  | { type: 'text'|'textarea'|'number'|'date'|'select'|'radio'|'checkbox'; key: string; label?: string; placeholder?: string; description?: string; options?: {label:string;value:any}[]; default?: any; validators?: FieldValidator[]; visibleIf?: any; requiredIf?: any; disabledIf?: any; col?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl',number>>; itemStyle?: Record<string,any>; expression?: { allow?: boolean; showPreviewErrors?: boolean } }
  | { type: 'textblock'; textHtml?: string; col?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl',number>>; itemStyle?: Record<string,any> }
  | { type: 'section'|'section_array'; key?: string; mode?: 'normal'|'array'; title?: string; description?: string; titleStyle?: Record<string,any>; descriptionStyle?: Record<string,any>; grid?: { gutter?: number }; ui?: Partial<FormSchema['ui']>; visibleIf?: any; fields: FieldConfig[] };

type FieldValidator = { type: 'required'|'min'|'max'|'minLength'|'maxLength'|'pattern'; value?: any; message?: string };
type ButtonUI = { text?: string; enabled?: boolean; ariaLabel?: string; style?: Record<string, any> };
```

Example schema:
```
{
  "title": "HTTP Request",
  "ui": { "layout": "vertical" },
  "fields": [
    { "type": "text", "key": "url", "label": "URL", "col": { "xs": 24 }, "default": "https://api" },
    { "type": "select", "key": "method", "label": "Method", "options": ["GET","POST"], "col": { "xs": 24 }, "default": "GET" }
  ]
}
```

## Node Templates

Node Templates power the flow palette and node inspector. They are managed in `/node-templates`.

```
type NodeTemplate = {
  id: string;
  type: 'start'|'function'|'condition'|'loop'|'end';
  name: string;
  category?: string;    // functional grouping (Email, HTTP, Docs…)
  appId?: string;       // provider id (ex: 'gmail')
  tags?: string[];
  group?: string;       // UI grouping
  description?: string;
  args?: FormSchema;    // form schema used to render Arguments dialog
  output?: string[];    // function outputs labels (err handled via authorize_catch_error)
  authorize_catch_error?: boolean;
  // Optional UI hints (not required by backend)
  icon?: string; title?: string; subtitle?: string;
  // Condition-specific
  output_array_field?: string; // array field in args that defines branches
};
```

## Apps / Providers

```
type AppProvider = {
  id: string;
  name: string;
  title?: string;
  iconClass?: string;
  iconUrl?: string;
  color?: string;
  tags?: string[];
};
```

## ACL and Workspaces

Managed by `AccessControlService` in the demo. Backend should expose endpoints for:

- Users
- Workspaces (current workspace per user)
- Template allowlists per workspace
- Resource→workspace mapping (flows, forms, websites, templates)

Suggested payload shape used in demo export/import:
```
{
  "kind": "homeport-acl",
  "version": 1,
  "exportedAt": "2024-08-20T10:00:00.000Z",
  "users": [ { "id": "u1", "name": "Alice" } ],
  "workspaces": [ { "id": "default", "name": "Default" } ],
  "currentUserId": "u1",
  "allowedTemplatesByWorkspace": { "default": ["tmpl_http","tmpl_condition"] },
  "resourceWorkspace": {
    "flow:notify-client-krx1s8": "default",
    "form:http-request": "default"
  }
}
```

## Catalog Export/Import

The demo combines all entities in a single export payload:
```
{
  "kind": "homeport-catalog",
  "version": 1,
  "exportedAt": "2024-08-20T10:00:00.000Z",
  "flows": FlowSummary[],
  "flowDocs": Record<string, FlowDoc>,
  "forms": FormSummary[],
  "formDocs": Record<string, FormDoc>,
  "templates": NodeTemplate[],
  "apps": AppProvider[]
}
```

## Services and Endpoints (target)

When migrating to a real backend, the following endpoints are recommended. The frontend is already layered to call services, which can be swapped to HTTP.

- Flows
  - `GET /api/flows` → FlowSummary[]
  - `GET /api/flows/:id` → FlowDoc
  - `PUT /api/flows/:id` → FlowDoc (upsert)

- Forms
  - `GET /api/forms` → FormSummary[]
  - `GET /api/forms/:id` → FormDoc
  - `PUT /api/forms/:id` → FormDoc (upsert)

- Templates
  - `GET /api/templates` → NodeTemplate[]
  - `GET /api/templates/:id` → NodeTemplate
  - `PUT /api/templates/:id` → NodeTemplate (upsert)

- Apps
  - `GET /api/apps` → AppProvider[]
  - `GET /api/apps/:id` → AppProvider
  - `PUT /api/apps/:id` → AppProvider (upsert)

- ACL / Workspaces
  - `GET /api/acl/workspaces` → Workspaces[]
  - `GET /api/acl/allowlists/:workspaceId` → string[] (template IDs)
  - `PUT /api/acl/allowlists/:workspaceId` → string[]
  - `GET /api/acl/resource-mapping/:resourceType/:id` → workspaceId
  - `PUT /api/acl/resource-mapping/:resourceType/:id` → workspaceId

Notes:
- All upserts should be idempotent.
- Backend can validate references (e.g., `FormSchema` shape, allowed template IDs, provider IDs).

