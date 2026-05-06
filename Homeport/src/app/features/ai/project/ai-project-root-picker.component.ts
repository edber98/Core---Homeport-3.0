import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';
import { AiProjectTreeBrowserComponent } from './ai-project-tree-browser.component';

@Component({
  selector: 'ai-project-root-picker',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzModalModule, NzButtonModule, NzIconModule,
    NzStepsModule, NzRadioModule, NzSelectModule, NzInputModule, AiProjectTreeBrowserComponent,
  ],
  template: `
    <div class="picker-body">
      <nz-steps [nzCurrent]="step" nzSize="small">
        <nz-step nzTitle="Connecteur"></nz-step>
        <nz-step nzTitle="Identifiants"></nz-step>
        <nz-step nzTitle="Dossier"></nz-step>
        <nz-step nzTitle="Confirmation"></nz-step>
      </nz-steps>

      <div class="step-content">
        <!-- Step 0: Connector -->
        <div *ngIf="step === 0" class="cnx-grid">
          <div *ngFor="let c of connectors" class="cnx-card" [class.selected]="selectedConnector === c.type"
            (click)="selectedConnector = c.type">
            <img *ngIf="c.icon" [src]="c.icon" [alt]="c.label" class="cnx-logo" />
            <span *ngIf="!c.icon" nz-icon [nzType]="connectorIcon(c.type)" nzTheme="outline" class="cnx-icon"></span>
            <span class="cnx-label">{{ c.label }}</span>
          </div>
        </div>

        <!-- Step 1: Credential -->
        <div *ngIf="step === 1" class="cred-step">
          <label>Identifiants</label>
          <nz-select [(ngModel)]="selectedCredentialId" nzPlaceHolder="Choisir un identifiant" style="width:100%">
            <nz-option *ngFor="let opt of availableCredentials()" [nzValue]="opt.id" [nzLabel]="opt.label || opt.name"></nz-option>
          </nz-select>
          <div class="hint" *ngIf="!availableCredentials().length">
            Aucun identifiant {{ selectedConnector }} disponible. Créez-en un dans le menu Identifiants.
          </div>
        </div>

        <!-- Step 2: Browse -->
        <div *ngIf="step === 2" class="browse-step">
          <ai-project-tree-browser
            [connectorType]="selectedConnector"
            [credentialId]="selectedCredentialId"
            (pathSelected)="selectedPath = $event">
          </ai-project-tree-browser>
          <div class="selected-path-row">
            <label>Chemin sélectionné</label>
            <input nz-input [(ngModel)]="selectedPath" placeholder="/mon-projet" />
          </div>
        </div>

        <!-- Step 3: Confirm -->
        <div *ngIf="step === 3" class="confirm-step">
          <label>Nom du projet</label>
          <input nz-input [(ngModel)]="label" placeholder="Mon projet" />
          <div class="summary">
            <div><strong>Connecteur</strong> {{ connectorLabel(selectedConnector) }}</div>
            <div><strong>Chemin</strong> <code>{{ selectedPath }}</code></div>
          </div>
        </div>
      </div>

      <div class="picker-actions">
        <button nz-button (click)="close.emit()">Annuler</button>
        <button nz-button *ngIf="step > 0" (click)="step = step - 1">Précédent</button>
        <button nz-button nzType="primary" *ngIf="step < 3" (click)="next()" [disabled]="!canNext()">Suivant</button>
        <button nz-button nzType="primary" *ngIf="step === 3" (click)="confirm()" [disabled]="!label.trim() || submitting">
          <span nz-icon *ngIf="submitting" nzType="loading" nzTheme="outline"></span>
          Créer le projet
        </button>
      </div>
    </div>
  `,
  styles: [`
    .picker-body { padding: 12px; }
    .step-content { margin: 16px 0; min-height: 200px; }
    .cnx-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .cnx-card { border: 1px solid #f0f0f0; border-radius: 8px; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all .15s; }
    .cnx-card:hover { border-color: #e61982; }
    .cnx-card.selected { border-color: #e61982; background: rgba(230, 25, 130, 0.04); }
    .cnx-icon { font-size: 28px; color: #1677ff; }
    .cnx-card.selected .cnx-icon { color: #e61982; }
    .cnx-logo { width: 36px; height: 36px; object-fit: contain; border-radius: 6px; }
    .cnx-label { font-size: 13px; font-weight: 500; }
    .cred-step label, .confirm-step label, .selected-path-row label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
    .selected-path-row { margin-top: 10px; }
    .summary { margin-top: 12px; font-size: 12px; background: #fafafa; padding: 10px; border-radius: 6px; }
    .summary div { margin: 3px 0; }
    .summary strong { display: inline-block; min-width: 110px; color: #999; font-weight: 500; }
    .summary code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; }
    .hint { font-size: 11px; color: #999; margin-top: 8px; }
    .picker-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f5f5f5; }
  `],
})
export class AiProjectRootPickerComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ threadId: string; root: any }>();

  public ai = inject(AiService);
  private nzMsg = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  step = 0;
  connectors: Array<{ type: string; label: string; icon?: string; requiresCredential: boolean; credentialOptions: any[] }> = [];
  selectedConnector = '';
  selectedCredentialId = '';
  selectedPath = '/';
  label = '';
  submitting = false;

  ngOnInit() {
    this.ai.listProjectConnectors().subscribe({
      next: (resp: any) => {
        const raw = Array.isArray(resp) ? resp : (resp?.connectors || []);
        this.connectors = raw.map((c: any) => ({
          type: c.type || c.key,
          label: c.label || c.name || c.title || c.key,
          icon: c.icon || c.iconUrl || c.logo || null,
          requiresCredential: c.requiresCredential !== false,
          credentialOptions: (c.credentialOptions || c.credentials || []).map((co: any) => ({
            id: co.id || co._id,
            label: co.label || co.name,
            name: co.name,
          })),
        }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.connectors = [
          { type: 'nextcloud', label: 'Nextcloud', requiresCredential: true, credentialOptions: [] },
          { type: 'google_drive', label: 'Google Drive', requiresCredential: true, credentialOptions: [] },
          { type: 'dropbox', label: 'Dropbox', requiresCredential: true, credentialOptions: [] },
          { type: 'onedrive_sharepoint', label: 'OneDrive / SharePoint', requiresCredential: true, credentialOptions: [] },
        ];
      },
    });
  }

  availableCredentials(): any[] {
    const c = this.connectors.find(c => c.type === this.selectedConnector);
    return c?.credentialOptions || [];
  }

  connectorIcon(type: string) {
    const map: Record<string, string> = {
      nextcloud: 'cloud',
      google_drive: 'google',
      dropbox: 'dropbox',
      onedrive_sharepoint: 'windows',
    };
    return map[type] || 'cloud';
  }

  connectorLabel(type: string): string {
    return this.connectors.find(c => c.type === type)?.label || type;
  }

  canNext(): boolean {
    if (this.step === 0) return !!this.selectedConnector;
    if (this.step === 1) return !!this.selectedCredentialId;
    if (this.step === 2) return !!this.selectedPath;
    return true;
  }

  next() {
    if (this.step < 3) this.step++;
    if (this.step === 3 && !this.label) {
      this.label = this.selectedPath.split('/').filter(Boolean).pop() || 'Mon projet';
    }
  }

  async confirm() {
    if (this.submitting) return;
    this.submitting = true;
    try {
      const thread = await this.ai.createThread('project', { title: this.label });
      const { root } = await this.ai.createProjectRoot(thread._id || thread.id, {
        connectorType: this.selectedConnector as any,
        credentialId: this.selectedCredentialId,
        rootPath: this.selectedPath,
        label: this.label,
      });
      this.nzMsg.success('Projet créé');
      this.created.emit({ threadId: thread._id || thread.id, root });
    } catch (e: any) {
      this.nzMsg.error(e?.message || 'Erreur lors de la création');
    } finally {
      this.submitting = false;
    }
  }
}
