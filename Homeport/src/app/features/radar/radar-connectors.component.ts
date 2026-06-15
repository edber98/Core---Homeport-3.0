import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { RadarBackendService, RadarFamily, RadarConnector } from '../../services/radar-backend.service';
import { CredentialsBackendService, BackendCredentialSummary } from '../../services/credentials-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';
import { RadarEventsService } from '../../services/radar-events.service';

// Wizard connecteurs — le client remplit chaque famille (catégorie) avec les
// logiciels qu'il détient : provider → credential → test (échantillon réel)
// → première synchronisation (baseline).

@Component({
  selector: 'radar-connectors',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    NzButtonModule, NzTagModule, NzIconModule, NzSelectModule, NzSpinModule,
    NzToolTipModule, NzPopconfirmModule, NzInputModule, NzAlertModule,
  ],
  template: `
  <nz-spin [nzSpinning]="loading">
    <p class="intro">Connectez vos logiciels par catégorie : le radar saura où chercher. Chaque connexion est testée avec un échantillon réel avant la première synchronisation.</p>

    <div class="family" *ngFor="let f of families">
      <div class="family-head">
        <div class="family-info">
          <span class="family-label">{{ f.label }}</span>
          <span class="family-desc">{{ f.description }}</span>
        </div>
        <nz-tag *ngIf="connectorsOf(f.key).length" nzColor="green">Connecté</nz-tag>
        <nz-tag *ngIf="!connectorsOf(f.key).length && f.providers.length" nzColor="default">{{ f.providers.length }} logiciel(s) disponible(s)</nz-tag>
        <nz-tag *ngIf="!f.providers.length" nzColor="default">Bientôt</nz-tag>
      </div>

      <!-- Connecteurs existants -->
      <div class="connector" *ngFor="let c of connectorsOf(f.key)">
        <nz-tag [nzColor]="c.status === 'active' ? 'green' : c.status === 'error' ? 'red' : 'gold'">{{ statusLabel(c.status) }}</nz-tag>
        <span class="connector-label">{{ c.label || c.providerKey }}</span>
        <span class="connector-meta" *ngIf="c.lastPollAt">dernière collecte {{ c.lastPollAt | date:'dd/MM HH:mm' }}</span>
        <span class="connector-err" *ngIf="c.lastError" nz-tooltip [nzTooltipTitle]="c.lastError">⚠ {{ c.lastError | slice:0:60 }}</span>
        <span class="spacer"></span>
        <button nz-button nzSize="small" [nzLoading]="busy[c.id]" (click)="test(c)">Tester</button>
        <button nz-button nzSize="small" [nzLoading]="busy[c.id + ':collect']" (click)="collect(c)">Synchroniser</button>
        <button nz-button nzSize="small" nzDanger nz-popconfirm nzPopconfirmTitle="Déconnecter ce logiciel ?" (nzOnConfirm)="remove(c)">
          <span nz-icon nzType="delete"></span>
        </button>
      </div>

      <!-- Échantillon du dernier test -->
      <nz-alert *ngIf="samples[f.key]" nzType="success" nzShowIcon class="sample-alert"
                [nzMessage]="'Connexion vérifiée (' + samples[f.key].capability + ')'"
                [nzDescription]="sampleTpl"></nz-alert>
      <ng-template #sampleTpl><pre class="sample">{{ samples[f.key].json }}</pre></ng-template>

      <!-- Ajout -->
      <div class="add-zone" *ngIf="f.providers.length">
        <ng-container *ngIf="adding !== f.key">
          <button nz-button nzSize="small" nzType="dashed" (click)="startAdd(f.key)">
            <span nz-icon nzType="plus"></span> Connecter un logiciel
          </button>
        </ng-container>
        <div class="add-form" *ngIf="adding === f.key">
          <nz-select [(ngModel)]="draft.providerKey" nzPlaceHolder="Logiciel" style="min-width: 180px" (ngModelChange)="onProviderChange()">
            <nz-option *ngFor="let p of f.providers" [nzValue]="p.key" [nzLabel]="p.title || p.name"></nz-option>
          </nz-select>
          <nz-select [(ngModel)]="draft.credentialId" nzPlaceHolder="Credential" style="min-width: 200px" nzAllowClear>
            <nz-option *ngFor="let cr of credentialsForProvider" [nzValue]="cr.id" [nzLabel]="cr.name"></nz-option>
          </nz-select>
          <a class="cred-link" [routerLink]="'/credentials'" target="_blank" nz-tooltip nzTooltipTitle="Créer un credential pour ce logiciel puis revenez ici">
            <span nz-icon nzType="plus-circle"></span> Nouveau credential
          </a>
          <input nz-input [(ngModel)]="draft.label" placeholder="Nom (ex: Compta production)" style="max-width: 220px" />
          <button nz-button nzType="primary" class="primary" nzSize="small" [disabled]="!draft.providerKey" [nzLoading]="creating"
                  (click)="create(f.key)">Connecter et tester</button>
          <button nz-button nzSize="small" (click)="adding = null">Annuler</button>
        </div>
      </div>
    </div>
  </nz-spin>
  `,
  styles: [`
    :host { display: block; }
    .intro { color: #595959; font-size: 13px; margin-bottom: 16px; }
    .family { border: 1px solid #f0f0f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; background: #fff; }
    .family-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .family-info { flex: 1; display: flex; flex-direction: column; min-width: 220px; }
    .family-label { font-weight: 600; }
    .family-desc { color: #8c8c8c; font-size: 12px; }
    .connector { display: flex; align-items: center; gap: 8px; padding: 8px 0 0; flex-wrap: wrap; }
    .connector-label { font-weight: 500; }
    .connector-meta { color: #8c8c8c; font-size: 12px; }
    .connector-err { color: #fa8c16; font-size: 12px; cursor: help; }
    .spacer { flex: 1; }
    .add-zone { margin-top: 10px; }
    .add-form { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .cred-link { font-size: 12px; white-space: nowrap; }
    .primary { background:#e61982; border-color:#e61982; color:#fff; }
    .sample-alert { margin-top: 10px; }
    .sample { max-height: 180px; overflow: auto; font-size: 11px; background: #fafafa; padding: 8px; border-radius: 6px; margin: 0; }
  `],
})
export class RadarConnectorsComponent implements OnInit, OnDestroy {
  families: RadarFamily[] = [];
  connectors: RadarConnector[] = [];
  credentials: BackendCredentialSummary[] = [];
  loading = false;
  creating = false;
  adding: string | null = null;
  busy: Record<string, boolean> = {};
  samples: Record<string, { capability: string; json: string }> = {};
  draft: { providerKey?: string; credentialId?: string; label?: string } = {};

  private liveSub?: Subscription;

  constructor(
    private radar: RadarBackendService,
    private creds: CredentialsBackendService,
    private acl: AccessControlService,
    private msg: UiMessageService,
    private radarEvents: RadarEventsService,
  ) {}

  ngOnDestroy(): void { this.liveSub?.unsubscribe(); }

  get wsId(): string { return this.acl.currentWorkspaceId(); }

  ngOnInit(): void {
    this.reload();
    // Temps réel : statut/collecte d'un connecteur (scheduler ou actions manuelles)
    this.liveSub = this.radarEvents.events$.subscribe(ev => {
      if (ev.type === 'connector.updated') this.applyConnectorUpdate(ev.payload);
    });
  }

  private applyConnectorUpdate(p: any): void {
    const c = this.connectors.find(x => x.id === p.connectorId);
    if (c) {
      c.status = p.status;
      if (p.lastPollAt) c.lastPollAt = p.lastPollAt;
      c.lastError = p.lastError;
      this.connectors = [...this.connectors];
    } else {
      this.reloadConnectors();
    }
  }

  reload(): void {
    if (!this.wsId) return;
    this.loading = true;
    this.radar.listFamilies().subscribe({
      next: (f) => { this.families = f.filter(x => x.providers.length || this.connectorsOf(x.key).length); this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.radar.listConnectors(this.wsId).subscribe({ next: (c) => { this.connectors = c; this.reindex(); }, error: () => {} });
    this.creds.list(this.wsId, { limit: 200 }).subscribe({ next: (c) => { this.credentials = c; this.reindex(); }, error: () => {} });
  }

  // Mémoïsé : recalculé quand connectors change (pas à chaque cycle CD)
  private connectorsByFamily: Record<string, RadarConnector[]> = {};
  credentialsForProvider: BackendCredentialSummary[] = [];

  connectorsOf(family: string): RadarConnector[] {
    return this.connectorsByFamily[family] || [];
  }

  private reindex(): void {
    const map: Record<string, RadarConnector[]> = {};
    for (const c of this.connectors) (map[c.family] = map[c.family] || []).push(c);
    this.connectorsByFamily = map;
    this.credentialsForProvider = this.credentials.filter(c => !this.draft.providerKey || c.providerKey === this.draft.providerKey);
  }

  startAdd(family: string): void { this.adding = family; this.draft = {}; }
  onProviderChange(): void { this.draft.credentialId = undefined; this.reindex(); }

  create(family: string): void {
    if (!this.draft.providerKey) return;
    this.creating = true;
    this.radar.createConnector(this.wsId, {
      family, providerKey: this.draft.providerKey,
      credentialId: this.draft.credentialId, label: this.draft.label,
    }).subscribe({
      next: (c) => {
        this.creating = false;
        this.adding = null;
        this.connectors = [...this.connectors, c];
        this.reindex();
        this.msg.success('Connecteur créé — test de connexion en cours…');
        this.test(c);
      },
      error: (e) => { this.creating = false; this.msg.error(e?.error?.message || 'Création impossible'); },
    });
  }

  test(c: RadarConnector): void {
    this.busy[c.id] = true;
    this.radar.testConnector(this.wsId, c.id).subscribe({
      next: (r) => {
        this.busy[c.id] = false;
        this.samples[c.family] = { capability: r.testedCapability || '', json: JSON.stringify(r.sample, null, 2)?.slice(0, 2000) || '' };
        this.msg.success('Connexion vérifiée — voici un échantillon réel de vos données');
        this.reloadConnectors();
      },
      error: (e) => { this.busy[c.id] = false; this.msg.error(e?.error?.message || 'Test échoué'); this.reloadConnectors(); },
    });
  }

  collect(c: RadarConnector): void {
    this.busy[c.id + ':collect'] = true;
    this.radar.collectConnector(this.wsId, c.id).subscribe({
      next: (s: any) => {
        this.busy[c.id + ':collect'] = false;
        if (s.baseline) this.msg.success('Première synchronisation terminée — le radar connaît maintenant votre terrain');
        else if (!s.deltas) this.msg.success('Synchronisation terminée — aucun changement depuis la dernière collecte');
        else this.msg.success(`Synchronisation : ${s.deltas} changement(s) détecté(s)` + (s.significance ? ` → ${s.significance.signals || 0} signal(aux), ${s.significance.ignored || 0} écarté(s)` : ''));
        this.reloadConnectors();
      },
      error: (e) => { this.busy[c.id + ':collect'] = false; this.msg.error(e?.error?.message || 'Synchronisation échouée'); },
    });
  }

  remove(c: RadarConnector): void {
    this.radar.deleteConnector(this.wsId, c.id).subscribe({
      next: () => { this.connectors = this.connectors.filter(x => x.id !== c.id); this.reindex(); this.msg.success('Connecteur supprimé'); },
      error: () => this.msg.error('Suppression impossible'),
    });
  }

  private reloadConnectors(): void {
    this.radar.listConnectors(this.wsId).subscribe({ next: (c) => { this.connectors = c; this.reindex(); }, error: () => {} });
  }

  statusLabel(s: string): string {
    return ({ active: 'Actif', pending: 'À tester', error: 'Erreur', paused: 'En pause' } as any)[s] || s;
  }
}
