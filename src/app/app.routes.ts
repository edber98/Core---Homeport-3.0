import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Graphviz } from './pages/graphviz/graphviz';
import { Flow } from './pages/flow/flow';
import { LayoutMain } from './layout/layout-main/layout-main';
import { LayoutBuilder } from './layout/layout-builder/layout-builder';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'  // ou 'builder' si tu veux rediriger ailleurs
  },

    {
        path: '',
        component: LayoutMain,
        children: [
            {
                path: 'dashboard',
                loadChildren: () =>
                    import('./features/dashboard/dashboard-module').then(m => m.DashboardModule),
                title: 'Dashboard'
            },
            {
                path: 'dynamic-form',
                loadComponent: () => import('./features/dynamic-form/dynamic-form-builder.component').then(m => m.DynamicFormBuilderComponent),
                title: 'Dynamic Form Builder'
            },
            // Listing routes (standalone, no modules)
            { path: 'flows', loadComponent: () => import('./features/flow/flow-list.component').then(m => m.FlowListComponent), title: 'Flows' },
            { path: 'flows/editor', loadComponent: () => import('./features/flow/flow-list.component').then(m => m.FlowListComponent), title: 'Flows' },
            { path: 'flows/executions', loadComponent: () => import('./features/flow/flow-list.component').then(m => m.FlowListComponent), title: 'Flows — Exécutions' },
            { path: 'forms', loadComponent: () => import('./features/dynamic-form/form-list.component').then(m => m.FormListComponent), title: 'Formulaires' },
            { path: 'forms/builder', loadComponent: () => import('./features/dynamic-form/form-list.component').then(m => m.FormListComponent), title: 'Formulaires — Builder' },
            { path: 'forms/viewer', loadComponent: () => import('./features/dynamic-form/form-list.component').then(m => m.FormListComponent), title: 'Formulaires — Viewer' },
            { path: 'node-templates', loadComponent: () => import('./features/flow/node-template-list.component').then(m => m.NodeTemplateListComponent), title: 'Templates de nœuds' },
            { path: 'node-templates/editor', loadComponent: () => import('./features/flow/node-template-editor.component').then(m => m.NodeTemplateEditorComponent), title: 'Template — Éditeur' },
            { path: 'node-templates/viewer', loadComponent: () => import('./features/flow/node-template-viewer.component').then(m => m.NodeTemplateViewerComponent), title: 'Template — Viewer' },
            { path: 'apps', loadComponent: () => import('./features/catalog/app-provider-list.component').then(m => m.AppProviderListComponent), title: 'Apps / Providers' },
            { path: 'apps/editor', loadComponent: () => import('./features/catalog/app-provider-editor.component').then(m => m.AppProviderEditorComponent), title: 'App — Éditeur' },
            { path: 'apps/viewer', loadComponent: () => import('./features/catalog/app-provider-viewer.component').then(m => m.AppProviderViewerComponent), title: 'App — Viewer' },
            { path: 'settings', loadComponent: () => import('./features/settings/app-settings.component').then(m => m.AppSettingsComponent), title: 'Paramètres' },
            { path: 'flows/viewer-dialog', loadComponent: () => import('./features/flow/flow-viewer-dialog.component').then(m => m.FlowViewerDialogComponent), title: 'Flow — Visualiseur' },
            { path: 'dev/json-viewer', loadComponent: () => import('./dev/json-viewer-playground.component').then(m => m.JsonViewerPlaygroundComponent), title: 'DEV — JSON Viewer' },
            { path: 'dev/dnd-overlay', loadComponent: () => import('./dev/dnd-overlay-playground.component').then(m => m.DevDndOverlayPlaygroundComponent), title: 'DEV — DnD Overlay' },
            {
                path: 'flow-builder',
                loadComponent: () => import('./features/flow/flow-workbench.component').then(m => m.FlowWorkbenchComponent),
                children: [
                  { path: '', pathMatch: 'full', redirectTo: 'editor' },
                  { path: 'editor', loadComponent: () => import('./features/flow/flow-builder.component').then(m => m.FlowBuilderComponent), title: 'Flow Builder' },
                  { path: 'executions', loadComponent: () => import('./features/flow/flow-execution.component').then(m => m.FlowExecutionComponent), title: 'Exécutions' },
                ]
            },
        ]
    },
    // Removed legacy builder module route (folder deleted)
    { path: 'home', component: Home },
    { path: 'viz', component: Graphviz },
    { path: 'flow', component: Flow },
    { path: '**', redirectTo: '' } // redirection pour les chemins inconnus
];
