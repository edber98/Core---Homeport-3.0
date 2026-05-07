import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AccessControlService } from '../../../services/access-control.service';
import { WebhooksBackendService, Webhook, WebhookEvent, WebhookCreatePayload } from './webhooks-backend.service';

@Component({
  selector: 'app-webhooks-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzModalModule, NzInputModule, NzSelectModule,
    NzSwitchModule, NzTagModule, NzIconModule, NzToolTipModule,
  ],
  template: `
    <div class="wh-page">
      <div class="wh-header">
        <div>
          <h1>Webhooks</h1>
          <p class="wh-sub">
            Émet des events HTTP signés HMAC-SHA256 vers des URLs externes quand
            une exécution se termine, qu'un message IA est créé ou qu'un
            déploiement change. Utilisé par le plugin Kinn pour relayer les
            triggers vers d'autres instances.
          </p>
        </div>
        <button nz-button nzType="primary" (click)="openCreateModal()">
          <span nz-icon nzType="plus" nzTheme="outline"></span>
          Nouveau webhook
        </button>
      </div>

      <div class="wh-loading" *ngIf="loading()">
        <span nz-icon nzType="loading" nzTheme="outline"></span>
        Chargement…
      </div>

      <div class="wh-empty" *ngIf="!loading() && webhooks().length === 0">
        <span nz-icon nzType="api" nzTheme="outline" class="wh-empty-ico"></span>
        <p>Aucun webhook configuré pour ce workspace.</p>
        <button nz-button nzType="primary" (click)="openCreateModal()">Créer le premier</button>
      </div>

      <div class="wh-list" *ngIf="!loading() && webhooks().length > 0">
        <div class="wh-card" *ngFor="let w of webhooks()" [class.wh-inactive]="!w.active">
          <div class="wh-card-head">
            <div class="wh-card-title">
              <strong>{{ w.name || '(sans nom)' }}</strong>
              <nz-tag [nzColor]="w.active ? 'green' : 'default'">{{ w.active ? 'Actif' : 'Inactif' }}</nz-tag>
            </div>
            <div class="wh-card-actions">
              <button nz-button nzSize="small" (click)="testWebhook(w)" nz-tooltip="Envoie un event test">
                <span nz-icon nzType="thunderbolt" nzTheme="outline"></span> Test
              </button>
              <button nz-button nzSize="small" (click)="openEditModal(w)">
                <span nz-icon nzType="edit" nzTheme="outline"></span>
              </button>
              <button nz-button nzSize="small" nzDanger (click)="deleteWebhook(w)">
                <span nz-icon nzType="delete" nzTheme="outline"></span>
              </button>
            </div>
          </div>
          <div class="wh-card-url">
            <span nz-icon nzType="link" nzTheme="outline"></span>
            <code>{{ w.url }}</code>
          </div>
          <div class="wh-card-events">
            <nz-tag *ngFor="let e of w.events" nzColor="blue">{{ e }}</nz-tag>
          </div>
          <div class="wh-card-stats">
            <div class="wh-stat">
              <span class="wh-stat-label">Livraisons</span>
              <span class="wh-stat-value">{{ w.deliveryCount }}</span>
            </div>
            <div class="wh-stat" [class.wh-stat-error]="w.failureCount > 0">
              <span class="wh-stat-label">Échecs</span>
              <span class="wh-stat-value">{{ w.failureCount }}</span>
            </div>
            <div class="wh-stat" *ngIf="w.lastSentAt">
              <span class="wh-stat-label">Dernier envoi</span>
              <span class="wh-stat-value">{{ formatDate(w.lastSentAt) }}</span>
            </div>
            <div class="wh-stat" *ngIf="successRate(w) !== null">
              <span class="wh-stat-label">Succès</span>
              <span class="wh-stat-value">{{ successRate(w) }}%</span>
            </div>
          </div>
          <div class="wh-card-error" *ngIf="w.lastError">
            <span nz-icon nzType="warning" nzTheme="outline"></span>
            <span>Dernière erreur : {{ w.lastError }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modale Create / Edit -->
    <nz-modal
      [(nzVisible)]="modalOpen"
      [nzTitle]="editingWebhook ? 'Modifier le webhook' : 'Nouveau webhook'"
      [nzFooter]="null"
      (nzOnCancel)="closeModal()"
      nzWidth="520">
      <ng-container *nzModalContent>
        <div class="wh-form">
          <label class="wh-field">
            <span class="wh-label">Nom</span>
            <input nz-input [(ngModel)]="form.name" placeholder="Ex: Notifs Slack runs" />
          </label>

          <label class="wh-field">
            <span class="wh-label">URL receiver *</span>
            <input nz-input [(ngModel)]="form.url" placeholder="https://hooks.example.com/kinn" />
            <span class="wh-hint">Endpoint HTTPS qui recevra les POST signés</span>
          </label>

          <label class="wh-field">
            <span class="wh-label">Events *</span>
            <nz-select
              nzMode="multiple"
              [(ngModel)]="form.events"
              [nzPlaceHolder]="'Choisis un ou plusieurs events…'"
              style="width:100%">
              <nz-option *ngFor="let e of availableEvents()" [nzValue]="e" [nzLabel]="e"></nz-option>
            </nz-select>
          </label>

          <label class="wh-field">
            <span class="wh-label">Description</span>
            <textarea nz-input [(ngModel)]="form.description" rows="2" placeholder="À quoi sert ce webhook ?"></textarea>
          </label>

          <label class="wh-field wh-field-row">
            <span class="wh-label">Actif</span>
            <nz-switch [(ngModel)]="form.active"></nz-switch>
          </label>

          <details class="wh-filters">
            <summary>Filtres avancés</summary>
            <label class="wh-field">
              <span class="wh-label">Flow IDs (séparés par virgule)</span>
              <input nz-input [(ngModel)]="form._flowIds" placeholder="flw_abc, flw_def" />
            </label>
            <label class="wh-field">
              <span class="wh-label">Statuts run (séparés par virgule)</span>
              <input nz-input [(ngModel)]="form._runStatuses" placeholder="failed, cancelled" />
            </label>
          </details>

          <div class="wh-modal-actions">
            <button nz-button (click)="closeModal()">Annuler</button>
            <button nz-button nzType="primary" (click)="submitForm()" [disabled]="!canSubmit()">
              {{ editingWebhook ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </div>
      </ng-container>
    </nz-modal>

    <!-- Modale "Secret affiché une fois" -->
    <nz-modal
      [(nzVisible)]="secretModalOpen"
      nzTitle="Webhook créé — copie le secret maintenant !"
      [nzFooter]="null"
      [nzClosable]="false"
      [nzMaskClosable]="false"
      nzWidth="560">
      <ng-container *nzModalContent>
        <div class="wh-secret-warn">
          <span nz-icon nzType="warning" nzTheme="fill"></span>
          <strong>Ce secret ne sera plus jamais affiché.</strong> Copie-le maintenant et stocke-le dans ton receiver. Il sert à vérifier la signature HMAC des webhooks reçus.
        </div>
        <div class="wh-secret-box">
          <code>{{ revealedSecret }}</code>
          <button nz-button nzSize="small" (click)="copySecret()">
            <span nz-icon nzType="copy" nzTheme="outline"></span> Copier
          </button>
        </div>
        <div class="wh-secret-info">
          <p><strong>Header attendu côté receiver :</strong></p>
          <code>X-Kinn-Signature: sha256=&lt;hex&gt;</code>
          <p>Vérifie avec <code>HMAC-SHA256(secret, raw_body)</code>.</p>
        </div>
        <div class="wh-modal-actions">
          <button nz-button nzType="primary" (click)="closeSecretModal()">J'ai copié, fermer</button>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    .wh-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .wh-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
    .wh-header h1 { margin: 0 0 6px; font-size: 22px; }
    .wh-sub { color: #595959; font-size: 13px; line-height: 1.5; max-width: 720px; margin: 0; }

    .wh-loading, .wh-empty {
      text-align: center; padding: 48px; color: #8c8c8c;
      background: #fafafa; border: 1px dashed #d9d9d9; border-radius: 8px;
    }
    .wh-empty-ico { font-size: 36px; color: #bfbfbf; display: block; margin-bottom: 12px; }
    .wh-empty p { margin: 0 0 16px; }

    .wh-list { display: flex; flex-direction: column; gap: 12px; }
    .wh-card {
      background: #fff; border: 1px solid #f0f0f0; border-radius: 10px;
      padding: 16px; transition: border-color .15s, box-shadow .15s;
    }
    .wh-card:hover { border-color: #d9d9d9; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .wh-inactive { opacity: 0.6; }

    .wh-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .wh-card-title { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .wh-card-title strong { font-size: 14px; }
    .wh-card-actions { display: flex; gap: 6px; }

    .wh-card-url { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 12px; color: #595959; }
    .wh-card-url code { background: #fafafa; padding: 3px 8px; border-radius: 4px; font-family: monospace; word-break: break-all; }

    .wh-card-events { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }

    .wh-card-stats { display: flex; gap: 24px; padding: 8px 0; border-top: 1px solid #f5f5f5; margin-top: 10px; }
    .wh-stat { display: flex; flex-direction: column; gap: 2px; }
    .wh-stat-label { font-size: 10px; color: #8c8c8c; text-transform: uppercase; letter-spacing: 0.5px; }
    .wh-stat-value { font-size: 13px; font-weight: 600; color: #262626; }
    .wh-stat-error .wh-stat-value { color: #cf1322; }

    .wh-card-error { margin-top: 10px; padding: 8px 12px; background: #fff2f0; border: 1px solid #ffccc7; border-radius: 6px; color: #cf1322; font-size: 12px; display: flex; align-items: center; gap: 6px; }

    .wh-form { display: flex; flex-direction: column; gap: 14px; }
    .wh-field { display: flex; flex-direction: column; gap: 4px; }
    .wh-field-row { flex-direction: row; align-items: center; gap: 12px; }
    .wh-label { font-size: 12px; font-weight: 500; color: #595959; }
    .wh-hint { font-size: 11px; color: #8c8c8c; }
    .wh-filters { padding: 8px 12px; background: #fafafa; border-radius: 6px; }
    .wh-filters summary { cursor: pointer; font-size: 12px; color: #595959; font-weight: 500; }
    .wh-filters .wh-field { margin-top: 8px; }
    .wh-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }

    .wh-secret-warn { display: flex; gap: 10px; padding: 12px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 6px; margin-bottom: 14px; font-size: 13px; line-height: 1.5; }
    .wh-secret-warn span[nz-icon] { color: #d48806; flex-shrink: 0; font-size: 18px; }
    .wh-secret-box { display: flex; align-items: center; gap: 8px; padding: 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; margin-bottom: 14px; }
    .wh-secret-box code { flex: 1; font-family: monospace; font-size: 11px; word-break: break-all; }
    .wh-secret-info { font-size: 12px; color: #595959; }
    .wh-secret-info code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .wh-secret-info p { margin: 6px 0; }
  `],
})
export class WebhooksSettingsComponent implements OnInit {
  private backend = inject(WebhooksBackendService);
  private acl = inject(AccessControlService);
  private modal = inject(NzModalService);
  private msg = inject(NzMessageService);

  webhooks = signal<Webhook[]>([]);
  availableEvents = signal<WebhookEvent[]>([]);
  loading = signal(true);

  modalOpen = false;
  secretModalOpen = false;
  editingWebhook: Webhook | null = null;
  revealedSecret = '';

  form: any = this._emptyForm();

  ngOnInit() {
    this._loadEvents();
    this._loadWebhooks();
  }

  private _loadEvents() {
    this.backend.listEvents().subscribe({
      next: r => this.availableEvents.set(r.events || []),
      error: () => {},
    });
  }

  private _loadWebhooks() {
    const wsId = this.acl.currentWorkspaceId?.();
    if (!wsId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.backend.list(wsId).subscribe({
      next: list => {
        this.webhooks.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: e => {
        this.loading.set(false);
        this.msg.error(`Erreur de chargement : ${e?.message || 'inconnue'}`);
      },
    });
  }

  openCreateModal() {
    this.editingWebhook = null;
    this.form = this._emptyForm();
    this.modalOpen = true;
  }

  openEditModal(w: Webhook) {
    this.editingWebhook = w;
    this.form = {
      name: w.name || '',
      url: w.url,
      description: w.description || '',
      events: [...(w.events || [])],
      active: w.active,
      _flowIds: (w.filters?.flowIds || []).join(', '),
      _runStatuses: (w.filters?.runStatuses || []).join(', '),
    };
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.editingWebhook = null;
  }

  canSubmit(): boolean {
    return !!(this.form.url && /^https?:\/\//i.test(this.form.url) && this.form.events?.length > 0);
  }

  submitForm() {
    const filters: any = {};
    if (this.form._flowIds) filters.flowIds = this.form._flowIds.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (this.form._runStatuses) filters.runStatuses = this.form._runStatuses.split(',').map((s: string) => s.trim()).filter(Boolean);

    const body: WebhookCreatePayload = {
      name: this.form.name,
      url: this.form.url,
      description: this.form.description,
      events: this.form.events,
      active: this.form.active,
      filters,
    };

    if (this.editingWebhook) {
      this.backend.update(this.editingWebhook.id, body).subscribe({
        next: () => {
          this.msg.success('Webhook mis à jour');
          this.closeModal();
          this._loadWebhooks();
        },
        error: e => this.msg.error(`Erreur : ${e?.message || 'inconnue'}`),
      });
    } else {
      const wsId = this.acl.currentWorkspaceId?.();
      if (!wsId) return;
      this.backend.create(wsId, body).subscribe({
        next: w => {
          this.closeModal();
          this._loadWebhooks();
          if (w._secretShownOnce && w.secret) {
            this.revealedSecret = w.secret;
            this.secretModalOpen = true;
          } else {
            this.msg.success('Webhook créé');
          }
        },
        error: e => this.msg.error(`Erreur : ${e?.message || 'inconnue'}`),
      });
    }
  }

  testWebhook(w: Webhook) {
    this.backend.test(w.id).subscribe({
      next: r => {
        this.msg.success(r.message || 'Event test envoyé');
        // Refresh stats après 3s
        setTimeout(() => this._loadWebhooks(), 3000);
      },
      error: e => this.msg.error(`Test échoué : ${e?.message || 'inconnue'}`),
    });
  }

  deleteWebhook(w: Webhook) {
    this.modal.confirm({
      nzTitle: 'Supprimer ce webhook ?',
      nzContent: `"${w.name || w.url}" sera définitivement supprimé.`,
      nzOkText: 'Supprimer',
      nzOkDanger: true,
      nzOnOk: () => {
        this.backend.delete(w.id).subscribe({
          next: () => {
            this.msg.success('Webhook supprimé');
            this._loadWebhooks();
          },
          error: e => this.msg.error(`Erreur : ${e?.message || 'inconnue'}`),
        });
      },
    });
  }

  copySecret() {
    navigator.clipboard.writeText(this.revealedSecret).then(() => {
      this.msg.success('Secret copié');
    });
  }

  closeSecretModal() {
    this.secretModalOpen = false;
    this.revealedSecret = '';
  }

  successRate(w: Webhook): number | null {
    const total = (w.deliveryCount || 0) + (w.failureCount || 0);
    if (total === 0) return null;
    return Math.round((w.deliveryCount / total) * 100);
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; }
  }

  private _emptyForm() {
    return {
      name: '',
      url: '',
      description: '',
      events: [] as WebhookEvent[],
      active: true,
      _flowIds: '',
      _runStatuses: '',
    };
  }
}
