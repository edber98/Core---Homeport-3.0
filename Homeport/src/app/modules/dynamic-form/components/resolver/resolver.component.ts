import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  FormResolversBackendService,
  ResolverResult,
  ResolverVariant,
} from '../../../../services/form-resolvers-backend.service';

interface ResolverActionConfig {
  id: string;
  label: string;
  confirm?: boolean;
  requiresAdmin?: boolean;
}
interface ResolverFieldConfig {
  type: 'resolver';
  key: string;
  label?: string;
  resolver: string;
  variants?: Array<{ id: string; label: string }>;
  actions?: ResolverActionConfig[];
  copyable?: boolean;
  secret?: boolean;
}

@Component({
  selector: 'df-resolver',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzIconModule, NzInputModule, NzPopconfirmModule,
    NzTabsModule, NzToolTipModule,
  ],
  template: `
    <div class="dfr-host">
      <div class="dfr-header" *ngIf="loading()">
        <span nz-icon nzType="loading" nzTheme="outline"></span>
        Résolution…
      </div>

      <div class="dfr-info" *ngIf="needsSave()">
        <span nz-icon nzType="info-circle" nzTheme="outline"></span>
        Sauvegarde le flow pour générer cette valeur. Elle sera persistante après création.
      </div>

      <div class="dfr-error" *ngIf="error() && !needsSave()">
        <span nz-icon nzType="warning" nzTheme="outline"></span>
        {{ error() }}
        <button nz-button nzSize="small" (click)="refresh()">Réessayer</button>
      </div>

      <ng-container *ngIf="!loading() && !error() && result()">
        <ng-container *ngIf="(result()!.variants || []).length > 1; else singleTpl">
          <nz-tabset [(nzSelectedIndex)]="selectedVariantIdx" nzSize="small">
            <nz-tab *ngFor="let v of result()!.variants; let i = index" [nzTitle]="v.label">
              <ng-container *ngTemplateOutlet="valueTpl; context: { $implicit: v }"></ng-container>
            </nz-tab>
          </nz-tabset>
        </ng-container>
        <ng-template #singleTpl>
          <ng-container *ngTemplateOutlet="valueTpl; context: { $implicit: result()!.variants[0] }"></ng-container>
        </ng-template>

        <div class="dfr-actions">
          <button nz-button nzSize="small" (click)="refresh()" nz-tooltip="Re-résoudre">
            <span nz-icon nzType="reload" nzTheme="outline"></span>
            Rafraîchir
          </button>
          <ng-container *ngFor="let act of (field.actions || [])">
            <button *ngIf="!act.confirm" nz-button nzSize="small" nzDanger
                    (click)="runAction(act.id)">
              <span nz-icon nzType="thunderbolt" nzTheme="outline"></span>
              {{ act.label }}
            </button>
            <button *ngIf="act.confirm" nz-button nzSize="small" nzDanger
                    nz-popconfirm
                    [nzPopconfirmTitle]="confirmText(act)"
                    (nzOnConfirm)="runAction(act.id)">
              <span nz-icon nzType="thunderbolt" nzTheme="outline"></span>
              {{ act.label }}
            </button>
          </ng-container>
        </div>
      </ng-container>

      <ng-template #valueTpl let-v>
        <div class="dfr-value-row">
          <input nz-input readonly
                 [value]="displayValue(v.value)"
                 [type]="field.secret && !revealed() ? 'password' : 'text'" />
          <button *ngIf="field.secret" nz-button nzSize="small"
                  (click)="revealed.set(!revealed())"
                  [nz-tooltip]="revealed() ? 'Masquer' : 'Afficher'">
            <span nz-icon [nzType]="revealed() ? 'eye-invisible' : 'eye'" nzTheme="outline"></span>
          </button>
          <button *ngIf="field.copyable !== false" nz-button nzSize="small"
                  (click)="copy(v.value)" nz-tooltip="Copier">
            <span nz-icon nzType="copy" nzTheme="outline"></span>
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dfr-host { display: flex; flex-direction: column; gap: 8px; }
    .dfr-header { color: #6b7280; font-size: 12px; display: flex; align-items: center; gap: 6px; }
    .dfr-info { color: #6b7280; font-size: 12px; display: flex; align-items: center; gap: 6px; background: #fffbe6; padding: 8px 10px; border-radius: 4px; border: 1px solid #ffe58f; }
    .dfr-error { color: #cf1322; font-size: 12px; display: flex; align-items: center; gap: 8px; }
    .dfr-value-row { display: flex; gap: 6px; align-items: center; }
    .dfr-value-row input { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }
    .dfr-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  `],
})
export class ResolverComponent implements OnInit {
  @Input({ required: true }) field!: ResolverFieldConfig;
  @Input() ctx: any = {};

  private backend = inject(FormResolversBackendService);
  private message = inject(NzMessageService);

  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<ResolverResult | null>(null);
  needsSave = signal(false);
  revealed = signal(false);
  selectedVariantIdx = 0;

  ngOnInit() { this.refresh(); }

  private getResolverContext() {
    const flowId = String(this.ctx?.flowId || this.ctx?._flowId || '').trim();
    const nodeId = String(this.ctx?.nodeId || this.ctx?._nodeId || '').trim();
    return { flowId, nodeId };
  }

  refresh() {
    const { flowId, nodeId } = this.getResolverContext();
    if (!flowId || !nodeId) {
      // Le flow n'a pas encore été sauvegardé : pas d'_id en base, donc le
      // resolver ne peut rien produire. Affiche un message clair.
      this.needsSave.set(true);
      this.error.set(null);
      this.result.set(null);
      return;
    }
    this.needsSave.set(false);
    this.loading.set(true);
    this.error.set(null);
    this.backend.resolve(this.field.resolver, { flowId, nodeId }).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: e => { this.error.set(e?.message || 'Échec de la résolution'); this.loading.set(false); },
    });
  }

  runAction(actionId: string) {
    const { flowId, nodeId } = this.getResolverContext();
    if (!flowId || !nodeId) return;
    this.loading.set(true);
    this.backend.runAction(this.field.resolver, actionId, { flowId, nodeId }).subscribe({
      next: r => {
        this.result.set(r);
        this.loading.set(false);
        this.message.success('Action exécutée');
      },
      error: e => {
        this.error.set(e?.message || 'Action échouée');
        this.loading.set(false);
        this.message.error(e?.message || 'Action échouée');
      },
    });
  }

  copy(value: string) {
    if (!value) return;
    navigator.clipboard.writeText(value).then(
      () => this.message.success('Copié'),
      () => this.message.error('Copie échouée'),
    );
  }

  displayValue(v: string): string {
    if (!v) return '';
    return v;
  }

  confirmText(act: ResolverActionConfig): string {
    return `${act.label} — confirmer ?`;
  }
}
