import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { UiNode } from '../ui-model.service';
import { UiHtmlIoService } from '../services/ui-html-io.service';

@Component({
  selector: 'ui-preview-iframe-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <iframe #frame class="preview-frame" [style.width.px]="width || null" style="border:0; display:block; width:100%;"></iframe>
  `,
  styles: [`
    :host { display:block; }
    .preview-frame { width: 100%; border: 0; background: transparent; }
  `]
})
export class UiPreviewIframeHostComponent implements OnChanges {
  @Input() root!: UiNode;
  @Input() bp: 'auto'|'xs'|'sm'|'md'|'lg'|'xl' = 'auto';
  @Input() state: 'base'|'hover'|'active'|'focus' = 'base';
  @Input() version: number | null = null;
  @Input() width: number | null = null; // simulated viewport width in px

  @ViewChild('frame', { static: true }) frame!: ElementRef<HTMLIFrameElement>;

  constructor(private html: UiHtmlIoService) {}

  ngOnChanges(): void {
    try { this.renderIntoIframe(); } catch { /* noop */ }
  }

  private renderIntoIframe() {
    const doc = this.frame?.nativeElement?.contentDocument || this.frame?.nativeElement?.contentWindow?.document;
    if (!doc) return;
    const html = this.html.exportHtml(this.root);
    doc.open();
    doc.write(html);
    doc.close();
    // Auto-adjust height after content paints
    setTimeout(() => {
      try {
        const b = doc.body as any;
        const h = Math.max(b.scrollHeight || 0, b.offsetHeight || 0, b.clientHeight || 0);
        this.frame.nativeElement.style.height = (h || 0) + 'px';
      } catch {}
    }, 0);
  }
}

