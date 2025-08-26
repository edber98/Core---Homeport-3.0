import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Website, WebsiteRoute, WebsiteService } from './website.service';

@Component({
  selector: 'website-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, DragDropModule],
  template: `
  <div class="tpl-editor">
    <div class="header">
      <div class="card-title left"><span class="t">Site web</span><span class="s">Créer / Éditer</span></div>
      <div class="actions">
        <button nz-button class="apple-btn" (click)="cancel()"><i class="fa-solid fa-arrow-left"></i><span class="label">Retour</span></button>
        <button nz-button class="apple-btn" nzType="primary" [disabled]="form.invalid || saving" (click)="save()"><i class="fa-solid fa-save"></i><span class="label">Enregistrer</span></button>
      </div>
    </div>

    <form [formGroup]="form" class="form" nz-form nzLayout="vertical">
      <div class="grid cols-2">
        <nz-form-item>
          <nz-form-label>Nom</nz-form-label>
          <nz-form-control><input nz-input formControlName="name" placeholder="Ex: Mon site"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Slug</nz-form-label>
          <nz-form-control><input nz-input formControlName="slug" placeholder="mon-site"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Description</nz-form-label>
          <nz-form-control><input nz-input formControlName="description" placeholder="Brève description"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Tags</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="tags" nzMode="tags" nzPlaceHolder="Mots-clés"></nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Status</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="status">
              <nz-option nzValue="draft" nzLabel="draft"></nz-option>
              <nz-option nzValue="test" nzLabel="test"></nz-option>
              <nz-option nzValue="live" nzLabel="live"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
      </div>

      <div class="sub-header">
        <div class="card-title left"><span class="t">Routes</span><span class="s">Tableau éditable + DnD</span></div>
      </div>
      <div class="routes" cdkDropList (cdkDropListDropped)="dropRoute($event)">
        <div class="row" *ngFor="let g of routeGroups; let i=index" [formGroup]="g" cdkDrag>
          <span class="drag" cdkDragHandle>⋮⋮</span>
          <input nz-input formControlName="path" placeholder="/chemin"/>
          <input nz-input formControlName="title" placeholder="Titre"/>
          <nz-select formControlName="status" nzPlaceHolder="statut">
            <nz-option nzValue="empty" nzLabel="empty"></nz-option>
            <nz-option nzValue="in_progress" nzLabel="in_progress"></nz-option>
            <nz-option nzValue="done" nzLabel="done"></nz-option>
            <nz-option nzValue="error" nzLabel="error"></nz-option>
          </nz-select>
          <button nz-button nzDanger (click)="removeRoute(i)"><i class="fa-solid fa-trash"></i></button>
          <button nz-button (click)="openBuilderFor(i)" nz-tooltip="Ouvrir UI Builder"><i class="fa-solid fa-up-right-from-square"></i></button>
        </div>
        <button nz-button class="apple-btn" (click)="addRoute()"><i class="fa-solid fa-plus"></i><span class="label">Ajouter une route</span></button>
      </div>
    </form>
  </div>
  `,
  styles: [`
    .tpl-editor { padding: 12px; max-width: 1080px; margin: 0 auto; }
    @media (max-width: 768px) { .tpl-editor { padding-bottom: 96px; } }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
    .header .actions { display:flex; gap:8px; }
    .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .sub-header { display:flex; align-items:flex-end; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
    .form { display:block; }
    .grid { display:grid; gap:8px; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: 960px) { .grid.cols-2 { grid-template-columns: 1fr; } }
    .routes { display:flex; flex-direction:column; gap:6px; }
    .routes .row { display:grid; grid-template-columns: 24px 1fr 1fr 160px auto auto; gap:6px; align-items:center; padding:6px 8px; border-radius:8px; transition: background 160ms ease; }
    .routes .row:hover { background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }
    .drag { cursor: grab; color:#94a3b8; user-select:none; padding:0 4px; }
  `]
})
export class WebsiteEditorComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  constructor(private fb: FormBuilder, private svc: WebsiteService, private router: Router, private route: ActivatedRoute) {}
  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    const dup = this.route.snapshot.queryParamMap.get('duplicateFrom');
    if (dup) {
      this.svc.getById(dup).subscribe(s => {
        const base = s || this.newSite();
        const copy: Website = { ...base, id: 'site_' + Math.random().toString(36).slice(2,9), name: (base.name || '') + ' (copie)', slug: (base.slug || '') + '-copy', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), routes: (base.routes || []).map(r => ({ ...r })) };
        this.buildForm(copy);
      });
    } else if (id) {
      this.svc.getById(id).subscribe(s => {
        const site = s || this.newSite();
        this.buildForm(site);
      });
    } else {
      this.buildForm(this.newSite());
    }
  }
  newSite(): Website {
    return { id: 'site_' + Math.random().toString(36).slice(2,9), name: '', slug: '', status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), routes: [] };
  }
  buildForm(s: Website) {
    this.form = this.fb.group({
      id: [s.id, Validators.required],
      name: [s.name, Validators.required],
      slug: [s.slug, Validators.required],
      description: [s.description || ''],
      tags: [s.tags || []],
      status: [s.status || 'draft', Validators.required],
      routes: this.fb.array((s.routes||[]).map(r => this.routeGroup(r)))
    });
  }
  routeGroup(r?: WebsiteRoute) { return this.fb.group({ path: [r?.path || '', Validators.required], title: [r?.title || ''], status: [r?.status || 'empty'] }); }
  get routes() { return this.form.get('routes') as FormArray; }
  get routeGroups() { return this.routes.controls as unknown as FormGroup[]; }
  addRoute() { this.routes.push(this.routeGroup()); }
  removeRoute(i: number) { this.routes.removeAt(i); }
  dropRoute(ev: CdkDragDrop<any[]>) { moveItemInArray(this.routes.controls, ev.previousIndex, ev.currentIndex); }
  save() {
    if (this.form.invalid) return; this.saving = true;
    const val = this.form.getRawValue() as Website; this.svc.upsert(val).subscribe(() => { this.saving = false; this.router.navigate(['/websites/viewer'], { queryParams: { id: val.id } }); });
  }
  cancel() { this.router.navigate(['/websites']); }
  openBuilderFor(i: number) {
    const r = this.routes.at(i)?.value as WebsiteRoute; if (!r) return;
    this.router.navigate(['/ui-builder'], { queryParams: { route: r.path, site: this.form.get('id')?.value } });
  }

  // Leave-guard hooks
  hasUnsavedChanges(): boolean { try { return this.form?.dirty ?? false; } catch { return false; } }
  purgeDraft() { /* no-op for websites (no localStorage) */ }
}
