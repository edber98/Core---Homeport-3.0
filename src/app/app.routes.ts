import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Graphviz } from './pages/graphviz/graphviz';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'viz', component: Graphviz },
    { path: '**', redirectTo: '' } // redirection pour les chemins inconnus
];
