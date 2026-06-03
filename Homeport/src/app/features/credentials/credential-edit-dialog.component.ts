import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AppProvider, CatalogService, CredentialDoc } from '../../services/catalog.service';
import { UiMessageService } from '../../services/ui-message.service';
import { ProviderAuthService } from '../../services/provider-auth.service';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'credential-edit-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzModalModule, NzFormModule, NzInputModule, NzButtonModule, DynamicForm],
  template: `
    <nz-modal [nzVisible]="visible" [nzFooter]="null" (nzOnCancel)="cancel()" [nzWidth]="880" [nzWrapClassName]="'in-flow-editor-modal'">
      <ng-container *nzModalTitle>{{ titleText }}</ng-container>
      <div *nzModalContent>
        <form [formGroup]="form" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label>Nom</nz-form-label>
            <nz-form-control><input nz-input formControlName="name" placeholder="Nom de l'identifiant"/></nz-form-control>
          </nz-form-item>
        </form>
        <!-- Flow OAuth2 managé (bouncer) : bouton de connexion + statut -->
        <div *ngIf="isManaged" class="oauth-connect">
          <div class="oauth-status" [class.connected]="isConnected">
            <span *ngIf="isConnected">✓ Connecté<span *ngIf="values?.accountEmail"> — {{ values.accountEmail }}</span></span>
            <span *ngIf="!isConnected">Aucun compte connecté pour le moment.</span>
          </div>
          <button nz-button nzType="default" [nzLoading]="connecting" (click)="connect()">
            {{ isConnected ? 'Reconnecter' : 'Connecter ' + (provider?.title || provider?.name || '') }}
          </button>
        </div>
        <div *ngIf="provider?.credentialsForm as schema">
          <app-dynamic-form [schema]="schema" [(value)]="values" [hideActions]="true" [disableExpressions]="true"></app-dynamic-form>
        </div>
        <div class="actions">
          <button nz-button (click)="cancel()">Annuler</button>
          <button nz-button nzType="primary" class="primary-cta" [disabled]="form.invalid || (isManaged && !isConnected)" (click)="save()">Enregistrer</button>
        </div>
      </div>
    </nz-modal>
  `,
  styles: [`
    .oauth-connect { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; margin:8px 0 12px; border:1px solid #e5e7eb; border-radius:10px; background:#fafafa; }
    .oauth-status { font-size:13px; color:#6b7280; }
    .oauth-status.connected { color:#15803d; }
    .actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 10px; }
    .actions .primary-cta { background:#e61982; border-color:#e61982; color:#fff; box-shadow:none; }
    .actions .primary-cta:hover:not([disabled]),
    .actions .primary-cta:focus:not([disabled]) { background:#0f6ae6; border-color:#0f6ae6; color:#fff; }
    .actions .primary-cta[disabled] { background:#f3f4f6; border-color:#e5e7eb; color:#9ca3af; }
  `]
})
export class CredentialEditDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() provider?: AppProvider | null;
  @Input() doc?: CredentialDoc | null;
  @Input() workspaceId?: string | null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<CredentialDoc>();

  form: FormGroup;
  values: any = {};
  connecting = false;

  constructor(private fb: FormBuilder, private catalog: CatalogService, private ui: UiMessageService, private providerAuth: ProviderAuthService) {
    this.form = this.fb.group({ name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }) });
  }

  get titleText() { return this.doc ? 'Éditer les credentials' : 'Nouveaux credentials'; }

  /** Le provider expose-t-il un flow OAuth2 managé (bouton « Connecter ») ? */
  get isManaged(): boolean { return this.providerAuth.hasManagedCredentialFlow(this.provider); }

  /** Un compte est-il déjà connecté (refreshToken présent) ? */
  get isConnected(): boolean { return this.providerAuth.hasCredentialValues(this.provider, this.values); }

  /** Lance le flow OAuth2 managé via popup + concentrateur. */
  connect() {
    if (!this.provider || !this.workspaceId) { this.ui.error('Workspace introuvable'); return; }
    this.connecting = true;
    this.providerAuth.connect(this.provider, this.workspaceId)
      .then((res) => {
        // Fusionne les valeurs managées (refreshToken, accountEmail, scope, ...).
        this.values = { ...(this.values || {}), ...(res.values || {}) };
        // Pré-remplit le nom si vide.
        if (!(this.form.value?.name || '').trim()) {
          const suggested = String(res.values?.accountEmail || this.provider?.title || this.provider?.name || '').trim();
          if (suggested) this.form.patchValue({ name: suggested });
        }
        this.ui.success('Compte connecté');
      })
      .catch((err) => this.ui.error(String(err?.message || 'Connexion échouée')))
      .finally(() => { this.connecting = false; });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc'] || changes['visible']) {
      const n = (this.doc?.name || '').trim();
      this.form.patchValue({ name: n });
      this.values = this.doc?.values ? { ...(this.doc.values) } : {};
      // When opening the dialog in backend mode, fetch decrypted values (admin required)
      if (this.visible && this.doc?.id) {
        this.catalog.getCredentialValues(this.doc.id, true).subscribe({
          next: (vals: any) => { this.values = { ...(vals || {}) }; },
          error: () => { /* keep masked/empty values on error */ }
        });
      }
    }
  }

  cancel() { this.closed.emit(); }

  save() {
    if (!this.provider || !this.workspaceId) { this.cancel(); return; }
    const name = (this.form.value?.name || '').trim();
    if (!name) return;
    const isEdit = !!this.doc?.id;
    const payload: CredentialDoc = isEdit
      ? { id: this.doc!.id, name, providerId: this.doc!.providerId, workspaceId: this.doc!.workspaceId, values: this.values || {} }
      : { id: '' as any, name, providerId: this.provider.id, workspaceId: this.workspaceId, values: this.values || {} } as any;
    this.catalog.saveCredential(payload).subscribe({
      next: (saved: CredentialDoc) => { this.ui.success('Identifiants enregistrés'); this.saved.emit(saved); },
      error: () => this.ui.error('Échec de l\'enregistrement des identifiants')
    });
  }
}
