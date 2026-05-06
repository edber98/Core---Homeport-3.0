import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiStructuredMessageComponent } from '../structured/ai-structured-message.component';
import { AiDiagramRendererComponent } from '../diagram/ai-diagram-renderer.component';
import { AiPlanProposalCardComponent } from '../plan/ai-plan-proposal-card.component';
import { AiInlineImageComponent } from '../images/ai-inline-image.component';
import { AiWidgetActionsComponent, WidgetAction, WidgetActionId } from './ai-widget-actions.component';
import { WidgetExportService } from './widget-export.service';
import { AiStructuredPayload, AiDiagramPayload, AiPlanProposal, AiInlineImagePayload } from '../ai.service';

export type WidgetType = 'structured' | 'diagram' | 'plan_proposal' | 'image_inline';

export interface WidgetModalData {
  widgetType: WidgetType;
  widgetData: any;
  title?: string;
}

/**
 * Fullscreen modal for any AI widget, with consistent action toolbar.
 */
@Component({
  selector: 'ai-widget-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzIconModule,
    NzButtonModule,
    AiStructuredMessageComponent,
    AiDiagramRendererComponent,
    AiPlanProposalCardComponent,
    AiInlineImageComponent,
    AiWidgetActionsComponent,
  ],
  template: `
    <div class="widget-modal">
      <div class="wm-header">
        <div class="wm-title">
          <span nz-icon [nzType]="iconFor(data.widgetType)" nzTheme="outline"></span>
          <span>{{ data.title || titleFor(data.widgetType) }}</span>
        </div>
        <div class="wm-actions">
          <ai-widget-actions [actions]="actions()" (action)="onAction($event)"></ai-widget-actions>
          <button nz-button nzType="text" nzSize="small" (click)="close()">
            <span nz-icon nzType="close" nzTheme="outline"></span>
          </button>
        </div>
      </div>
      <div class="wm-body" #bodyRef>
        <ng-container [ngSwitch]="data.widgetType">
          <ai-structured-message *ngSwitchCase="'structured'" [data]="data.widgetData"></ai-structured-message>
          <ai-diagram-renderer
            *ngSwitchCase="'diagram'"
            [mermaid]="data.widgetData?.mermaid || ''"
            [title]="data.widgetData?.title || ''"
            [interactive]="true">
          </ai-diagram-renderer>
          <ai-plan-proposal-card *ngSwitchCase="'plan_proposal'" [proposal]="data.widgetData"></ai-plan-proposal-card>
          <ai-inline-image *ngSwitchCase="'image_inline'" [data]="data.widgetData"></ai-inline-image>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .widget-modal { display: flex; flex-direction: column; max-height: 85vh; min-height: 300px; }
    .wm-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 4px 12px; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px;
    }
    .wm-title {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 600; color: #262626;
    }
    .wm-title span[nz-icon] { color: #e61982; }
    .wm-actions { display: inline-flex; align-items: center; gap: 4px; }
    .wm-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 4px;
    }
    .wm-body ::ng-deep .structured { max-width: 100%; }
    .wm-body ::ng-deep .diagram-wrap { max-width: 100%; }
  `],
})
export class AiWidgetModalComponent {
  private modalRef = inject(NzModalRef, { optional: true });
  private msg = inject(NzMessageService);
  private exp = inject(WidgetExportService);
  data: WidgetModalData = inject(NZ_MODAL_DATA);

  actions(): WidgetAction[] {
    const common: WidgetAction[] = [{ id: 'copy', label: 'Copier les données', icon: 'copy' }];
    switch (this.data.widgetType) {
      case 'structured':
        return [
          ...common,
          { id: 'export:json', label: 'Télécharger JSON', icon: 'code' },
          { id: 'export:csv', label: 'Télécharger CSV', icon: 'file-text' },
          { id: 'export:xlsx', label: 'Télécharger Excel (XLSX)', icon: 'file-excel' },
          { id: 'export:pdf', label: 'Télécharger PDF', icon: 'file-pdf' },
        ];
      case 'diagram':
        return [
          ...common,
          { id: 'export:svg', label: 'Télécharger SVG', icon: 'file-image' },
          { id: 'export:png', label: 'Télécharger PNG', icon: 'picture' },
          { id: 'export:pdf', label: 'Télécharger PDF', icon: 'file-pdf' },
        ];
      case 'plan_proposal':
        return [
          ...common,
          { id: 'export:json', label: 'Télécharger JSON', icon: 'code' },
          { id: 'export:pdf', label: 'Télécharger PDF', icon: 'file-pdf' },
        ];
      case 'image_inline':
        return [
          { id: 'export:png', label: 'Télécharger', icon: 'download' },
          { id: 'copy', label: "Copier l'URL", icon: 'link' },
        ];
    }
    return common;
  }

  iconFor(t: WidgetType): string {
    return ({
      structured: 'appstore',
      diagram: 'deployment-unit',
      plan_proposal: 'ordered-list',
      image_inline: 'picture',
    } as Record<WidgetType, string>)[t] || 'appstore';
  }

  titleFor(t: WidgetType): string {
    return ({
      structured: 'Vue structurée',
      diagram: 'Diagramme',
      plan_proposal: "Plan d'action",
      image_inline: 'Image',
    } as Record<WidgetType, string>)[t] || 'Widget';
  }

  close() { this.modalRef?.close(); }

  async onAction(id: WidgetActionId) {
    const d = this.data;
    const name = this.filenameBase();
    try {
      switch (id) {
        case 'fullscreen': return; // already fullscreen
        case 'copy': {
          const text = JSON.stringify(d.widgetData, null, 2);
          const ok = await this.exp.copyText(text);
          this.msg[ok ? 'success' : 'error'](ok ? 'Copié' : 'Copie impossible');
          return;
        }
        case 'export:json':
          this.exp.exportAsJson(d.widgetData, name);
          this.msg.success('JSON exporté');
          return;
        case 'export:csv': {
          const { rows, cols } = this.extractTableData();
          if (!rows.length) { this.msg.warning('Aucune ligne exportable'); return; }
          this.exp.exportAsCsv(rows, cols, name);
          this.msg.success('CSV exporté');
          return;
        }
        case 'export:xlsx': {
          const { rows, cols } = this.extractTableData();
          if (!rows.length) { this.msg.warning('Aucune ligne exportable'); return; }
          await this.exp.exportAsXlsx(rows, cols, name);
          this.msg.success('XLSX exporté');
          return;
        }
        case 'export:svg': {
          const svg = this.findSvg();
          if (!svg) { this.msg.warning('SVG introuvable'); return; }
          this.exp.exportAsSvg(svg, name);
          this.msg.success('SVG exporté');
          return;
        }
        case 'export:png': {
          if (d.widgetType === 'image_inline') {
            const src: string = (d.widgetData?.url) || '';
            if (src) { window.open(src, '_blank'); return; }
          }
          const svg = this.findSvg();
          if (svg) {
            await this.exp.exportAsPng(svg, name);
          } else {
            const body = this.findBody();
            if (body) await this.exp.exportAsPng(body, name);
            else { this.msg.warning('Contenu non exportable'); return; }
          }
          this.msg.success('PNG exporté');
          return;
        }
        case 'export:pdf': {
          const body = this.findBody();
          if (!body) { this.msg.warning('Contenu non exportable'); return; }
          this.msg.loading('Génération PDF…', { nzDuration: 800 });
          await this.exp.exportAsPdf(body, name);
          this.msg.success('PDF exporté');
          return;
        }
      }
    } catch (e: any) {
      this.msg.error('Export échoué: ' + (e?.message || 'erreur inconnue'));
    }
  }

  private filenameBase(): string {
    const t = this.data.title || this.data.widgetData?.title || this.titleFor(this.data.widgetType);
    return String(t).slice(0, 60) || this.data.widgetType;
  }

  private findBody(): HTMLElement | null {
    // Find the widget body inside the modal DOM
    const host = (document.querySelector('.widget-modal .wm-body') as HTMLElement) || null;
    return host;
  }

  private findSvg(): SVGElement | null {
    const host = this.findBody();
    return (host?.querySelector('svg') as SVGElement) || null;
  }

  /** Extract table-like rows/cols from structured/plan_proposal data. */
  private extractTableData(): { rows: any[]; cols: { key: string; label?: string }[] } {
    const d = this.data;
    const wd = d.widgetData;
    if (d.widgetType === 'structured') {
      const layout = wd?.layout;
      const data = wd?.data;
      if (layout === 'comparison_table' && data?.columns && data?.rows) {
        const cols = (data.columns || []).map((c: any) => ({
          key: c.key || c.id || c.label,
          label: c.label || c.key || c.id,
        }));
        return { rows: data.rows, cols };
      }
      // Attempt fallback: any data with rows[]
      if (Array.isArray(data?.rows)) return { rows: data.rows, cols: [] };
      if (Array.isArray(data?.items)) return { rows: data.items, cols: [] };
      if (Array.isArray(data)) return { rows: data, cols: [] };
    }
    if (d.widgetType === 'plan_proposal') {
      const steps = (wd?.steps || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        rationale: s.rationale || '',
        tools: (s.tools || []).join(', '),
        duration_estimate: s.duration_estimate || '',
        dependsOn: (s.dependsOn || []).join(', '),
      }));
      return {
        rows: steps,
        cols: [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Titre' },
          { key: 'rationale', label: 'Raison' },
          { key: 'tools', label: 'Outils' },
          { key: 'duration_estimate', label: 'Durée' },
          { key: 'dependsOn', label: 'Dépend de' },
        ],
      };
    }
    return { rows: [], cols: [] };
  }
}
