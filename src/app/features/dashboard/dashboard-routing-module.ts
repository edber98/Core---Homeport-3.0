import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardHome } from './pages/dashboard-home/dashboard-home';
import { DashboardStats } from './pages/dashboard-stats/dashboard-stats';

const routes: Routes = [
  {path: '', component: DashboardHome},
  {path: 'stats', component: DashboardStats}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
