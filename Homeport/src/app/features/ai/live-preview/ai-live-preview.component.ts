import { Component, ChangeDetectionStrategy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiStructuredMessageComponent } from '../structured/ai-structured-message.component';
import { AiDiagramRendererComponent } from '../diagram/ai-diagram-renderer.component';
import { AiLivePlanPreviewComponent } from './ai-live-plan-preview.component';
import { AiLiveDocumentPreviewComponent } from './ai-live-document-preview.component';
import { AiLiveResearchPreviewComponent } from './ai-live-research-preview.component';
import { AiLiveSubagentPreviewComponent } from './ai-live-subagent-preview.component';
import { AiLiveDownloadPreviewComponent } from './ai-live-download-preview.component';
import { AiLiveCodePreviewComponent } from './ai-live-code-preview.component';

export type LivePreviewType =
  | 'structured' | 'diagram' | 'plan' | 'document'
  | 'research' | 'subagent' | 'download' | 'code';

export type LivePreviewStatus = 'building' | 'running' | 'success' | 'error';

const PREVIEW_MAP: Record<string, LivePreviewType> = {
  render_structured: 'structured',
  generate_diagram:  'diagram',
  propose_plan:      'plan',
  generate_document: 'document',
  edit_document:     'document',
  research_deep:     'research',
  spawn_subagent:    'subagent',
  web_download:      'download',
  execute_code:      'code',
};

export function detectPreviewType(toolName: string | undefined | null): LivePreviewType | null {
  if (!toolName) return null;
  return PREVIEW_MAP[toolName] || null;
}

@Component({
  selector: 'ai-live-preview',
  standalone: true,
  imports: [
    CommonModule,
    AiStructuredMessageComponent,
    AiDiagramRendererComponent,
    AiLivePlanPreviewComponent,
    AiLiveDocumentPreviewComponent,
    AiLiveResearchPreviewComponent,
    AiLiveSubagentPreviewComponent,
    AiLiveDownloadPreviewComponent,
    AiLiveCodePreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai-live-preview"
         [attr.data-type]="previewType"
         [attr.data-status]="status || 'building'">
      <div class="live-body" [class.stale]="adjusting">
        <ng-container [ngSwitch]="previewType">
          <ai-structured-message *ngSwitchCase="'structured'"
            [data]="structuredData()">
          </ai-structured-message>

          <ai-diagram-renderer *ngSwitchCase="'diagram'"
            [mermaid]="displayData?.mermaid || ''"
            [title]="displayData?.title || ''"
            [interactive]="false">
          </ai-diagram-renderer>

          <ai-live-plan-preview *ngSwitchCase="'plan'"
            [data]="displayData">
          </ai-live-plan-preview>

          <ai-live-document-preview *ngSwitchCase="'document'"
            [data]="displayData">
          </ai-live-document-preview>

          <ai-live-research-preview *ngSwitchCase="'research'"
            [data]="displayData">
          </ai-live-research-preview>

          <ai-live-subagent-preview *ngSwitchCase="'subagent'"
            [data]="displayData">
          </ai-live-subagent-preview>

          <ai-live-download-preview *ngSwitchCase="'download'"
            [data]="displayData">
          </ai-live-download-preview>

          <ai-live-code-preview *ngSwitchCase="'code'"
            [data]="displayData">
          </ai-live-code-preview>
        </ng-container>
      </div>
      <div class="adjusting-badge" *ngIf="adjusting" [attr.title]="'Ajustement en cours…'">
        <span class="spinner"></span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .ai-live-preview { min-height: 0; position: relative; transition: opacity .12s ease; }
    .ai-live-preview[data-status="error"] { opacity: .75; }
    .live-body.stale { opacity: 0.92; }
    .adjusting-badge {
      position: absolute; bottom: 8px; right: 8px; z-index: 2;
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(230, 25, 130, 0.12); color: #e61982;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      animation: badge-fade-in 160ms ease-out;
    }
    .adjusting-badge .spinner {
      width: 12px; height: 12px; border: 2px solid rgba(230, 25, 130, 0.25);
      border-top-color: #e61982; border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes badge-fade-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class AiLivePreviewComponent implements OnChanges {
  @Input() previewType: LivePreviewType = 'plan';
  @Input() data: any = null;
  @Input() status: LivePreviewStatus = 'building';

  /** Dernière version VALIDE du data, conservée pour éviter un flash vide lors des patches cassés. */
  displayData: any = null;
  adjusting = false;

  ngOnChanges(changes: SimpleChanges) {
    if ('data' in changes || 'status' in changes) {
      const incoming = this.data;
      const valid = this.validateData(this.previewType, incoming);
      if (valid) {
        this.displayData = incoming;
        this.adjusting = false;
      } else if (this.displayData) {
        // patch invalide ou incomplet → on garde l'ancien rendu et on affiche un petit badge
        this.adjusting = true;
      } else {
        // aucun displayData encore → affiche ce qu'on a (premier render)
        this.displayData = incoming;
        this.adjusting = false;
      }
      if (this.status === 'success') this.adjusting = false;
    }
  }

  structuredData(): any {
    const d = this.displayData || {};
    return { layout: d.layout, title: d.title, data: d.data || {} };
  }

  private validateData(type: LivePreviewType, d: any): boolean {
    if (!d || typeof d !== 'object') return false;
    switch (type) {
      case 'structured': {
        if (!d.layout || !d.data || typeof d.data !== 'object') return false;
        const dd = d.data;
        switch (d.layout) {
          case 'chips_tabs':       return Array.isArray(dd.chips) && dd.chips.length > 0 && Array.isArray(dd.tabs) && dd.tabs.length > 0;
          case 'stepped_plan':     return Array.isArray(dd.steps) && dd.steps.length > 0;
          case 'comparison_table': return Array.isArray(dd.columns) && dd.columns.length > 0 && Array.isArray(dd.rows) && dd.rows.length > 0;
          case 'accordion':        return Array.isArray(dd.sections) && dd.sections.length > 0;
          case 'timeline':         return Array.isArray(dd.events) && dd.events.length > 0;
          case 'card_grid':        return Array.isArray(dd.cards) && dd.cards.length > 0;
          default:                 return false;
        }
      }
      case 'diagram':  return typeof d.mermaid === 'string' && d.mermaid.trim().length > 10;
      case 'plan':     return Array.isArray(d.steps) && d.steps.length > 0;
      case 'document': return !!d.format || !!d.title;
      case 'research': return Array.isArray(d.steps) && d.steps.length > 0;
      case 'subagent': return !!d.subagent_type || !!d.prompt;
      case 'download': return !!d.url || !!d.fileId;
      case 'code':     return typeof d.code === 'string' || Array.isArray(d.stdoutLines);
      default: return false;
    }
  }
}
