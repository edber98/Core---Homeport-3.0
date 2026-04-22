import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiPermissionRequest } from '../ai.service';

@Component({
  selector: 'ai-permission-request-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzTagModule, NzCheckboxModule, NzInputModule, NzToolTipModule],
  template: `
    <div class="perm-card" [class.disabled]="!!request.answer" [class]="'risk-' + request.risk">
      <div class="perm-header">
        <span nz-icon [nzType]="riskIcon(request.risk)" nzTheme="outline" class="risk-icon"></span>
        <span class="tool-name">{{ toolLabel() }}</span>
        <nz-tag [nzColor]="riskColor(request.risk)" class="risk-tag">{{ riskLabel(request.risk) }}</nz-tag>
      </div>

      <div class="perm-desc">
        L'assistant demande la permission d'exécuter <strong>{{ toolLabel() }}</strong>
        <span *ngIf="request.scope?.path"> sur <code>{{ request.scope.path }}</code></span>.
      </div>

      <div class="args-block" *ngIf="request.argsPreview">
        <div class="args-toggle" (click)="argsExpanded = !argsExpanded">
          <span nz-icon [nzType]="argsExpanded ? 'down' : 'right'" nzTheme="outline"></span>
          Détails
        </div>
        <pre class="args-preview" *ngIf="argsExpanded">{{ displayArgs() }}</pre>
        <div class="args-summary" *ngIf="!argsExpanded">{{ summary() }}</div>
      </div>

      <div class="extend-row" *ngIf="!request.answer">
        <label nz-checkbox [(ngModel)]="extendToWorkspace">
          Étendre au workspace
        </label>
        <div class="pattern-input" *ngIf="showPattern()">
          <span class="pattern-label">Chemin autorisé</span>
          <input nz-input [(ngModel)]="pathPattern" nzSize="small" placeholder="/project/*" />
        </div>
      </div>

      <div class="perm-actions" *ngIf="!request.answer">
        <button nz-button nzSize="small" (click)="answer('once')">
          <span nz-icon nzType="check" nzTheme="outline"></span> Une fois
        </button>
        <button nz-button nzSize="small" (click)="answer('session')">
          <span nz-icon nzType="clock-circle" nzTheme="outline"></span> Cette conversation
        </button>
        <button nz-button nzType="primary" nzSize="small" (click)="answer('always')">
          <span nz-icon nzType="check-circle" nzTheme="outline"></span> Toujours
        </button>
        <button nz-button nzSize="small" nzDanger (click)="answer('deny')">
          <span nz-icon nzType="close" nzTheme="outline"></span> Refuser
        </button>
      </div>

      <div class="answered-badge" *ngIf="request.answer">
        <nz-tag [nzColor]="request.answer === 'deny' ? 'red' : 'green'">
          <span nz-icon [nzType]="request.answer === 'deny' ? 'close-circle' : 'check-circle'" nzTheme="outline"></span>
          {{ answerLabel() }} <span class="answered-at" *ngIf="request.answeredAt">— {{ request.answeredAt | date:'short' }}</span>
        </nz-tag>
      </div>
    </div>
  `,
  styles: [`
    /* Style inline raisonnement-block : pas de card, juste une bordure gauche
       colorée selon le niveau de risque. Pas de fond, pas de radius, padding
       minimal, s'intègre dans le flux du message. */
    .perm-card {
      background: transparent;
      border: 0;
      border-left: 3px solid #d9d9d9;
      border-radius: 0;
      padding: 4px 12px;
      margin: 4px 0;
      opacity: 0.95;
      transition: opacity .2s, border-color .15s;
    }
    .perm-card:hover { opacity: 1; }
    .perm-card.disabled { opacity: 0.7; }
    .perm-card.risk-safe { border-left-color: #52c41a; }
    .perm-card.risk-write { border-left-color: #faad14; }
    .perm-card.risk-destructive { border-left-color: #ff4d4f; }
    .perm-card.risk-elevated { border-left-color: #722ed1; }
    .perm-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .risk-icon { font-size: 14px; }
    .risk-safe .risk-icon { color: #52c41a; }
    .risk-write .risk-icon { color: #faad14; }
    .risk-destructive .risk-icon { color: #ff4d4f; }
    .risk-elevated .risk-icon { color: #722ed1; }
    .tool-name { font-weight: 600; font-size: 12px; color: #333; flex: 1; }
    .risk-tag { margin: 0; font-size: 10px; }
    .perm-desc { font-size: 11.5px; color: #666; margin-bottom: 6px; line-height: 1.5; }
    .perm-desc code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 11px; color: #e61982; }
    .args-block { margin: 6px 0; }
    .args-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #999; cursor: pointer; }
    .args-toggle:hover { color: #666; }
    .args-summary { font-size: 11px; color: #999; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .args-preview { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 4px; padding: 6px 8px; font-size: 11px; color: #555; max-height: 180px; overflow: auto; margin: 4px 0 0; }
    .extend-row { margin: 8px 0 6px; display: flex; flex-direction: column; gap: 6px; }
    .pattern-input { display: flex; align-items: center; gap: 6px; }
    .pattern-label { font-size: 11px; color: #999; min-width: 100px; }
    .perm-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .answered-badge { margin-top: 6px; }
    .answered-at { color: #999; font-weight: 400; }
  `],
})
export class AiPermissionRequestCardComponent {
  @Input() request!: AiPermissionRequest;
  @Output() answered = new EventEmitter<{ decision: string; pathPattern?: string }>();

  argsExpanded = false;
  extendToWorkspace = false;
  pathPattern = '';

  ngOnInit() {
    if (this.request?.scope?.path) {
      const p = this.request.scope.path;
      const idx = p.lastIndexOf('/');
      this.pathPattern = idx > 0 ? p.slice(0, idx) + '/*' : p;
    } else if (this.request?.scope?.pattern) {
      this.pathPattern = this.request.scope.pattern;
    }
  }

  answer(decision: string) {
    if (this.request?.answer) return;
    const payload: { decision: string; pathPattern?: string } = { decision };
    if (decision === 'always' && this.extendToWorkspace && this.pathPattern) {
      payload.pathPattern = this.pathPattern;
    }
    this.answered.emit(payload);
  }

  showPattern(): boolean { return this.extendToWorkspace; }

  toolLabel(): string {
    // Backend fournit déjà le label résolu (execute_tool → titre NodeTemplate).
    if (this.request.toolLabel) return this.request.toolLabel;
    const map: Record<string, string> = {
      read_file: 'Lire un fichier',
      write_file: 'Écrire un fichier',
      delete_file: 'Supprimer un fichier',
      list_directory: 'Lister un dossier',
      execute_code: 'Exécuter du code',
      execute_tool: 'Exécuter un outil',
      run_workflow: 'Lancer un workflow',
      project_write_file: 'Écrire un fichier projet',
      project_read_file: 'Lire un fichier projet',
      project_delete: 'Supprimer un fichier projet',
      install_package: 'Installer un package',
      generate_document: 'Générer un document',
    };
    return map[this.request.toolName] || this.request.toolName;
  }

  riskIcon(r: string) {
    if (r === 'safe') return 'safety-certificate';
    if (r === 'write') return 'edit';
    if (r === 'destructive') return 'warning';
    if (r === 'elevated') return 'thunderbolt';
    return 'question-circle';
  }

  riskColor(r: string) {
    if (r === 'safe') return 'green';
    if (r === 'write') return 'orange';
    if (r === 'destructive') return 'red';
    if (r === 'elevated') return 'purple';
    return 'default';
  }

  riskLabel(r: string) {
    const map: Record<string, string> = {
      safe: 'Sans risque',
      write: 'Écriture',
      destructive: 'Destructif',
      elevated: 'Privilégié',
    };
    return map[r] || r;
  }

  answerLabel(): string {
    const map: Record<string, string> = {
      once: 'Autorisé une fois',
      session: 'Autorisé pour la conversation',
      always: 'Toujours autorisé',
      deny: 'Refusé',
    };
    return map[this.request.answer || ''] || 'Répondu';
  }

  summary(): string {
    const raw = String(this.request.argsPreview || '').replace(/\s+/g, ' ').trim();
    return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
  }

  displayArgs(): string {
    try {
      const p = JSON.parse(this.request.argsPreview);
      return JSON.stringify(p, null, 2);
    } catch {
      return String(this.request.argsPreview || '');
    }
  }
}
