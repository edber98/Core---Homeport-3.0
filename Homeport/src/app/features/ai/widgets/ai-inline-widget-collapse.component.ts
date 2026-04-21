import { Component, Input, ChangeDetectionStrategy, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiMessage } from '../ai.service';
import { AiStructuredMessageComponent } from '../structured/ai-structured-message.component';
import { AiCanvasHtmlComponent } from '../canvas-html/ai-canvas-html.component';
import { AiDiagramRendererComponent } from '../diagram/ai-diagram-renderer.component';
import { AiInlineImageComponent } from '../images/ai-inline-image.component';
import { AiInlineFileComponent } from '../files/ai-inline-file.component';

/**
 * Wrap n'importe quel widget (structured, canvas_html, diagram, image, file)
 * dans un collapse ouvrable. L'état initial vient de metadata.collapse.collapsed
 * (choix du LLM). L'utilisateur peut ouvrir/fermer à volonté.
 */
@Component({
  selector: 'ai-inline-widget-collapse',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzIconModule,
    AiStructuredMessageComponent,
    AiCanvasHtmlComponent,
    AiDiagramRendererComponent,
    AiInlineImageComponent,
    AiInlineFileComponent,
  ],
  template: `
    <div class="inline-widget" [class.is-open]="isOpen()" *ngIf="widget">
      <button type="button" class="header" (click)="toggle()">
        <span class="chevron">
          <span nz-icon [nzType]="isOpen() ? 'down' : 'right'" nzTheme="outline"></span>
        </span>
        <span class="kind-badge">{{ kindLabel() }}</span>
        <span class="title">{{ headerTitle() }}</span>
      </button>

      <div class="body" *ngIf="isOpen()" [ngSwitch]="widget.metadata?.kind">
        <ai-structured-message
          *ngSwitchCase="'structured'"
          [data]="widget.metadata?.structured!">
        </ai-structured-message>

        <ai-canvas-html
          *ngSwitchCase="'canvas_html'"
          [data]="widget.metadata?.canvasHtml!">
        </ai-canvas-html>

        <ai-diagram-renderer
          *ngSwitchCase="'diagram'"
          [mermaid]="widget.metadata?.diagram?.mermaid || ''"
          [title]="widget.metadata?.diagram?.title || ''">
        </ai-diagram-renderer>

        <ai-inline-image
          *ngSwitchCase="'image_inline'"
          [data]="widget.metadata?.imageInline!">
        </ai-inline-image>

        <ai-inline-file
          *ngSwitchCase="'file_inline'"
          [data]="widget.metadata?.fileInline!">
        </ai-inline-file>

        <div *ngSwitchDefault class="fallback">
          Widget type inconnu : {{ widget.metadata?.kind }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 85%;
      min-width: 0;
    }
    .inline-widget {
      margin: 10px 0;
      border: 1px solid #e8e8e8;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
      max-width: 100%;
    }
    .inline-widget.is-open { border-color: #e8e8e8; }
    .header {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 10px 14px;
      background: #fafafa; border: 0; cursor: pointer;
      text-align: left; font: inherit;
      transition: background 0.15s ease;
    }
    .header:hover { background: #f0f0f0; }
    .is-open .header { background: #fdf2f8; border-bottom: 1px solid #f5f5f5; }
    .chevron { color: #8c8c8c; font-size: 11px; flex-shrink: 0; }
    .is-open .chevron { color: #e61982; }
    .kind-badge {
      font-size: 10px; font-weight: 600;
      padding: 2px 8px; border-radius: 10px;
      background: #f0f0f0; color: #595959;
      text-transform: uppercase; letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    .is-open .kind-badge { background: #fce7f3; color: #e61982; }
    .title {
      font-size: 13px; font-weight: 500; color: #262626;
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .body { padding: 12px 14px; }
    .fallback {
      padding: 8px; color: #ff4d4f; font-size: 12px;
      background: #fff2f0; border-radius: 6px;
    }
  `],
})
export class AiInlineWidgetCollapseComponent implements OnChanges {
  @Input() widget!: AiMessage;

  isOpen = signal(true);

  ngOnChanges(): void {
    const collapsed = this.widget?.metadata?.['collapse']?.collapsed === true;
    this.isOpen.set(!collapsed);
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  kindLabel(): string {
    const k = this.widget?.metadata?.kind;
    switch (k) {
      case 'structured': return 'Tableau';
      case 'canvas_html': return 'Canvas';
      case 'diagram': return 'Diagramme';
      case 'image_inline': return 'Image';
      case 'file_inline': return 'Fichier';
      default: return 'Widget';
    }
  }

  headerTitle(): string {
    const md = this.widget?.metadata;
    const custom = md?.['collapse']?.collapseTitle;
    if (custom) return String(custom);
    if (md?.kind === 'structured') return md.structured?.title || 'Contenu structuré';
    if (md?.kind === 'canvas_html') return md.canvasHtml?.title || 'Canvas interactif';
    if (md?.kind === 'diagram') return md.diagram?.title || 'Diagramme';
    if (md?.kind === 'image_inline') return md.imageInline?.caption || md.imageInline?.alt || 'Image';
    if (md?.kind === 'file_inline') return md.fileInline?.caption || md.fileInline?.name || 'Fichier';
    return this.widget?.content || 'Widget';
  }
}
