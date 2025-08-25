import { Routes } from '@angular/router';
import { adminGuard } from './services/route-guards';
import { Home } from './pages/home/home';
import { Graphviz } from './pages/graphviz/graphviz';
import { Flow } from './pages/flow/flow';
import { LayoutMain } from './layout/layout-main/layout-main';
import { LayoutAuth } from './layout/layout-auth/layout-auth';
import { authGuard } from './services/route-guards';
import { LayoutBuilder } from './layout/layout-builder/layout-builder';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'  // ou 'builder' si tu veux rediriger ailleurs
  },

    // Auth-only layout (no navbar)
    {
        path: '',
        component: LayoutAuth,
        children: [
            { path: 'login', loadComponent: () => import('./features/users/login.component').then(m => m.LoginComponent), title: 'Connexion' },
            { path: 'forgot', loadComponent: () => import('./features/users/forgot-password.component').then(m => m.ForgotPasswordComponent), title: 'Mot de passe oublié' },
            { path: 'reset-password', loadComponent: () => import('./features/users/reset-password.component').then(m => m.ResetPasswordComponent), title: 'Réinitialiser le mot de passe' },
        ]
    },

    {
        path: '',
        component: LayoutMain,
        canActivate: [authGuard],
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
            { path: 'node-templates/editor', canActivate: [adminGuard], loadComponent: () => import('./features/flow/node-template-editor.component').then(m => m.NodeTemplateEditorComponent), title: 'Template — Éditeur' },
            { path: 'node-templates/viewer', loadComponent: () => import('./features/flow/node-template-viewer.component').then(m => m.NodeTemplateViewerComponent), title: 'Template — Viewer' },
            { path: 'workspaces', canActivate: [adminGuard], loadComponent: () => import('./features/workspace/workspace-list.component').then(m => m.WorkspaceListComponent), title: 'Workspaces' },
            { path: 'users', canActivate: [adminGuard], loadComponent: () => import('./features/users/users-list.component').then(m => m.UsersListComponent), title: 'Users' },
            { path: 'change-password', loadComponent: () => import('./features/users/change-password.component').then(m => m.ChangePasswordComponent), title: 'Changer le mot de passe' },
            // Websites (list/editor/viewer)
            { path: 'websites', loadComponent: () => import('./features/website/website-list.component').then(m => m.WebsiteListComponent), title: 'Sites web' },
            { path: 'websites/editor', loadComponent: () => import('./features/website/website-editor.component').then(m => m.WebsiteEditorComponent), title: 'Site — Éditeur' },
            { path: 'websites/viewer', loadComponent: () => import('./features/website/website-viewer.component').then(m => m.WebsiteViewerComponent), title: 'Site — Viewer' },
            { path: 'websites/page', loadComponent: () => import('./features/website/website-page-viewer.component').then(m => m.WebsitePageViewerComponent), title: 'Site — Page Viewer' },
            { path: 'apps', loadComponent: () => import('./features/catalog/app-provider-list.component').then(m => m.AppProviderListComponent), title: 'Apps / Providers' },
            { path: 'credentials', loadComponent: () => import('./features/credentials/credential-list.component').then(m => m.CredentialListComponent), title: 'Credentials' },
            { path: 'runs', loadComponent: () => import('./features/flow/workspace-run-list.component').then(m => m.WorkspaceRunListComponent), title: 'Exécutions (workspace)' },
            { path: 'notifications', loadComponent: () => import('./features/notifications/notifications-page.component').then(m => m.NotificationsPageComponent), title: 'Notifications' },
            { path: 'debug', loadComponent: () => import('./features/debug/debugging-list.component').then(m => m.DebuggingListComponent), title: 'Debugging' },
            { path: 'debug/expr-json', loadComponent: () => import('./features/debug/debug-expr-json-playground.component').then(m => m.DebugExprJsonPlaygroundComponent), title: 'Debug — JSON + Expression' },
            { path: 'debug/form-viewers', loadComponent: () => import('./features/debug/debug-form-viewers.component').then(m => m.DebugFormViewersComponent), title: 'Debug — Form Viewers' },
            { path: 'debug/form-loader', loadComponent: () => import('./features/debug/form-loader-debug.component').then(m => m.FormLoaderDebugComponent), title: 'Debug — Form Loader' },
            { path: 'apps/editor', canActivate: [adminGuard], loadComponent: () => import('./features/catalog/app-provider-editor.component').then(m => m.AppProviderEditorComponent), title: 'App — Éditeur' },
            { path: 'apps/viewer', loadComponent: () => import('./features/catalog/app-provider-viewer.component').then(m => m.AppProviderViewerComponent), title: 'App — Viewer' },
            { path: 'credentials/viewer', loadComponent: () => import('./features/credentials/credential-viewer.component').then(m => m.CredentialViewerComponent), title: 'Credential — Viewer' },
            { path: 'settings', loadComponent: () => import('./features/settings/app-settings.component').then(m => m.AppSettingsComponent), title: 'Paramètres' },
            { path: 'ui-builder', loadComponent: () => import('./features/ui/ui-builder.component').then(m => m.UiBuilderComponent), title: 'UI Builder' },
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
    { path: 'not-authorized', loadComponent: () => import('./pages/not-authorized/not-authorized').then(m => m.NotAuthorizedPage), title: 'Non autorisé' },
    { path: '**', redirectTo: '' } // redirection pour les chemins inconnus
];
