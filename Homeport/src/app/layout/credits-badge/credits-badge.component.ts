import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CreditsBackendService, CreditsMeResponse } from '../../services/credits-backend.service';

const POLL_INTERVAL_MS = 30_000;

@Component({
  selector: 'credits-badge',
  standalone: true,
  imports: [CommonModule, NzPopoverModule, NzToolTipModule, NzIconModule],
  template: `
    <ng-container *ngIf="visible">
      <button
        class="hdr-icon-btn credits-btn"
        nz-popover
        [nzPopoverTrigger]="'click'"
        [nzPopoverPlacement]="'bottomRight'"
        [nzPopoverOverlayClassName]="'hdr-popover'"
        [nzPopoverContent]="creditsTpl"
        (click)="refresh()"
        nz-tooltip
        [nzTooltipTitle]="tooltipTitle"
      >
        <span class="credits-icon" nz-icon nzType="thunderbolt" nzTheme="outline"></span>
        <span class="credits-value" *ngIf="primaryValue !== null">{{ primaryValue | number }}</span>
        <span class="credits-value muted" *ngIf="primaryValue === null && loading">…</span>
      </button>
    </ng-container>

    <ng-template #creditsTpl>
      <div class="credits-panel">
        <div class="credits-hdr">
          <span>Mes crédits</span>
          <button class="credits-refresh" (click)="refresh()" [disabled]="loading" title="Rafraîchir">
            <span nz-icon nzType="reload" nzTheme="outline"></span>
          </button>
        </div>

        <ng-container *ngIf="state; else loadingTpl">
          <!-- Erreur ou Panel injoignable -->
          <div class="credits-error" *ngIf="state.error">
            <i nz-icon nzType="warning" nzTheme="outline"></i>
            Impossible de récupérer le solde.
          </div>

          <!-- Quota utilisateur (si défini) -->
          <div class="credits-section" *ngIf="state.userQuota?.enabled">
            <div class="credits-section-title">Mon quota mensuel</div>
            <div class="credits-bar">
              <div
                class="credits-bar-fill"
                [style.width.%]="quotaBarPct"
                [class.warn]="quotaBarPct > 75"
                [class.danger]="quotaBarPct >= 95"
              ></div>
            </div>
            <div class="credits-bar-label">
              <span>{{ state.userQuota!.remaining | number }} / {{ state.userQuota!.monthlyMax | number }} cr restants</span>
              <span class="muted" *ngIf="state.userQuota!.cycleEnd">Reset le {{ formatDate(state.userQuota!.cycleEnd) }}</span>
            </div>
          </div>

          <!-- Solde du wallet client (toujours affiché) -->
          <div class="credits-section">
            <div class="credits-section-title">
              {{ state.userQuota?.enabled ? 'Pool équipe' : 'Solde équipe' }}
            </div>
            <div class="credits-balance-row" *ngIf="state.balance; else noWallet">
              <div class="credits-balance-line">
                <span class="muted">Inclus</span>
                <strong>{{ state.balance.included | number }} cr</strong>
              </div>
              <div class="credits-balance-line">
                <span class="muted">Rechargé</span>
                <strong>{{ state.balance.recharged | number }} cr</strong>
              </div>
              <div class="credits-balance-line total">
                <span>Total disponible</span>
                <strong>{{ state.balance.total | number }} cr</strong>
              </div>
            </div>
            <ng-template #noWallet>
              <div class="muted">Aucun wallet provisionné.</div>
            </ng-template>
          </div>

          <!-- Lien Panel -->
          <div class="credits-foot" *ngIf="state.detailsUrl">
            <a [href]="state.detailsUrl" target="_blank" rel="noopener">
              Voir détails dans le Panel
              <span nz-icon nzType="export" nzTheme="outline"></span>
            </a>
          </div>

          <!-- Mode mock dev (visuel discret) -->
          <div class="credits-mocked" *ngIf="state.mocked">
            <i nz-icon nzType="experiment" nzTheme="outline"></i>
            Mode standalone (mocks)
          </div>
        </ng-container>

        <ng-template #loadingTpl>
          <div class="muted">Chargement…</div>
        </ng-template>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }
    .credits-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0 10px; height: 32px; min-width: 32px;
      border-radius: 8px;
    }
    .credits-btn .credits-icon { font-size: 16px; }
    .credits-btn .credits-value {
      font-weight: 600; font-size: 13px; line-height: 1;
    }
    .credits-btn .credits-value.muted { color: rgba(0,0,0,.45); font-weight: 400; }

    .credits-panel { width: 300px; padding: 4px; }
    .credits-hdr {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 4px 10px; font-weight: 600; font-size: 14px;
      border-bottom: 1px solid rgba(0,0,0,.06); margin-bottom: 10px;
    }
    .credits-refresh {
      border: none; background: transparent; cursor: pointer; color: rgba(0,0,0,.55);
      padding: 2px 6px; border-radius: 4px;
    }
    .credits-refresh:hover { background: rgba(0,0,0,.04); color: rgba(0,0,0,.85); }
    .credits-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

    .credits-section { margin-bottom: 12px; }
    .credits-section-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
      color: rgba(0,0,0,.55); margin-bottom: 6px;
    }
    .credits-bar {
      height: 8px; background: rgba(0,0,0,.06); border-radius: 4px;
      overflow: hidden; margin-bottom: 4px;
    }
    .credits-bar-fill {
      height: 100%; background: #2c7be5; transition: width .3s ease;
    }
    .credits-bar-fill.warn { background: #f5a623; }
    .credits-bar-fill.danger { background: #e25555; }
    .credits-bar-label {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 12px;
    }
    .credits-bar-label .muted { color: rgba(0,0,0,.45); font-size: 11px; }

    .credits-balance-row { display: flex; flex-direction: column; gap: 4px; }
    .credits-balance-line {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px;
    }
    .credits-balance-line.total {
      margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,.08);
      font-weight: 600;
    }
    .muted { color: rgba(0,0,0,.55); }

    .credits-foot {
      padding-top: 10px; border-top: 1px solid rgba(0,0,0,.06);
      text-align: right;
    }
    .credits-foot a {
      font-size: 12px; color: #2c7be5; text-decoration: none;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .credits-foot a:hover { text-decoration: underline; }

    .credits-error {
      color: #b91c1c; font-size: 12px; display: flex; align-items: center; gap: 6px;
      padding: 6px 0;
    }
    .credits-mocked {
      margin-top: 8px; padding-top: 8px;
      border-top: 1px dashed rgba(0,0,0,.06);
      font-size: 11px; color: rgba(0,0,0,.4);
      display: flex; align-items: center; gap: 4px;
    }
  `]
})
export class CreditsBadgeComponent implements OnInit, OnDestroy {
  state: CreditsMeResponse | null = null;
  loading = false;
  private pollHandle: any = null;
  // Garde le badge masqué tant que l'API n'a pas confirmé que les crédits
  // sont enabled (évite un flash en mode standalone dev).
  visible = false;

  constructor(
    private credits: CreditsBackendService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  refresh(): void {
    if (this.loading) return;
    this.loading = true;
    this.credits.getMe().subscribe({
      next: (r) => {
        this.state = r;
        // Affiche le badge seulement si l'app a les crédits activés
        // (sinon mode standalone dev sans Panel → on cache complètement).
        this.visible = !!r?.enabled;
        this.loading = false;
        try { this.cdr.detectChanges(); } catch {}
      },
      error: () => {
        this.loading = false;
        try { this.cdr.detectChanges(); } catch {}
      }
    });
  }

  /** Valeur principale affichée dans la pilule de la topnav. */
  get primaryValue(): number | null {
    if (!this.state) return null;
    if (this.state.userQuota?.enabled) return Math.max(0, Number(this.state.userQuota.remaining || 0));
    if (this.state.balance) return Math.max(0, Number(this.state.balance.total || 0));
    return null;
  }

  /** Tooltip survol pilule. */
  get tooltipTitle(): string {
    if (!this.state) return 'Crédits';
    if (this.state.userQuota?.enabled) return `${this.state.userQuota.remaining} crédits restants ce mois (quota personnel)`;
    if (this.state.balance) return `${this.state.balance.total} crédits disponibles (pool équipe)`;
    return 'Crédits';
  }

  /** Pourcentage CONSOMMÉ du quota user pour la barre de progression. */
  get quotaBarPct(): number {
    const q = this.state?.userQuota;
    if (!q || !q.monthlyMax) return 0;
    return Math.min(100, Math.round((q.consumedThisCycle / q.monthlyMax) * 100));
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  }
}
