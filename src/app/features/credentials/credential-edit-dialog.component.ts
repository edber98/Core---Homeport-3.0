import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AppProvider, CatalogService, CredentialDoc } from '../../services/catalog.service';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'credential-edit-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzModalModule, NzFormModule, NzInputModule, NzButtonModule, DynamicForm],
  template: `
    <nz-modal [nzVisible]="visible" [nzFooter]="null" (nzOnCancel)="cancel()" [nzWidth]="880">
      <ng-container *nzModalTitle>{{ titleText }}</ng-container>
      <div *nzModalContent>
        <form [formGroup]="form" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label>Nom</nz-form-label>
            <nz-form-control><input nz-input formControlName="name" placeholder="Nom de l'identifiant"/></nz-form-control>
          </nz-form-item>
        </form>
        <div *ngIf="provider?.credentialsForm as schema">
          <app-dynamic-form [schema]="schema" [(value)]="values" [hideActions]="true" [disableExpressions]="true"></app-dynamic-form>
        </div>
        <div class="actions">
          <button nz-button (click)="cancel()">Annuler</button>
          <button nz-button nzType="primary" [disabled]="form.invalid" (click)="save()">Enregistrer</button>
        </div>
      </div>
    </nz-modal>
  `,
  styles: [`
    .actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 10px; }
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

  constructor(private fb: FormBuilder, private catalog: CatalogService) {
    this.form = this.fb.group({ name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }) });
  }

  get titleText() { return this.doc ? 'Éditer les credentials' : 'Nouveaux credentials'; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc'] || changes['visible']) {
      const n = (this.doc?.name || '').trim();
      this.form.patchValue({ name: n });
      this.values = this.doc?.values ? { ...(this.doc.values) } : {};
    }
  }

  cancel() { this.closed.emit(); }

  private makeId(base: string) { return (base || 'cred') + '-' + Date.now().toString(36); }

  save() {
    if (!this.provider || !this.workspaceId) { this.cancel(); return; }
    const name = (this.form.value?.name || '').trim();
    if (!name) return;
    const base: CredentialDoc = this.doc ? { ...this.doc } as any : { id: '', name, providerId: this.provider.id, workspaceId: this.workspaceId, values: {} } as any;
    const id = this.doc?.id || this.makeId(this.provider.id);
    const out: CredentialDoc = {
      id,
      name,
      providerId: base.providerId,
      workspaceId: base.workspaceId,
      values: this.values || {}
    };
    this.catalog.saveCredential(out).subscribe(() => this.saved.emit(out));
  }
}

