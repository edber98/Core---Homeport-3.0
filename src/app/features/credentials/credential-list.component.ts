import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CatalogService, AppProvider, CredentialSummary, CredentialDoc } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { DynamicFormService, FormSchema } from '../../modules/dynamic-form/dynamic-form.service';
import { Router } from '@angular/router';
import { UiMessageService } from '../../services/ui-message.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'credential-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzButtonModule, NzSelectModule, NzModalModule, NzFormModule, NzInputModule, NzIconModule, DynamicForm],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Identifiants</h1>
          <p>Gérer les credentials par application, liés au workspace courant.</p>
        </div>
        <div class="actions">
          <nz-select [(ngModel)]="providerFilter" (ngModelChange)="reload()" nzAllowClear nzPlaceHolder="Filtrer par application">
            <nz-option *ngFor="let p of providers" [nzValue]="p.id" [nzLabel]="p.title || p.name"></nz-option>
          </nz-select>
          <button nz-button nzType="primary" (click)="openCreate()" [disabled]="!isAdmin">
            <i class="fa-solid fa-plus"></i> Nouveau
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="card" *ngFor="let c of creds" (click)="view(c)">
          <div class="content">
            <div class="title-row">
              <div class="name">{{ c.name }}</div>
              <span class="chip">{{ c.providerId }}</span>
              <span class="chip ws">{{ c.workspaceId }}</span>
            </div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="duplicate(c); $event.stopPropagation()" [disabled]="!isAdmin" title="Dupliquer"><i class="fa-regular fa-copy"></i></button>
            <button class="icon-btn" (click)="remove(c); $event.stopPropagation()" [disabled]="!isAdmin" title="Supprimer"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>

      <!-- Create modal -->
      <nz-modal [(nzVisible)]="createVisible" nzTitle="Nouveaux credentials" (nzOnCancel)="closeCreate()" [nzFooter]="null" [nzWidth]="880">
        <ng-container *nzModalContent>
          <div class="create-modal">
            <form [formGroup]="createForm" nz-form nzLayout="vertical">
              <div class="grid cols-2">
                <nz-form-item>
                  <nz-form-label>Application</nz-form-label>
                  <nz-form-control>
                    <nz-select formControlName="providerId" (ngModelChange)="onProviderChange($event)" nzPlaceHolder="Choisir l'application">
                      <nz-option *ngFor="let p of providers" [nzValue]="p.id" [nzLabel]="p.title || p.name"></nz-option>
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>
                <nz-form-item>
                  <nz-form-label>Nom</nz-form-label>
                  <nz-form-control><input nz-input formControlName="name" placeholder="Ex: Primary Gmail"/></nz-form-control>
                </nz-form-item>
              </div>
            </form>
            <div *ngIf="currentSchema as schema">
              <app-dynamic-form [schema]="schema" [(value)]="credValues" (validChange)="credValid=$event" [hideActions]="true" [disableExpressions]="true"></app-dynamic-form>
            </div>
            <div class="actions end">
              <button nz-button (click)="closeCreate()">Annuler</button>
              <button nz-button nzType="primary" [disabled]="!createForm.valid || !credValid" (click)="create()">Créer</button>
            </div>
          </div>
        </ng-container>
      </nz-modal>
    </div>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .page-header .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; background: #fff; border: 1px solid #ececec; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .chip.ws { color:#6b7280; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; }
    .create-modal .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:8px; }
    .actions.end { display:flex; justify-content:flex-end; gap:8px; margin-top: 10px; }
  `]
})
export class CredentialListComponent implements OnInit, OnDestroy {
  providers: AppProvider[] = [];
  creds: CredentialSummary[] = [];
  providerFilter: string | null = null;

  createVisible = false;
  createForm!: FormGroup;
  currentSchema: FormSchema | null = null;
  credValues: any = {};
  credValid = false;

  constructor(private fb: FormBuilder, private catalog: CatalogService, private acl: AccessControlService, public dfs: DynamicFormService, private zone: NgZone, private cdr: ChangeDetectorRef, private router: Router, private ui: UiMessageService) {}
  private aclSub?: any;

  get isAdmin() { return (this.acl.currentUser()?.role || 'member') === 'admin'; }
  get workspaceId(): string { return this.acl.currentWorkspaceId(); }

  ngOnInit(): void {
    this.createForm = this.fb.group({
      providerId: [null, Validators.required],
      name: ['', Validators.required]
    });
    try { this.createForm.get('providerId')?.valueChanges.subscribe(val => this.onProviderChange(val)); } catch {}
    this.catalog.listApps().subscribe(list => {
      this.zone.run(() => {
        this.providers = (list || []).filter(p => !!p.hasCredentials);
        this.reload();
        try { this.cdr.detectChanges(); } catch {}
      });
    });
    try { this.aclSub = this.acl.changes$.subscribe(() => this.zone.run(() => { this.reload(); try { this.cdr.detectChanges(); } catch {} })); } catch {}
  }
  ngOnDestroy(): void { try { this.aclSub?.unsubscribe?.(); } catch {} }

  reload() {
    if (!this.workspaceId) { this.creds = []; try { console.debug('[Credentials] reload skipped: no wsId yet', { workspaces: this.acl.workspaces(), current: this.acl.currentWorkspace() }); } catch {}; return; }
    try { console.debug('[Credentials] reload', { wsId: this.workspaceId, workspaces: this.acl.workspaces(), current: this.acl.currentWorkspace() }); } catch {}
    this.catalog.listCredentials(this.workspaceId, this.providerFilter || undefined).subscribe(list => {
      this.zone.run(() => { this.creds = list || []; try { this.cdr.detectChanges(); } catch {} });
    });
  }

  openCreate() {
    if (!this.providers.length) return;
    this.createForm.reset({ providerId: this.providers[0].id, name: '' });
    this.onProviderChange(this.providers[0].id);
    this.credValues = {};
    this.credValid = false;
    this.createVisible = true;
    try { setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0); } catch {}
  }
  closeCreate() { this.createVisible = false; }
  onProviderChange(providerId: string) {
    const p = this.providers.find(x => x.id === providerId);
    const base = (p?.credentialsForm as FormSchema) || {} as any;
    // Provide a visible default schema if none or empty
    const hasContent = base && (Array.isArray((base as any).fields) || Array.isArray((base as any).steps));
    this.currentSchema = hasContent ? base : { title: 'Credentials', ui: { layout: 'vertical' }, fields: [] } as FormSchema;
    this.credValues = {};
    this.credValid = false;
    try { this.cdr.detectChanges(); } catch {}
  }
  create() {
    if (!this.createForm.valid || !this.credValid || !this.currentSchema) return;
    const v = this.createForm.value as any;
    const doc: CredentialDoc = {
      id: environment.useBackend ? '' : this.slug(`${v.providerId}-${v.name}-${Date.now().toString(36)}`),
      name: v.name,
      providerId: v.providerId,
      workspaceId: this.workspaceId,
      values: this.credValues || {}
    };
    this.catalog.saveCredential(doc).subscribe({ next: () => { this.ui.success('Credentials créés'); this.createVisible = false; this.reload(); }, error: () => this.ui.error('Création échouée') });
  }

  view(c: CredentialSummary) { this.router.navigate(['/credentials/viewer'], { queryParams: { id: c.id } }); }
  duplicate(c: CredentialSummary) {
    if (!this.isAdmin) return;
    this.catalog.getCredential(c.id).subscribe(doc => {
      const copy: CredentialDoc = { ...doc, id: environment.useBackend ? '' : this.slug(doc.id + '-copy'), name: doc.name + ' (copie)' };
      this.catalog.saveCredential(copy).subscribe({ next: () => { this.ui.success('Copie créée'); this.reload(); }, error: () => this.ui.error('Échec de la duplication') });
    });
  }
  remove(c: CredentialSummary) {
    if (!this.isAdmin) return;
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    this.catalog.deleteCredential(c.id).subscribe({ next: () => { this.ui.success('Credentials supprimés'); this.reload(); }, error: () => this.ui.error('Échec de la suppression') });
  }

  private slug(s: string): string {
    return (s || '').trim().toLowerCase().normalize('NFD')
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'id-' + Date.now().toString(36);
  }
}
