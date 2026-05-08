import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ProfileBackendService, MeProfile, PatSummary } from './profile-backend.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    NzButtonModule, NzCardModule, NzDescriptionsModule, NzIconModule,
    NzInputModule, NzInputNumberModule, NzModalModule, NzPopconfirmModule,
    NzTableModule, NzTagModule, NzToolTipModule,
  ],
  template: `
    <div class="profile-page">
      <div class="profile-header">
        <h1>Profil</h1>
        <p class="profile-sub">
          Tes informations de compte, tes accès aux workspaces et tes Personal Access Tokens (PAT)
          pour les intégrations machine-to-machine.
        </p>
      </div>

      <ng-container *ngIf="me() as profile">
        <nz-card nzTitle="Compte" class="profile-card">
          <nz-descriptions [nzColumn]="2" nzBordered nzSize="small">
            <nz-descriptions-item nzTitle="Email">{{ profile.email }}</nz-descriptions-item>
            <nz-descriptions-item nzTitle="Rôle">
              <nz-tag [nzColor]="profile.role === 'admin' ? 'gold' : 'default'">{{ profile.role }}</nz-tag>
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="ID utilisateur"><code>{{ profile.id }}</code></nz-descriptions-item>
            <nz-descriptions-item nzTitle="Company ID"><code>{{ profile.companyId }}</code></nz-descriptions-item>
          </nz-descriptions>
        </nz-card>

        <nz-card nzTitle="Workspaces" class="profile-card">
          <nz-table #wsTable [nzData]="profile.workspaces" nzSize="small"
                    [nzShowPagination]="false" [nzNoResult]="wsEmptyTpl">
            <thead>
              <tr>
                <th>Nom</th>
                <th>ID</th>
                <th>Rôle</th>
                <th>Défaut</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let w of wsTable.data">
                <td>{{ w.name }}</td>
                <td><code>{{ w.id }}</code></td>
                <td><nz-tag>{{ w.role }}</nz-tag></td>
                <td>
                  <span *ngIf="w.isDefault" nz-icon nzType="star" nzTheme="fill" style="color:#faad14"></span>
                </td>
              </tr>
            </tbody>
          </nz-table>
          <ng-template #wsEmptyTpl>
            <div class="profile-empty">Aucun workspace.</div>
          </ng-template>
        </nz-card>
      </ng-container>

      <nz-card [nzTitle]="patTitle" class="profile-card">
        <ng-template #patTitle>
          <div class="profile-pat-head">
            <span>Personal Access Tokens</span>
            <button nz-button nzType="primary" nzSize="small" (click)="openCreate()">
              <span nz-icon nzType="plus" nzTheme="outline"></span>
              Nouveau PAT
            </button>
          </div>
        </ng-template>

        <p class="profile-pat-help">
          Les PAT te permettent d'appeler l'API Kinn depuis un script ou un service externe avec tes droits utilisateur.
          Le token clair n'est affiché qu'à la création — copie-le immédiatement.
        </p>

        <nz-table [nzData]="pats()" nzSize="small" [nzShowPagination]="false"
                  [nzNoResult]="patEmptyTpl">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Préfixe</th>
              <th>Créé le</th>
              <th>Dernière utilisation</th>
              <th>Expiration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of pats()">
              <td>{{ p.name }}</td>
              <td><code>{{ p.prefix }}…</code></td>
              <td>{{ p.createdAt | date:'short' }}</td>
              <td>{{ p.lastUsedAt ? (p.lastUsedAt | date:'short') : '—' }}</td>
              <td>
                <ng-container *ngIf="p.expiresAt; else noExp">{{ p.expiresAt | date:'short' }}</ng-container>
                <ng-template #noExp>—</ng-template>
              </td>
              <td>
                <button nz-button nzSize="small" nzDanger
                        nz-popconfirm
                        nzPopconfirmTitle="Révoquer ce PAT ?"
                        (nzOnConfirm)="revoke(p)">
                  <span nz-icon nzType="delete" nzTheme="outline"></span>
                </button>
              </td>
            </tr>
          </tbody>
        </nz-table>
        <ng-template #patEmptyTpl>
          <div class="profile-empty">Aucun PAT. Crée-en un pour utiliser l'API Kinn depuis un script.</div>
        </ng-template>
      </nz-card>
    </div>

    <!-- Modale créer PAT -->
    <nz-modal [(nzVisible)]="createOpen"
              nzTitle="Nouveau Personal Access Token"
              [nzFooter]="null"
              (nzOnCancel)="createOpen.set(false)"
              nzWidth="520">
      <ng-container *nzModalContent>
        <ng-container *ngIf="!createdToken(); else showToken">
          <label class="profile-field">
            <span class="profile-label">Nom *</span>
            <input nz-input [(ngModel)]="form.name" placeholder="Ex: Script daily sync" />
          </label>
          <label class="profile-field">
            <span class="profile-label">Expire dans (jours, optionnel)</span>
            <nz-input-number [(ngModel)]="form.expiresInDays"
                             [nzMin]="1" [nzMax]="3650" [nzStep]="1"
                             style="width:100%" />
            <span class="profile-hint">Vide = jamais. Max 3650 jours (~10 ans).</span>
          </label>
          <div class="profile-actions">
            <button nz-button (click)="createOpen.set(false)">Annuler</button>
            <button nz-button nzType="primary"
                    [nzLoading]="creating()"
                    [disabled]="!form.name?.trim()"
                    (click)="submitCreate()">
              Générer le token
            </button>
          </div>
        </ng-container>

        <ng-template #showToken>
          <div class="profile-token-warn">
            <span nz-icon nzType="warning" nzTheme="fill"></span>
            <strong>Copie ce token maintenant — il ne sera plus jamais affiché.</strong>
          </div>
          <div class="profile-token-box">
            <code>{{ createdToken() }}</code>
            <button nz-button nzSize="small" (click)="copyToken()">
              <span nz-icon nzType="copy" nzTheme="outline"></span>
              Copier
            </button>
          </div>
          <div class="profile-actions">
            <button nz-button nzType="primary" (click)="closeAfterReveal()">J'ai copié, fermer</button>
          </div>
        </ng-template>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    .profile-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .profile-header { margin-bottom: 24px; }
    .profile-header h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 600; }
    .profile-sub { color: #6b7280; font-size: 13px; margin: 0; }
    .profile-card { margin-bottom: 16px; }
    .profile-card code { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }
    .profile-pat-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .profile-pat-help { color: #6b7280; font-size: 12px; margin: 0 0 12px 0; }
    .profile-empty { color: #9ca3af; font-style: italic; text-align: center; }
    .profile-field { display: block; margin-bottom: 14px; }
    .profile-label { display: block; font-weight: 500; font-size: 12px; margin-bottom: 4px; }
    .profile-hint { display: block; color: #9ca3af; font-size: 11px; margin-top: 4px; }
    .profile-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .profile-token-warn { display: flex; align-items: center; gap: 8px; background: #fff7e6; color: #d46b08; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
    .profile-token-box { display: flex; align-items: center; gap: 8px; background: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all; }
    .profile-token-box code { flex: 1; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }
  `],
})
export class ProfileComponent implements OnInit {
  private backend = inject(ProfileBackendService);
  private message = inject(NzMessageService);

  me = signal<MeProfile | null>(null);
  pats = signal<PatSummary[]>([]);
  loading = signal(false);

  createOpen = signal(false);
  creating = signal(false);
  createdToken = signal<string | null>(null);
  form: { name: string; expiresInDays: number | null } = { name: '', expiresInDays: null };

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.backend.me().subscribe({
      next: profile => this.me.set(profile),
      error: () => this.message.error('Impossible de charger le profil'),
    });
    this.backend.listPats().subscribe({
      next: list => { this.pats.set(list); this.loading.set(false); },
      error: () => { this.message.error('Impossible de charger les PAT'); this.loading.set(false); },
    });
  }

  openCreate() {
    this.form = { name: '', expiresInDays: null };
    this.createdToken.set(null);
    this.createOpen.set(true);
  }

  submitCreate() {
    const name = this.form.name?.trim();
    if (!name) return;
    this.creating.set(true);
    this.backend.createPat({
      name,
      ...(this.form.expiresInDays ? { expiresInDays: this.form.expiresInDays } : {}),
    }).subscribe({
      next: created => {
        this.createdToken.set(created.token);
        this.creating.set(false);
        this.backend.listPats().subscribe(list => this.pats.set(list));
      },
      error: e => {
        this.creating.set(false);
        this.message.error(e?.message || 'Création échouée');
      },
    });
  }

  copyToken() {
    const t = this.createdToken();
    if (!t) return;
    navigator.clipboard.writeText(t).then(
      () => this.message.success('Token copié'),
      () => this.message.error('Copie échouée'),
    );
  }

  closeAfterReveal() {
    this.createdToken.set(null);
    this.createOpen.set(false);
  }

  revoke(p: PatSummary) {
    this.backend.revokePat(p.id).subscribe({
      next: () => {
        this.message.success(`PAT "${p.name}" révoqué`);
        this.pats.set(this.pats().filter(x => x.id !== p.id));
      },
      error: () => this.message.error('Révocation échouée'),
    });
  }
}
