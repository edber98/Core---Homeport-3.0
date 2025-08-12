import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BuilderHome } from './pages/builder-home/builder-home';
import { BuilderSettings } from './pages/builder-settings/builder-settings';
import { BuilderFlow } from './pages/builder-flow/builder-flow';

const routes: Routes = [
  { path: '', component: BuilderHome },
  { path: 'flow', component: BuilderFlow },
  { path: 'stats', component: BuilderSettings }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BuilderRoutingModule { }
