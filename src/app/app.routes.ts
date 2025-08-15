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
                    import('./features/dashboard/dashboard-module').then(m => m.DashboardModule)
            },
            {
                path: 'dynamic-form',
                loadComponent: () => import('./features/dynamic-form/dynamic-form-builder.component').then(m => m.DynamicFormBuilderComponent)
            },
            {
                path: 'flow-builder',
                loadComponent: () => import('./features/flow/flow-builder.component').then(m => m.FlowBuilderComponent)
            },
        ]
    },
    // Removed legacy builder module route (folder deleted)
    { path: 'home', component: Home },
    { path: 'viz', component: Graphviz },
    { path: 'flow', component: Flow },
    { path: '**', redirectTo: '' } // redirection pour les chemins inconnus
];
