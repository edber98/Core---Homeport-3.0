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
import { AiAgentBadgeComponent } from '../agents/ai-agent-badge.component';

@Component({
  selector: 'ai-permission-request-card',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzTagModule, NzCheckboxModule, NzInputModule, NzToolTipModule, AiAgentBadgeComponent],
  template: `
    <!-- ── État ANSWERED : mini bandeau type reasoning-block (1 ligne compacte) ── -->
    <div class="perm-collapsed" *ngIf="request.answer; else activeCard"
         [class.expanded]="answeredExpanded"
         [class.from-subagent]="isFromSubagent()"
         (click)="answeredExpanded = !answeredExpanded">
      <span class="pc-icon" nz-icon [nzType]="answerIcon()" nzTheme="outline"
            [style.color]="answerColorHex()"></span>
      <ai-agent-badge *ngIf="isFromSubagent() && (request.subagentType || request.agentName)"
        [agent]="{
          subagentType: request.subagentType,
          agentName: request.agentName,
          agentEmoji: request.agentEmoji,
          agentColor: request.agentColor,
          agentTagline: request.agentTagline,
          agentFigure: request.agentFigure
        }"
        [compact]="true">
      </ai-agent-badge>
      <span class="pc-tool">{{ toolLabel() }}</span>
      <span class="pc-status" [style.color]="answerColorHex()">· {{ answerLabel() }}</span>
      <!-- Heure DE LA DEMANDE (createdAt du message) — chronologique dans le chat.
           answeredAt = heure du clic user, pas pertinent ici. -->
      <span class="pc-time" *ngIf="requestedAt">{{ requestedAt | date:'shortTime' }}</span>
      <span class="pc-chev" nz-icon [nzType]="answeredExpanded ? 'up' : 'down'" nzTheme="outline"></span>
    </div>

    <!-- Détail expand (affiché si user clique sur le bandeau answered) -->
    <div class="perm-collapsed-detail" *ngIf="request.answer && answeredExpanded">
      <div class="args-block" *ngIf="request.argsPreview">
        <pre class="args-preview">{{ displayArgs() }}</pre>
      </div>
    </div>

    <!-- ── État ACTIF : la card complète (avant réponse) ────────────── -->
    <ng-template #activeCard>
    <div class="perm-card" [class.from-subagent]="isFromSubagent()" [class]="'risk-' + request.risk">
      <!-- Bandeau sous-agent : visible UNIQUEMENT quand la demande vient d'un subagent. -->
      <div class="subagent-banner" *ngIf="isFromSubagent()">
        <span nz-icon nzType="branches" nzTheme="outline" class="branch-icon"></span>
        <span class="banner-text">Demande venant d'un</span>
        <ai-agent-badge
          [agent]="{
            subagentType: request.subagentType,
            agentName: request.agentName,
            agentEmoji: request.agentEmoji,
            agentColor: request.agentColor,
            agentTagline: request.agentTagline,
            agentFigure: request.agentFigure
          }"
          [compact]="true"
          [showTagline]="true"
        ></ai-agent-badge>
      </div>

      <div class="perm-header">
        <span nz-icon [nzType]="riskIcon(request.risk)" nzTheme="outline" class="risk-icon"></span>
        <span class="tool-name">{{ toolLabel() }}</span>
        <nz-tag [nzColor]="riskColor(request.risk)" class="risk-tag">{{ riskLabel(request.risk) }}</nz-tag>
      </div>

      <div class="perm-desc">
        <ng-container *ngIf="request.agentName && !isFromSubagent(); else noAgent">
          <ai-agent-badge
            [agent]="{
              subagentType: request.subagentType,
              agentName: request.agentName,
              agentEmoji: request.agentEmoji,
              agentColor: request.agentColor,
              agentTagline: request.agentTagline,
              agentFigure: request.agentFigure
            }"
            [compact]="true"
          ></ai-agent-badge>
          demande la permission d'exécuter <strong>{{ toolLabel() }}</strong>
        </ng-container>
        <ng-template #noAgent>
          <span *ngIf="!isFromSubagent()">L'assistant demande la permission d'exécuter <strong>{{ toolLabel() }}</strong></span>
          <span *ngIf="isFromSubagent()">veut exécuter <strong>{{ toolLabel() }}</strong></span>
        </ng-template>
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

      <div class="extend-row">
        <label nz-checkbox [(ngModel)]="extendToWorkspace">
          Étendre au workspace
        </label>
        <div class="pattern-input" *ngIf="showPattern()">
          <span class="pattern-label">Chemin autorisé</span>
          <input nz-input [(ngModel)]="pathPattern" nzSize="small" placeholder="/project/*" />
        </div>
      </div>

      <div class="perm-actions">
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
    </div>
    </ng-template>
  `,
  styles: [`
    /* Card compacte, max-width réduite : pas de bandeau pleine-largeur dans le
       flux assistant. Encapsulé dans un cadre arrondi avec fond léger pour
       différencier du raisonnement. */
    :host { display: block; }

    /* État ANSWERED : mini bandeau type reasoning-block. 1 ligne compacte,
       border-left, opacity réduite, cliquable pour expand les détails. */
    .perm-collapsed {
      display: flex; align-items: center; gap: 6px;
      border-left: 3px solid #d9d9d9;
      padding: 4px 10px; margin: 4px 0;
      border-radius: 0 8px 8px 0;
      background: transparent;
      cursor: pointer;
      font-size: 11px; color: #8c8c8c;
      max-width: 100%; box-sizing: border-box;
      opacity: 0.85;
      transition: opacity .15s, background .15s;
    }
    .perm-collapsed:hover { opacity: 1; background: #fafafa; }
    .perm-collapsed.from-subagent { border-left-color: #722ed1; }
    .pc-icon { font-size: 13px; flex-shrink: 0; }
    .pc-tool { font-weight: 600; color: #595959; }
    .pc-status { font-weight: 500; }
    .pc-time { margin-left: auto; font-size: 10px; color: #bfbfbf; font-variant-numeric: tabular-nums; }
    .pc-chev { font-size: 10px; color: #bfbfbf; }
    .perm-collapsed-detail {
      padding: 4px 12px 8px 16px;
      margin: 0 0 6px 0;
      border-left: 3px solid transparent;
    }
    .perm-collapsed-detail .args-preview {
      margin: 0; font-size: 11px; background: #f5f5f5;
      padding: 6px 8px; border-radius: 4px;
      max-height: 200px; overflow: auto;
    }
    .perm-card {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-left: 3px solid #d9d9d9;
      border-radius: 8px;
      padding: 8px 12px;
      margin: 6px 0;
      max-width: 520px;
      opacity: 0.95;
      transition: opacity .2s, border-color .15s, box-shadow .15s;
    }
    .perm-card:hover { opacity: 1; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
    .perm-card.disabled { opacity: 0.7; }
    .perm-card.risk-safe { border-left-color: #52c41a; }
    .perm-card.risk-write { border-left-color: #faad14; }
    .perm-card.risk-destructive { border-left-color: #ff4d4f; }
    .perm-card.risk-elevated { border-left-color: #722ed1; }

    /* Pulse subtil sur le border-left tant que la permission est en attente.
       Signal visuel "j'attends ta réponse" sans être agressif. */
    @keyframes permPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
      50% { box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.08); }
    }
    .perm-card:not(.disabled) {
      animation: permPulse 2.4s ease-in-out infinite;
    }
    .perm-card:not(.disabled).risk-destructive,
    .perm-card:not(.disabled).risk-write {
      /* Pulse plus appuyé pour les risques élevés */
      animation: permPulseHigh 2s ease-in-out infinite;
    }
    @keyframes permPulseHigh {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
      50% { box-shadow: 0 0 0 4px rgba(255, 77, 79, 0.10); }
    }

    /* Card entrée animée : fade-in + slide-up doux à l'apparition */
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 0.95; transform: translateY(0); }
    }
    .perm-card { animation: cardIn 220ms cubic-bezier(.2, .8, .2, 1), permPulse 2.4s ease-in-out 220ms infinite; }
    .perm-card.disabled { animation: cardIn 220ms cubic-bezier(.2, .8, .2, 1); }
    /* Card depuis sous-agent : fond légèrement teinté + bordure renforcée pour
       signaler visuellement que la demande ne vient pas de l'agent principal. */
    .perm-card.from-subagent {
      background: linear-gradient(180deg, #f6f0ff 0%, #fafafa 80%);
      border-color: #d3adf7;
    }
    /* Bandeau sous-agent : affiché en haut de la card quand la demande vient d'un subagent */
    .subagent-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      margin: -8px -12px 8px -12px;
      background: linear-gradient(90deg, rgba(114, 46, 209, 0.08), rgba(114, 46, 209, 0.02));
      border-bottom: 1px solid rgba(114, 46, 209, 0.15);
      border-radius: 8px 8px 0 0;
      font-size: 11px;
      color: #722ed1;
    }
    .subagent-banner .branch-icon {
      color: #722ed1;
      font-size: 12px;
    }
    .subagent-banner .banner-text {
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .perm-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .risk-icon { font-size: 14px; }
    .risk-safe .risk-icon { color: #52c41a; }
    .risk-write .risk-icon { color: #faad14; }
    .risk-destructive .risk-icon { color: #ff4d4f; }
    .risk-elevated .risk-icon { color: #722ed1; }
    .tool-name { font-weight: 600; font-size: 12px; color: #333; flex: 1; }
    .risk-tag { margin: 0; font-size: 10px; }
    .perm-desc { font-size: 11.5px; color: #666; margin-bottom: 6px; line-height: 1.5; }
    .perm-agent-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 1px 8px; border-radius: 10px;
      color: #fff; font-weight: 600; font-size: 11px;
      margin-right: 4px;
    }
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
  /** Date de création du AiMessage (= heure réelle de la demande, ≠ answeredAt). */
  @Input() requestedAt?: string | Date;
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

  /**
   * True si la demande de permission vient d'un sous-agent (escalation parent
   * ou affichage direct). Détecté via childJobId, escalatedFromSubagent ou
   * agentName + subagentType.
   *
   * Utilisé pour afficher le bandeau de provenance hiérarchique et ajuster le
   * style de la card (border-color + fond légèrement teinté).
   */
  isFromSubagent(): boolean {
    const r = this.request as any;
    return !!(r?.childJobId || r?.escalatedFromSubagent || r?.parentJobId);
  }

  toolLabel(): string {
    // Backend fournit déjà le label résolu (execute_tool → titre NodeTemplate).
    if (this.request.toolLabel) return this.request.toolLabel;
    const map: Record<string, string> = {
      read_file: 'Lire un fichier',
      write_file: 'Écrire un fichier',
      delete_file: 'Supprimer un fichier',
      list_directory: 'Lister un dossier',
      execute_code: 'Exécuter du code',
      prepare_code_environment: 'Préparer l\'environnement d\'exécution',
      execute_tool: 'Exécuter un outil',
      run_workflow: 'Lancer un workflow',
      project_write_file: 'Écrire un fichier projet',
      project_read_file: 'Lire un fichier projet',
      project_read_batch: 'Lire plusieurs fichiers projet',
      project_delete: 'Supprimer un fichier projet',
      project_move: 'Déplacer un fichier projet',
      project_create_folder: 'Créer un dossier projet',
      project_stage_for_sandbox: 'Préparer un fichier pour la sandbox',
      project_sync_remote: 'Synchroniser avec le distant',
      install_package: 'Installer un package',
      generate_document: 'Générer un document',
      edit_document: 'Éditer un document',
      search_tools: 'Rechercher un outil',
      get_tool_details: 'Détails d\'un outil',
      spawn_subagent: 'Lancer un sous-agent',
      research_deep: 'Recherche approfondie',
      web_search: 'Rechercher sur le web',
      web_fetch: 'Lire une page web',
      web_download: 'Télécharger un fichier web',
      save_memory: 'Sauvegarder en mémoire',
      save_project_memory: 'Sauvegarder la mémoire projet',
      build_website: 'Construire un site web',
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
      expired: 'Expirée (sans réponse)',
    };
    return map[this.request.answer || ''] || 'Répondu';
  }
  answerColor(): string {
    const a = this.request.answer;
    if (a === 'deny') return 'red';
    if (a === 'expired') return 'orange';
    return 'green';
  }
  answerIcon(): string {
    const a = this.request.answer;
    if (a === 'deny') return 'close-circle';
    if (a === 'expired') return 'clock-circle';
    return 'check-circle';
  }
  answerColorHex(): string {
    const a = this.request.answer;
    if (a === 'deny') return '#cf1322';
    if (a === 'expired') return '#fa8c16';
    return '#389e0d';
  }
  /** État expand/collapse de la card answered (par défaut collapsed). */
  answeredExpanded = false;

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
