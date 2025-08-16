import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard-home/dashboard-home').then(m => m.DashboardHome) },
  { path: 'stats', loadComponent: () => import('./pages/dashboard-stats/dashboard-stats').then(m => m.DashboardStats) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
