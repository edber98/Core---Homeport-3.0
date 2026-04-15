import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AgentReport, AiService } from '../ai.service';
import { AiAgentBadgeComponent } from '../agents/ai-agent-badge.component';

/**
 * Carte affichée dans le chat quand un subagent async (ou long job) termine.
 * Le back crée un AiMessage kind='agent_report' → ce composant rend le résumé,
 * les artifacts et un lien vers le canvas Agents pour voir les détails.
 */
@Component({
  selector: 'ai-agent-report-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, AiAgentBadgeComponent],
  template: `
    <div class="report-card" [class.error]="isError()" [class.expanded]="expanded">
      <button type="button" class="report-head" (click)="toggleExpanded($event)">
        <span
          nz-icon
          [nzType]="isError() ? 'warning' : 'check-circle'"
          nzTheme="fill"
          class="report-icon"
          [class.icon-error]="isError()">
        </span>
        <div class="report-head-text">
          <div class="report-title">
            <ai-agent-badge
              *ngIf="report.subagentType || report.agentName"
              [agent]="{
                subagentType: report.subagentType || undefined,
                agentName: report.agentName,
                agentEmoji: report.agentEmoji,
                agentColor: report.agentColor,
                agentTagline: report.agentTagline,
                agentFigure: report.agentFigure
              }"
              [compact]="true">
            </ai-agent-badge>
            <span class="task-label">{{ isError() ? 'a échoué' : 'a terminé' }}</span>
          </div>
          <div class="report-meta">
            <span class="meta-item" *ngIf="report.duration != null">
              <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
              {{ formatDuration(report.duration) }}
            </span>
            <span class="meta-item" *ngIf="report.toolCount != null && report.toolCount > 0">
              <span nz-icon nzType="tool" nzTheme="outline"></span>
              {{ report.toolCount }} outil{{ report.toolCount > 1 ? 's' : '' }}
            </span>
            <span class="meta-item" *ngIf="report.artifacts?.length">
              <span nz-icon nzType="paper-clip" nzTheme="outline"></span>
              {{ report.artifacts!.length }} livrable{{ report.artifacts!.length > 1 ? 's' : '' }}
            </span>
          </div>
        </div>
        <span nz-icon
              [nzType]="expanded ? 'up' : 'down'"
              nzTheme="outline"
              class="chevron">
        </span>
      </button>

      <div class="report-body" *ngIf="expanded">
        <div class="report-summary markdown"
             *ngIf="report.summary"
             [innerHTML]="renderedSummary()">
        </div>
        <div class="report-error" *ngIf="isError() && report.error">{{ report.error }}</div>

        <div class="report-artifacts" *ngIf="report.artifacts?.length">
          <div class="artifact-list">
            <ng-container *ngFor="let a of report.artifacts">
              <a *ngIf="a.fileId" [href]="ai.fileUrl(a.fileId)" target="_blank" class="artifact-chip">
                <span nz-icon nzType="download" nzTheme="outline"></span>
                {{ a.label || a.fileId }}
              </a>
              <a *ngIf="!a.fileId && a.url" [href]="a.url" target="_blank" class="artifact-chip">
                <span nz-icon nzType="link" nzTheme="outline"></span>
                {{ a.label || a.url }}
              </a>
              <span *ngIf="!a.fileId && !a.url && a.label" class="artifact-chip artifact-chip-plain">
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
    </div>
  `,
  styles: [`
    .report-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-left: 3px solid #e61982;
      border-radius: 10px;
      margin: 6px 0;
      overflow: hidden;
      transition: box-shadow .15s, border-color .15s;
    }
    .report-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.05); }
    .report-card.expanded { box-shadow: 0 2px 10px rgba(230,25,130,.08); }
    .report-card.error { border-left-color: #ff4d4f; }

    .report-head {
      display: flex; align-items: center; gap: 12px;
      width: 100%;
      padding: 12px 14px;
      background: transparent;
      border: 0;
      cursor: pointer;
      text-align: left;
      transition: background .12s;
    }
    .report-head:hover { background: #fafafa; }
    .report-card.expanded .report-head { border-bottom: 1px solid #f0f0f0; }

    .report-icon { font-size: 18px; color: #e61982; flex: 0 0 auto; }
    .report-icon.icon-error { color: #ff4d4f; }
    .report-head-text { flex: 1; min-width: 0; }
    .report-title {
      font-weight: 600; font-size: 13px; color: #262626; line-height: 1.3;
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .task-label { font-weight: 500; color: #8c8c8c; font-size: 12px; }
    .report-meta {
      display: flex; flex-wrap: wrap; gap: 10px;
      margin-top: 3px; font-size: 11px; color: #8c8c8c;
    }
    .meta-item { display: inline-flex; align-items: center; gap: 3px; }
    .meta-item [nz-icon] { font-size: 11px; }
    .chevron { color: #bfbfbf; font-size: 12px; flex: 0 0 auto; transition: color .15s; }
    .report-head:hover .chevron { color: #e61982; }

    .report-body {
      padding: 12px 14px 14px;
      background: #fafafa;
      animation: reportExpand 180ms ease-out;
    }
    @keyframes reportExpand {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .report-summary {
      font-size: 13px; color: #333; line-height: 1.55;
      word-break: break-word;
    }
    .report-summary.markdown :is(h1,h2,h3,h4) { font-size: 14px; font-weight: 600; margin: 10px 0 6px; color: #262626; }
    .report-summary.markdown p { margin: 6px 0; }
    .report-summary.markdown ul, .report-summary.markdown ol { margin: 6px 0; padding-left: 20px; }
    .report-summary.markdown li { margin: 2px 0; }
    .report-summary.markdown code { background: #fff; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
    .report-summary.markdown pre { background: #fff; padding: 8px 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; border: 1px solid #f0f0f0; }
    .report-summary.markdown a { color: #e61982; text-decoration: none; }
    .report-summary.markdown a:hover { text-decoration: underline; }
    .report-summary.markdown table { border-collapse: collapse; margin: 8px 0; font-size: 12px; }
    .report-summary.markdown th { background: #e61982; color: #fff; padding: 6px 10px; text-align: left; }
    .report-summary.markdown td { padding: 5px 10px; border-bottom: 1px solid #e8e8e8; }

    .report-error {
      font-size: 12px; color: #a8071a; background: #fff1f0;
      border: 1px solid #ffa39e; border-radius: 6px; padding: 6px 10px;
      margin-top: 8px;
    }

    .report-artifacts { margin-top: 10px; }
    .artifact-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .artifact-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fff; border: 1px solid #e8e8e8; border-radius: 14px;
      padding: 3px 10px; font-size: 12px; color: #e61982;
      text-decoration: none; transition: all .15s;
    }
    .artifact-chip:hover { border-color: #e61982; background: #fff5fa; }
    .artifact-chip-plain { color: #666; cursor: default; }
    .artifact-chip-plain:hover { border-color: #e8e8e8; background: #fff; }

    .report-actions { margin-top: 8px; }
    .report-actions button { color: #e61982 !important; padding: 0 !important; }
  `],
})
export class AiAgentReportCardComponent {
  @Input() report!: AgentReport;

  readonly ai = inject(AiService);
  expanded = false; // Collapse par défaut — le texte du subagent n'envahit pas le chat

  toggleExpanded(event: Event) {
    event.stopPropagation();
    this.expanded = !this.expanded;
  }

  isError(): boolean {
    return this.report?.status === 'error' || this.report?.status === 'cancelled';
  }

  renderedSummary(): string {
    const src = this.report?.summary || '';
    if (!src) return '';
    try {
      const html = marked.parse(src, { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div','p','strong','em','code','pre','a','ul','ol','li','br','span','b','i','h1','h2','h3','h4','table','thead','tbody','tr','th','td','blockquote','hr'],
        ALLOWED_ATTR: ['href','target','rel','class'],
      });
    } catch { return src; }
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
