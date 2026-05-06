import { ChangeDetectorRef, Component, Input, NgZone, OnInit, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { AiService } from '../ai.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import { AiDiagramRendererComponent } from '../diagram/ai-diagram-renderer.component';

@Component({
  selector: 'ai-canvas-document',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSegmentedModule, NzEmptyModule, AiDiagramRendererComponent],
  template: `
    <div class="doc-wrap" *ngIf="doc(); else empty">
      <div class="doc-toolbar">
        <div class="doc-title">
          <span nz-icon nzType="file-text" nzTheme="outline"></span>
          <span>{{ doc()?.title || 'Document' }}</span>
          <span class="doc-format" *ngIf="doc()?.format">{{ doc()?.format?.toUpperCase() }}</span>
        </div>
        <div class="doc-actions">
          <nz-segmented [nzOptions]="viewOptions" [(ngModel)]="viewMode"></nz-segmented>
          <button nz-button nzSize="small" *ngIf="doc()?.fileId" (click)="download()">
            <span nz-icon nzType="download" nzTheme="outline"></span> Télécharger
          </button>
        </div>
      </div>

      <div class="doc-body">
        <div class="preview-pane" *ngIf="viewMode === 'preview'">
          <ai-diagram-renderer
            *ngIf="isMermaid(); else htmlPreview"
            [mermaid]="doc()?.rawMermaid || ''"
            [title]="doc()?.title || ''"
            [interactive]="true">
          </ai-diagram-renderer>
          <ng-template #htmlPreview>
            <div class="preview-html" [innerHTML]="safeHtml()"></div>
          </ng-template>
        </div>
        <pre class="code-pane" *ngIf="viewMode === 'code'">{{ codeSource() }}</pre>
      </div>
    </div>
    <ng-template #empty>
      <div class="doc-empty">
        <nz-empty nzNotFoundContent="Aucun document en cours"></nz-empty>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .doc-wrap { display: flex; flex-direction: column; height: 100%; }
    .doc-toolbar { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
    .doc-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: #333; flex: 1; min-width: 0; }
    .doc-title span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-format { font-size: 10px; background: #e6f4ff; color: #1677ff; padding: 1px 6px; border-radius: 3px; font-weight: 500; }
    .doc-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .doc-body { flex: 1; overflow: auto; background: #fff; }
    .preview-pane { padding: 16px 20px; }
    .preview-html { max-width: 820px; margin: 0 auto; font-size: 14px; line-height: 1.6; color: #262626; }
    .preview-html ::ng-deep h1 { font-size: 22px; margin: 16px 0 8px; }
    .preview-html ::ng-deep h2 { font-size: 18px; margin: 14px 0 6px; }
    .preview-html ::ng-deep h3 { font-size: 15px; margin: 10px 0 4px; }
    .preview-html ::ng-deep p { margin: 0 0 8px; }
    .preview-html ::ng-deep table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    .preview-html ::ng-deep th, .preview-html ::ng-deep td { border: 1px solid #e8e8e8; padding: 4px 8px; }
    .preview-html ::ng-deep th { background: #fafafa; }
    .code-pane { padding: 16px; font-size: 12px; color: #555; white-space: pre-wrap; word-break: break-word; margin: 0; }
    .doc-empty { display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px; }
  `],
})
export class AiCanvasDocumentComponent implements OnInit {
  @Input() threadId!: string;
  public ai = inject(AiService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  viewMode: 'preview' | 'code' = 'preview';
  viewOptions = [
    { label: 'Aperçu', value: 'preview', icon: 'eye' },
    { label: 'Code', value: 'code', icon: 'code' },
  ];

  doc = computed(() => this.ai.canvasState()?.document);

  constructor() {
    effect(() => {
      this.ai.canvasState()?.document;
      this.zone.run(() => this.cdr.markForCheck());
    });
  }

  ngOnInit() {
    if (this.threadId) this.ai.loadCanvas(this.threadId);
  }

  safeHtml(): SafeHtml {
    const raw = this.doc()?.previewHtml || '';
    try {
      const clean = DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: ['div', 'p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr', 'img', 'section', 'article', 'figure', 'figcaption'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'style', 'width', 'height'],
      });
      return this.sanitizer.bypassSecurityTrustHtml(clean);
    } catch {
      return raw;
    }
  }

  download() {
    const fileId = this.doc()?.fileId;
    if (!fileId) return;
    window.open(this.ai.fileUrl(fileId), '_blank');
  }

  isMermaid(): boolean {
    const d = this.doc();
    return !!(d && (d.format === 'mermaid' || d.rawMermaid));
  }

  codeSource(): string {
    const d = this.doc();
    if (!d) return '';
    return d.rawMermaid || d.previewHtml || '';
  }
}
