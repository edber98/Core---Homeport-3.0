import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

export interface CanvasHtmlData {
  html: string;
  title?: string | null;
  description?: string | null;
  height?: number;
  type?: '2d' | '3d' | 'animation' | 'demo';
}

/**
 * Rendu d'un canvas HTML interactif inline dans le chat. Le HTML est isolé dans
 * un iframe sandboxé (allow-scripts uniquement, pas d'accès parent ni cookies).
 * Support streaming partiel : on peut passer un html incomplet pendant la
 * génération (tool_input_delta), le reload se fait à chaque change.
 */
@Component({
  selector: 'ai-canvas-html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, NzToolTipModule],
  template: `
    <div class="ch-wrap" [class.fullscreen]="fullscreen">
      <div class="ch-head">
        <span class="ch-icon" [title]="data.type || 'demo'">{{ iconFor(data.type) }}</span>
        <span class="ch-title" *ngIf="data.title">{{ data.title }}</span>
        <nz-tag nzColor="geekblue" class="ch-type-tag" *ngIf="data.type">{{ data.type }}</nz-tag>
        <span class="ch-building" *ngIf="streaming">
          <span nz-icon nzType="loading" nzTheme="outline"></span>
          en construction…
        </span>
        <span class="ch-spacer"></span>
        <button nz-button nzType="text" nzSize="small" class="ch-btn" (click)="reload()"
                nz-tooltip nzTooltipTitle="Relancer l'animation">
          <span nz-icon nzType="reload" nzTheme="outline"></span>
        </button>
        <button nz-button nzType="text" nzSize="small" class="ch-btn" (click)="copyHtml()"
                nz-tooltip [nzTooltipTitle]="copied ? 'Copié' : 'Copier le HTML'">
          <span nz-icon [nzType]="copied ? 'check' : 'copy'" nzTheme="outline"></span>
        </button>
        <button nz-button nzType="text" nzSize="small" class="ch-btn" (click)="openInNewTab()"
                nz-tooltip nzTooltipTitle="Ouvrir dans un nouvel onglet">
          <span nz-icon nzType="export" nzTheme="outline"></span>
        </button>
        <button nz-button nzType="text" nzSize="small" class="ch-btn" (click)="toggleFullscreen()"
                nz-tooltip [nzTooltipTitle]="fullscreen ? 'Quitter plein écran' : 'Plein écran'">
          <span nz-icon [nzType]="fullscreen ? 'fullscreen-exit' : 'fullscreen'" nzTheme="outline"></span>
        </button>
      </div>
      <div class="ch-description" *ngIf="data.description">{{ data.description }}</div>
      <div class="ch-body" [style.height.px]="fullscreen ? null : (data.height || 420)">
        <iframe
          #frame
          class="ch-iframe"
          sandbox="allow-scripts"
          referrerpolicy="no-referrer"
          title="Canvas interactif"></iframe>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ch-wrap { background: #fff; border: 1px solid #f0f0f0; border-left: 3px solid #1677ff; border-radius: 0 10px 10px 0; overflow: hidden; display: flex; flex-direction: column; }
    .ch-wrap.fullscreen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; border-radius: 0; border: none; background: #0b0d12; }
    .ch-wrap.fullscreen .ch-body { height: calc(100vh - 48px) !important; flex: 1; }
    .ch-wrap.fullscreen .ch-head { background: #0b0d12; color: #fff; border-bottom-color: #222; }
    .ch-wrap.fullscreen .ch-title { color: #fff; }
    .ch-wrap.fullscreen .ch-btn { color: #bbb; }
    .ch-head { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
    .ch-icon { font-size: 16px; }
    .ch-title { font-weight: 600; font-size: 13px; color: #262626; max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ch-type-tag { margin: 0; font-size: 10px; text-transform: uppercase; }
    .ch-building { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #1677ff; background: rgba(22,119,255,0.08); padding: 2px 8px; border-radius: 10px; }
    .ch-spacer { flex: 1; }
    .ch-btn { color: #666; padding: 0 6px; height: 26px; min-width: 26px; }
    .ch-btn:hover { color: #1677ff; background: rgba(22,119,255,0.08); }
    .ch-description { padding: 6px 12px; font-size: 12px; color: #595959; background: #fafafa; border-bottom: 1px solid #f0f0f0; font-style: italic; }
    .ch-body { position: relative; background: #fff; overflow: hidden; }
    .ch-iframe { width: 100%; height: 100%; border: none; background: #fff; display: block; }
  `],
})
export class AiCanvasHtmlComponent implements OnChanges, AfterViewInit {
  @Input() data!: CanvasHtmlData;
  /** Si true : indique que le HTML est en cours de streaming (on repaint à chaque update). */
  @Input() streaming = false;

  @ViewChild('frame', { static: true }) frame!: ElementRef<HTMLIFrameElement>;
  private nzMsg = inject(NzMessageService);

  fullscreen = false;
  copied = false;

  ngOnChanges(_changes: SimpleChanges): void { this.applyHtml(); }
  ngAfterViewInit(): void { this.applyHtml(); }

  /**
   * Injecte un préambule CSS reset dans le <head> du HTML : supprime la marge
   * par défaut du body (qui cause une scrollbar même pour du contenu qui tient
   * pile dans l'iframe) + stylise la scrollbar pour qu'elle soit discrète
   * QUAND elle apparaît réellement (contenu > viewport). L'auto-scroll reste
   * fonctionnel quand nécessaire.
   */
  private injectPreamble(html: string): string {
    if (!html) return html;
    const preamble = `<style id="__hp_preamble__">
      html,body{margin:0;padding:0}
      html,body{box-sizing:border-box}
      *,*::before,*::after{box-sizing:inherit}
      /* Scrollbar fine et discrète (WebKit + Firefox) */
      *{scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.18) transparent}
      *::-webkit-scrollbar{width:8px;height:8px}
      *::-webkit-scrollbar-track{background:transparent}
      *::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px}
      *::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.3)}
      /* Image/media responsive par défaut */
      img,video,canvas,svg{max-width:100%;height:auto}
    </style>`;
    // Insère juste après <head> (ou avant </head> si head existe)
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${preamble}`);
    }
    if (/<html[^>]*>/i.test(html)) {
      return html.replace(/<html([^>]*)>/i, `<html$1><head>${preamble}</head>`);
    }
    return preamble + html;
  }

  private _applyScheduled = false;
  private applyHtml() {
    if (this._applyScheduled) return;
    this._applyScheduled = true;
    const run = () => {
      this._applyScheduled = false;
      const iframe = this.frame?.nativeElement;
      if (!iframe) return;
      const rect = iframe.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) {
        requestAnimationFrame(() => this.applyHtml());
        return;
      }
      const rawHtml = this.data?.html
        || '<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100%;color:#bbb;font-family:sans-serif">(aucun contenu)</body></html>';
      const html = this.injectPreamble(rawHtml);
      try { iframe.setAttribute('srcdoc', html); } catch {}
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  iconFor(t?: string): string {
    switch (t) {
      case '3d': return '🧊';
      case '2d': return '🎨';
      case 'animation': return '✨';
      case 'demo': return '🧪';
      default: return '🧪';
    }
  }

  reload() {
    // Force un re-render en vidant puis réappliquant srcdoc.
    try {
      const iframe = this.frame?.nativeElement;
      if (iframe) {
        iframe.setAttribute('srcdoc', '<!DOCTYPE html><html><body></body></html>');
        requestAnimationFrame(() => this.applyHtml());
      }
    } catch {}
  }

  copyHtml() {
    try {
      navigator.clipboard.writeText(this.data?.html || '');
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 1500);
    } catch { this.nzMsg.error('Copie échouée'); }
  }

  openInNewTab() {
    try {
      const blob = new Blob([this.data?.html || ''], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { this.nzMsg.error('Ouverture impossible'); }
  }

  toggleFullscreen() { this.fullscreen = !this.fullscreen; }
}
