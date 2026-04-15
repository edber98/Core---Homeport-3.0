import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AgentReport, AiService } from '../ai.service';

/**
 * Carte affichée dans le chat quand un subagent async (ou long job) termine.
 * Le back crée un AiMessage kind='agent_report' → ce composant rend le résumé,
 * les artifacts et un lien vers le canvas Agents pour voir les détails.
 */
@Component({
  selector: 'ai-agent-report-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule],
  template: `
    <div class="report-card" [class.error]="isError()">
      <div class="report-head">
        <span
          nz-icon
          [nzType]="isError() ? 'warning' : 'check-circle'"
          nzTheme="fill"
          class="report-icon"
          [class.icon-error]="isError()">
        </span>
        <div class="report-head-text">
          <div class="report-title">
            {{ isError() ? 'Tâche échouée' : 'Tâche terminée' }}
          </div>
          <div class="report-meta">
            <nz-tag *ngIf="report.subagentType" nzColor="geekblue" class="meta-tag">
              {{ report.subagentType }}
            </nz-tag>
            <nz-tag nzColor="default" class="meta-tag" *ngIf="report.duration != null">
              <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
              {{ formatDuration(report.duration) }}
            </nz-tag>
            <nz-tag nzColor="purple" class="meta-tag" *ngIf="report.toolCount != null && report.toolCount > 0">
              {{ report.toolCount }} outil{{ report.toolCount > 1 ? 's' : '' }}
            </nz-tag>
          </div>
        </div>
      </div>

      <div class="report-summary" *ngIf="report.summary">{{ report.summary }}</div>
      <div class="report-error" *ngIf="isError() && report.error">{{ report.error }}</div>

      <div class="report-artifacts" *ngIf="report.artifacts?.length">
        <div class="artifacts-label">
          <span nz-icon nzType="paper-clip" nzTheme="outline"></span>
          Livrables ({{ report.artifacts!.length }})
        </div>
        <div class="artifact-list">
          <ng-container *ngFor="let a of report.artifacts">
            <a
              *ngIf="a.fileId"
              [href]="ai.fileUrl(a.fileId)"
              target="_blank"
              class="artifact-chip">
              <span nz-icon nzType="download" nzTheme="outline"></span>
              {{ a.label || a.fileId }}
            </a>
            <a
              *ngIf="!a.fileId && a.url"
              [href]="a.url"
              target="_blank"
              class="artifact-chip">
              <span nz-icon nzType="link" nzTheme="outline"></span>
              {{ a.label || a.url }}
            </a>
            <span
              *ngIf="!a.fileId && !a.url && a.label"
              class="artifact-chip artifact-chip-plain">
              {{ a.label }}
            </span>
          </ng-container>
        </div>
      </div>

      <div class="report-actions" *ngIf="report.jobId">
        <button nz-button nzSize="small" nzType="link" (click)="openAgentsCanvas()">
          <span nz-icon nzType="fullscreen" nzTheme="outline"></span>
          Voir le rapport complet
        </button>
      </div>
    </div>
  `,
  styles: [`
    .report-card {
      background: #f6ffed;
      border: 1px solid #d9f7be;
      border-left: 3px solid #52c41a;
      border-radius: 10px;
      padding: 14px 16px;
      margin: 6px 0;
    }
    .report-card.error {
      background: #fff2f0;
      border-color: #ffccc7;
      border-left-color: #ff4d4f;
    }

    .report-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
    .report-icon { font-size: 20px; color: #52c41a; margin-top: 2px; }
    .report-icon.icon-error { color: #ff4d4f; }
    .report-head-text { flex: 1; min-width: 0; }
    .report-title { font-weight: 600; font-size: 14px; color: #262626; }
    .report-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .meta-tag { margin: 0; font-size: 11px; display: inline-flex; align-items: center; gap: 3px; }

    .report-summary {
      font-size: 13px; color: #333; line-height: 1.5;
      white-space: pre-wrap; word-break: break-word;
      margin-bottom: 8px;
    }
    .report-error {
      font-size: 12px; color: #a8071a; background: #fff1f0;
      border: 1px solid #ffa39e; border-radius: 6px; padding: 6px 10px;
      margin-bottom: 8px;
    }

    .report-artifacts { margin-top: 8px; }
    .artifacts-label {
      font-size: 11px; font-weight: 600; color: #555;
      display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px;
    }
    .artifact-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .artifact-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fff; border: 1px solid #e8e8e8; border-radius: 14px;
      padding: 3px 10px; font-size: 12px; color: #1890ff;
      text-decoration: none; transition: border-color .15s, background .15s;
    }
    .artifact-chip:hover { border-color: #1890ff; background: #e6f7ff; }
    .artifact-chip-plain { color: #666; cursor: default; }
    .artifact-chip-plain:hover { border-color: #e8e8e8; background: #fff; }

    .report-actions { margin-top: 8px; }
  `],
})
export class AiAgentReportCardComponent {
  @Input() report!: AgentReport;

  readonly ai = inject(AiService);

  isError(): boolean {
    return this.report?.status === 'error' || this.report?.status === 'cancelled';
  }

  formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m} min ${r}s` : `${m} min`;
  }

  openAgentsCanvas(): void {
    // Ouvre le canvas « Agents » centré sur le job correspondant.
    // Pattern aligné avec les autres widgets : dispatch via sideEvents$.
    try {
      (this.ai as any).sideEvents$?.next({
        type: 'canvas.agents.open',
        jobId: this.report?.jobId,
      });
    } catch { /* non-fatal */ }
  }
}
